from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from datetime import datetime
from typing import Mapping

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from app.core.audit import log_audit_event
from app.core.config import settings
from app.core.observability import get_logger
from app.core.security import get_current_admin
from app.core.tenancy import get_tenant_context, require_tenant_context
from app.db.session import platform_execute, platform_fetch_one

billing_router = APIRouter(prefix="/t/{tenant_slug}/admin/billing", tags=["billing"])
iyzico_webhook_router = APIRouter(prefix="/billing", tags=["billing"])

IYZICO_PRO_STATUSES = {"ACTIVE", "UPGRADED", "TRIAL", "TRIALING"}
logger = get_logger()


def ensure_billing_enabled() -> None:
    if not settings.BILLING_ENABLED:
        raise HTTPException(status_code=404, detail="Billing is disabled")


def _iyzico_options() -> dict:
    return {
        "api_key": settings.IYZICO_API_KEY,
        "secret_key": settings.IYZICO_SECRET_KEY,
        "base_url": settings.IYZICO_BASE_URL,
    }


def _subscription_plan_for_status(status: str) -> str:
    return "pro" if status.upper() in IYZICO_PRO_STATUSES else "free"


def _iyzico_event_type(event: Mapping[str, object]) -> str:
    return str(event.get("iyziEventType") or event.get("eventType") or "")


def _status_from_iyzico_event(event_type: str, provider_status: str = "") -> str:
    if provider_status:
        return provider_status.lower()
    normalized = event_type.lower()
    if "cancel" in normalized:
        return "canceled"
    if "fail" in normalized:
        return "past_due"
    if "success" in normalized or "active" in normalized:
        return "active"
    return ""


def _iyzico_provider_event_id(event: Mapping[str, object]) -> str:
    event_type = _iyzico_event_type(event)
    subscription_ref = str(event.get("subscriptionReferenceCode") or event.get("referenceCode") or "")
    order_ref = str(event.get("orderReferenceCode") or "")
    iyzico_ref = str(event.get("iyziReferenceCode") or event.get("iyziEventId") or "")
    return iyzico_ref or ":".join(part for part in [subscription_ref, order_ref, event_type] if part)


def _case_insensitive_header(headers: Mapping[str, str], name: str) -> str:
    wanted = name.lower()
    for key, value in headers.items():
        if key.lower() == wanted:
            return value
    return ""


def _expected_iyzico_subscription_signatures(event: Mapping[str, object]) -> tuple[str, ...]:
    event_type = _iyzico_event_type(event)
    subscription_ref = str(event.get("subscriptionReferenceCode") or event.get("referenceCode") or "")
    order_ref = str(event.get("orderReferenceCode") or "")
    customer_ref = str(event.get("customerReferenceCode") or event.get("parentReferenceCode") or "")
    payloads = (
        "".join(
            [
                settings.IYZICO_SECRET_KEY,
                settings.IYZICO_MERCHANT_ID,
                event_type,
                subscription_ref,
                order_ref,
                customer_ref,
            ]
        ),
        "".join(
            [
                settings.IYZICO_MERCHANT_ID,
                settings.IYZICO_SECRET_KEY,
                event_type,
                subscription_ref,
                order_ref,
                customer_ref,
            ]
        ),
    )
    return tuple(
        hmac.new(
            settings.IYZICO_SECRET_KEY.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        for payload in payloads
    )


def _verify_iyzico_subscription_signature(event: Mapping[str, object], headers: Mapping[str, str]) -> bool:
    signature = _case_insensitive_header(headers, "X-IYZ-SIGNATURE-V3").strip().lower()
    if not settings.IYZICO_MERCHANT_ID:
        return not settings.IS_PRODUCTION
    if not signature:
        return False
    return any(
        hmac.compare_digest(expected, signature)
        for expected in _expected_iyzico_subscription_signatures(event)
    )


@billing_router.post(
    "/checkout",
    dependencies=[Depends(require_tenant_context), Depends(ensure_billing_enabled)],
)
async def create_checkout_session(current=Depends(get_current_admin)):
    if not settings.IYZICO_API_KEY or not settings.IYZICO_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Iyzico ödeme sistemi yapılandırılmamış")
    if not settings.IYZICO_SUBSCRIPTION_PLAN_REF:
        raise HTTPException(status_code=503, detail="Iyzico abonelik planı yapılandırılmamış")

    tenant = get_tenant_context()

    try:
        import iyzipay
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="iyzipay paketi kurulu değil") from exc

    conversation_id = str(uuid.uuid4())
    callback_url = (
        f"{settings.IYZICO_CALLBACK_BASE_URL}/api/billing/iyzico/callback"
        f"?tenant_id={tenant.id}&conversation_id={conversation_id}"
    )

    iyzico_request = {
        "locale": "tr",
        "conversationId": conversation_id,
        "callbackUrl": callback_url,
        "pricingPlanReferenceCode": settings.IYZICO_SUBSCRIPTION_PLAN_REF,
        "subscriptionInitialStatus": "ACTIVE",
        "customer": {
            "name": current.get("name", current["email"].split("@")[0]),
            "surname": "Kullanıcı",
            "email": current["email"],
            "identityNumber": "11111111111",
            "gsmNumber": "+905000000000",
            "billingAddress": {
                "contactName": current.get("name", current["email"].split("@")[0]),
                "city": "Istanbul",
                "country": "Turkey",
                "address": "Türkiye",
                "zipCode": "34000",
            },
        },
    }

    result = iyzipay.SubscriptionCheckoutFormInitialize().create(iyzico_request, _iyzico_options())
    result_json = json.loads(result.read().decode("utf-8"))

    if result_json.get("status") != "success":
        raise HTTPException(
            status_code=502,
            detail=result_json.get("errorMessage", "Iyzico ödeme formu başlatılamadı"),
        )

    await log_audit_event(
        action="billing.checkout_created",
        actor_user_id=current["id"],
        tenant_id=tenant.id,
        metadata={"iyzico_conversation_id": conversation_id},
    )

    payment_page_url = result_json.get("paymentPageUrl")
    checkout_form_content = result_json.get("checkoutFormContent")

    if payment_page_url:
        return {"url": payment_page_url}
    return {"form_content": checkout_form_content, "token": result_json.get("token")}


@billing_router.post(
    "/cancel",
    dependencies=[Depends(require_tenant_context), Depends(ensure_billing_enabled)],
)
async def cancel_subscription(current=Depends(get_current_admin)):
    if not settings.IYZICO_API_KEY or not settings.IYZICO_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Iyzico ödeme sistemi yapılandırılmamış")

    tenant = get_tenant_context()

    try:
        import iyzipay
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="iyzipay paketi kurulu değil") from exc

    subscription = await platform_fetch_one(
        """
        SELECT provider_subscription_id FROM public.subscription
        WHERE tenant_id = :tenant_id AND status IN ('active', 'trialing')
        ORDER BY created_at DESC LIMIT 1
        """,
        {"tenant_id": tenant.id},
    )
    if not subscription:
        raise HTTPException(status_code=404, detail="Aktif abonelik bulunamadı")

    iyzico_request = {
        "locale": "tr",
        "conversationId": str(uuid.uuid4()),
        "subscriptionReferenceCode": subscription["provider_subscription_id"],
    }

    result = iyzipay.SubscriptionCancel().create(iyzico_request, _iyzico_options())
    result_json = json.loads(result.read().decode("utf-8"))

    if result_json.get("status") != "success":
        raise HTTPException(
            status_code=502,
            detail=result_json.get("errorMessage", "Abonelik iptal edilemedi"),
        )

    await platform_execute(
        """
        UPDATE public.subscription
        SET status = 'canceled', cancel_at_period_end = true, updated_at = now()
        WHERE provider_subscription_id = :sub_id
        """,
        {"sub_id": subscription["provider_subscription_id"]},
    )
    await platform_execute(
        "UPDATE public.tenant SET plan_code = 'free' WHERE id = :tenant_id",
        {"tenant_id": tenant.id},
    )
    await log_audit_event(
        action="billing.subscription_canceled",
        actor_user_id=current["id"],
        tenant_id=tenant.id,
    )
    return {"canceled": True}


@billing_router.get(
    "/status",
    dependencies=[Depends(require_tenant_context), Depends(ensure_billing_enabled)],
)
async def get_billing_status(current=Depends(get_current_admin)):
    tenant = get_tenant_context()

    subscription = await platform_fetch_one(
        """
        SELECT provider_subscription_id, status, plan_code, current_period_end, cancel_at_period_end
        FROM public.subscription
        WHERE tenant_id = :tenant_id
        ORDER BY created_at DESC LIMIT 1
        """,
        {"tenant_id": tenant.id},
    )
    return {
        "plan_code": tenant.plan_code,
        "subscription": dict(subscription) if subscription else None,
    }


@iyzico_webhook_router.post("/iyzico/callback")
async def iyzico_callback(request: Request):
    """
    Iyzico calls this URL after the user completes (or fails) checkout.
    It sends a POST with form-encoded body: token=... and status=success|failure
    """
    ensure_billing_enabled()
    try:
        import iyzipay
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="iyzipay paketi kurulu değil") from exc

    form = await request.form()
    token = str(form.get("token", ""))
    status = str(form.get("status", ""))

    query_params = dict(request.query_params)
    tenant_id = query_params.get("tenant_id")
    conversation_id = query_params.get("conversation_id")

    if status != "success" or not token:
        redirect_base = settings.IYZICO_CALLBACK_BASE_URL
        if tenant_id:
            customer = await platform_fetch_one(
                "SELECT slug FROM public.tenant WHERE id = :id", {"id": tenant_id}
            )
            if customer:
                return RedirectResponse(f"{redirect_base}/d/{customer['slug']}/admin?billing=cancel", status_code=302)
        return RedirectResponse(f"{redirect_base}/?billing=cancel", status_code=302)

    retrieve_request = {
        "locale": "tr",
        "conversationId": conversation_id or str(uuid.uuid4()),
        "token": token,
    }
    result = iyzipay.SubscriptionCheckoutFormRetrieve().retrieve(retrieve_request, _iyzico_options())
    result_json = json.loads(result.read().decode("utf-8"))

    if result_json.get("status") != "success":
        return RedirectResponse(f"{settings.IYZICO_CALLBACK_BASE_URL}/?billing=error", status_code=302)

    data = result_json.get("data", result_json)
    subscription_ref = data.get("referenceCode") or data.get("subscriptionReferenceCode")
    customer_ref = data.get("customerReferenceCode") or data.get("parentReferenceCode")
    iyzico_status = data.get("subscriptionStatus", "ACTIVE")

    resolved_tenant_id = tenant_id or data.get("conversationId")

    if not resolved_tenant_id:
        return RedirectResponse(f"{settings.IYZICO_CALLBACK_BASE_URL}/?billing=error", status_code=302)

    plan_code = _subscription_plan_for_status(iyzico_status)

    await platform_execute(
        "UPDATE public.tenant SET plan_code = :plan_code WHERE id = :tenant_id",
        {"tenant_id": resolved_tenant_id, "plan_code": plan_code},
    )

    if customer_ref:
        await platform_execute(
            """
            INSERT INTO public.payment_customer (tenant_id, provider, provider_customer_id)
            VALUES (:tenant_id, 'iyzico', :customer_ref)
            ON CONFLICT (tenant_id) DO UPDATE SET
              provider = 'iyzico',
              provider_customer_id = EXCLUDED.provider_customer_id,
              updated_at = now()
            """,
            {"tenant_id": resolved_tenant_id, "customer_ref": customer_ref},
        )

    if subscription_ref:
        period_end = data.get("trialEndDate") or data.get("nextPaymentDate")
        current_period_end = None
        if period_end:
            try:
                current_period_end = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                current_period_end = None

        await platform_execute(
            """
            INSERT INTO public.subscription (
              tenant_id, provider, provider_subscription_id, status, plan_code,
              current_period_end, cancel_at_period_end
            )
            VALUES (
              :tenant_id, 'iyzico', :sub_ref, :status, :plan_code,
              :current_period_end, false
            )
            ON CONFLICT (provider_subscription_id) DO UPDATE SET
              status = EXCLUDED.status,
              plan_code = EXCLUDED.plan_code,
              current_period_end = EXCLUDED.current_period_end,
              updated_at = now()
            """,
            {
                "tenant_id": resolved_tenant_id,
                "sub_ref": subscription_ref,
                "status": iyzico_status.lower(),
                "plan_code": plan_code,
                "current_period_end": current_period_end,
            },
        )

    await platform_execute(
        """
        INSERT INTO public.billing_event (
          provider_event_id, event_type, tenant_id, payload
        )
        VALUES (:event_id, :event_type, :tenant_id, CAST(:payload AS jsonb))
        ON CONFLICT (provider_event_id) DO NOTHING
        """,
        {
            "event_id": token,
            "event_type": "iyzico.subscription.activated",
            "tenant_id": resolved_tenant_id,
            "payload": json.dumps(result_json, default=str),
        },
    )
    await log_audit_event(
        action="billing.event_processed",
        tenant_id=resolved_tenant_id,
        target_type="iyzico_callback",
        target_id=token,
        metadata={"subscription_ref": subscription_ref},
    )

    tenant_row = await platform_fetch_one(
        "SELECT slug FROM public.tenant WHERE id = :id", {"id": resolved_tenant_id}
    )
    redirect_slug = tenant_row["slug"] if tenant_row else ""
    return RedirectResponse(
        f"{settings.IYZICO_CALLBACK_BASE_URL}/d/{redirect_slug}/admin?billing=success",
        status_code=302,
    )


@iyzico_webhook_router.post("/iyzico/webhook")
async def iyzico_subscription_webhook(request: Request):
    """
    Iyzico sends subscription lifecycle events (renewal, cancellation, failure).
    Payload is JSON with X-IYZ-SIGNATURE-V3 HMAC-SHA256 signature header.
    """
    ensure_billing_enabled()
    body = await request.body()
    try:
        event = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        await log_audit_event(
            action="billing.webhook_rejected",
            request=request,
            metadata={"reason": "invalid_json"},
        )
        logger.warning(
            "billing.webhook_rejected",
            extra={"props": {"reason": "invalid_json", "path": request.url.path}},
        )
        raise HTTPException(status_code=400, detail="Geçersiz JSON") from exc

    if not _verify_iyzico_subscription_signature(event, request.headers):
        await log_audit_event(
            action="billing.webhook_rejected",
            request=request,
            metadata={"reason": "invalid_signature", "event_type": _iyzico_event_type(event)},
        )
        logger.warning(
            "billing.webhook_rejected",
            extra={
                "props": {
                    "reason": "invalid_signature",
                    "event_type": _iyzico_event_type(event),
                    "path": request.url.path,
                }
            },
        )
        raise HTTPException(status_code=401, detail="Iyzico webhook imzası geçersiz")

    event_type = _iyzico_event_type(event)
    subscription_ref = str(event.get("subscriptionReferenceCode") or event.get("referenceCode") or "")
    subscription_status = _status_from_iyzico_event(event_type, str(event.get("subscriptionStatus", "")))
    provider_event_id = _iyzico_provider_event_id(event)
    if not event_type or not provider_event_id:
        await log_audit_event(
            action="billing.webhook_rejected",
            request=request,
            metadata={"reason": "missing_required_fields"},
        )
        logger.warning(
            "billing.webhook_rejected",
            extra={"props": {"reason": "missing_required_fields", "path": request.url.path}},
        )
        raise HTTPException(status_code=400, detail="Iyzico webhook payload eksik")

    existing = await platform_fetch_one(
        "SELECT id FROM public.billing_event WHERE provider_event_id = :event_id",
        {"event_id": provider_event_id},
    )
    if existing:
        return {"received": True, "duplicate": True}

    subscription = await platform_fetch_one(
        "SELECT tenant_id FROM public.subscription WHERE provider_subscription_id = :ref",
        {"ref": subscription_ref},
    )
    tenant_id = str(subscription["tenant_id"]) if subscription else None

    if tenant_id and subscription_status:
        plan_code = _subscription_plan_for_status(subscription_status)
        await platform_execute(
            "UPDATE public.tenant SET plan_code = :plan_code WHERE id = :tenant_id",
            {"tenant_id": tenant_id, "plan_code": plan_code},
        )
        await platform_execute(
            """
            UPDATE public.subscription
            SET status = :status, plan_code = :plan_code, updated_at = now()
            WHERE provider_subscription_id = :ref
            """,
            {"ref": subscription_ref, "status": subscription_status, "plan_code": plan_code},
        )

    await platform_execute(
        """
        INSERT INTO public.billing_event (
          provider_event_id, event_type, tenant_id, payload
        )
        VALUES (:event_id, :event_type, :tenant_id, CAST(:payload AS jsonb))
        ON CONFLICT (provider_event_id) DO NOTHING
        """,
        {
            "event_id": provider_event_id,
            "event_type": "iyzico." + event_type.lower(),
            "tenant_id": tenant_id,
            "payload": json.dumps(event, default=str),
        },
    )
    await log_audit_event(
        action="billing.event_processed",
        tenant_id=tenant_id,
        target_type="iyzico_webhook",
        target_id=subscription_ref,
        metadata={"event_type": event_type},
    )
    return {"received": True}
