from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.audit import log_audit_event
from app.core.config import settings
from app.core.security import get_current_admin
from app.core.tenancy import get_tenant_context, require_tenant_context
from app.db.session import platform_execute, platform_fetch_one

billing_router = APIRouter(prefix="/t/{tenant_slug}/admin/billing", tags=["billing"])
stripe_webhook_router = APIRouter(prefix="/billing", tags=["billing"])


def _stripe_ts(value):
    if not value:
        return None
    return datetime.fromtimestamp(int(value), tz=timezone.utc)


@billing_router.post(
    "/checkout",
    dependencies=[Depends(require_tenant_context)],
)
async def create_checkout_session(current=Depends(get_current_admin)):
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_PRICE_PRO:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    tenant = get_tenant_context()
    try:
        import stripe
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Stripe package is not installed") from exc

    stripe.api_key = settings.STRIPE_SECRET_KEY
    customer = await platform_fetch_one(
        "SELECT stripe_customer_id FROM public.payment_customer WHERE tenant_id = :tenant_id",
        {"tenant_id": tenant.id},
    )
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer["stripe_customer_id"] if customer else None,
        customer_email=current["email"] if not customer else None,
        line_items=[{"price": settings.STRIPE_PRICE_PRO, "quantity": 1}],
        success_url=f"{settings.APP_PUBLIC_BASE_URL.rstrip('/')}/d/{tenant.slug}/admin?billing=success",
        cancel_url=f"{settings.APP_PUBLIC_BASE_URL.rstrip('/')}/d/{tenant.slug}/admin?billing=cancel",
        client_reference_id=tenant.id,
        metadata={"tenant_id": tenant.id, "tenant_slug": tenant.slug},
    )
    await log_audit_event(
        action="billing.checkout_created",
        actor_user_id=current["id"],
        tenant_id=tenant.id,
        metadata={"stripe_session_id": session.id},
    )
    return {"url": session.url}


@billing_router.post(
    "/portal",
    dependencies=[Depends(require_tenant_context)],
)
async def create_customer_portal(current=Depends(get_current_admin)):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    tenant = get_tenant_context()
    customer = await platform_fetch_one(
        "SELECT stripe_customer_id FROM public.payment_customer WHERE tenant_id = :tenant_id",
        {"tenant_id": tenant.id},
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Stripe customer not found")
    try:
        import stripe
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Stripe package is not installed") from exc

    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.billing_portal.Session.create(
        customer=customer["stripe_customer_id"],
        return_url=settings.STRIPE_CUSTOMER_PORTAL_RETURN_URL,
    )
    await log_audit_event(
        action="billing.portal_created",
        actor_user_id=current["id"],
        tenant_id=tenant.id,
    )
    return {"url": session.url}


@stripe_webhook_router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="stripe-signature"),
):
    body = await request.body()
    try:
        import stripe
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Stripe package is not installed") from exc

    if settings.STRIPE_WEBHOOK_SECRET:
        if not stripe_signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        try:
            event = stripe.Webhook.construct_event(
                body,
                stripe_signature,
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid Stripe signature") from exc
    elif settings.IS_PRODUCTION:
        raise HTTPException(status_code=503, detail="Stripe webhook secret is not configured")
    else:
        event = json.loads(body.decode("utf-8"))

    event_id = event["id"]
    event_type = event["type"]
    existing = await platform_fetch_one(
        "SELECT id FROM public.billing_event WHERE provider_event_id = :event_id",
        {"event_id": event_id},
    )
    if existing:
        return {"received": True, "duplicate": True}

    data_object = event.get("data", {}).get("object", {})
    tenant_id = data_object.get("metadata", {}).get("tenant_id") or data_object.get("client_reference_id")
    stripe_customer_id = data_object.get("customer")

    if not tenant_id and stripe_customer_id:
        customer = await platform_fetch_one(
            "SELECT tenant_id FROM public.payment_customer WHERE stripe_customer_id = :stripe_customer_id",
            {"stripe_customer_id": stripe_customer_id},
        )
        tenant_id = str(customer["tenant_id"]) if customer else None

    if tenant_id and stripe_customer_id:
        await platform_execute(
            """
            INSERT INTO public.payment_customer (tenant_id, stripe_customer_id)
            VALUES (:tenant_id, :stripe_customer_id)
            ON CONFLICT (tenant_id) DO UPDATE SET
              stripe_customer_id = EXCLUDED.stripe_customer_id,
              updated_at = now()
            """,
            {"tenant_id": tenant_id, "stripe_customer_id": stripe_customer_id},
        )

    if event_type in {"checkout.session.completed", "customer.subscription.updated", "customer.subscription.created"} and tenant_id:
        subscription_id = data_object.get("subscription") or data_object.get("id")
        status = data_object.get("status", "active")
        current_period_end = _stripe_ts(data_object.get("current_period_end"))
        cancel_at_period_end = bool(data_object.get("cancel_at_period_end", False))
        plan_code = "pro" if status in {"active", "trialing"} else "free"
        await platform_execute(
            "UPDATE public.tenant SET plan_code = :plan_code WHERE id = :tenant_id",
            {"tenant_id": tenant_id, "plan_code": plan_code},
        )
        if subscription_id:
            await platform_execute(
                """
                INSERT INTO public.subscription (
                  tenant_id, provider_subscription_id, status, plan_code,
                  current_period_end, cancel_at_period_end
                )
                VALUES (
                  :tenant_id, :provider_subscription_id, :status, :plan_code,
                  :current_period_end, :cancel_at_period_end
                )
                ON CONFLICT (provider_subscription_id) DO UPDATE SET
                  status = EXCLUDED.status,
                  plan_code = EXCLUDED.plan_code,
                  current_period_end = EXCLUDED.current_period_end,
                  cancel_at_period_end = EXCLUDED.cancel_at_period_end,
                  updated_at = now()
                """,
                {
                    "tenant_id": tenant_id,
                    "provider_subscription_id": subscription_id,
                    "status": status,
                    "plan_code": plan_code,
                    "current_period_end": current_period_end,
                    "cancel_at_period_end": cancel_at_period_end,
                },
            )

    if event_type == "customer.subscription.deleted" and tenant_id:
        await platform_execute(
            "UPDATE public.tenant SET plan_code = 'free' WHERE id = :tenant_id",
            {"tenant_id": tenant_id},
        )
        subscription_id = data_object.get("id")
        if subscription_id:
            await platform_execute(
                """
                UPDATE public.subscription
                SET status = 'canceled', plan_code = 'free', updated_at = now()
                WHERE provider_subscription_id = :provider_subscription_id
                """,
                {"provider_subscription_id": subscription_id},
            )

    if event_type == "invoice.payment_failed" and tenant_id:
        subscription_id = data_object.get("subscription")
        if subscription_id:
            await platform_execute(
                """
                UPDATE public.subscription
                SET status = 'past_due', updated_at = now()
                WHERE provider_subscription_id = :provider_subscription_id
                """,
                {"provider_subscription_id": subscription_id},
            )

    await platform_execute(
        """
        INSERT INTO public.billing_event (
          provider_event_id, event_type, tenant_id, payload
        )
        VALUES (:provider_event_id, :event_type, :tenant_id, CAST(:payload AS jsonb))
        """,
        {
            "provider_event_id": event_id,
            "event_type": event_type,
            "tenant_id": tenant_id,
            "payload": json.dumps(event, default=str),
        },
    )
    await log_audit_event(
        action="billing.event_processed",
        tenant_id=tenant_id,
        target_type="stripe_event",
        target_id=event_id,
        metadata={"event_type": event_type},
    )
    return {"received": True}
