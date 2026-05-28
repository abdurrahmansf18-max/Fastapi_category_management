"""Iyzico future-integration helpers.

Payment routes and payment tables are intentionally absent from the app.
"""
import hashlib
import hmac

import app.core.iyzico as iyzico
from app.db import provisioning


def test_platform_schema_does_not_create_payment_tables():
    ddl = "\n".join(provisioning.PLATFORM_DDL).lower()

    assert "payment_customer" not in ddl
    assert "billing_event" not in ddl
    assert "provider_subscription_id" not in ddl
    assert "public.subscription" not in ddl


def test_iyzico_subscription_signature_v3_validation(monkeypatch):
    monkeypatch.setattr(iyzico.settings, "IYZICO_SECRET_KEY", "merchant-secret")
    monkeypatch.setattr(iyzico.settings, "IYZICO_MERCHANT_ID", "123456")
    monkeypatch.setattr(iyzico.settings, "ENVIRONMENT", "production")

    event = {
        "orderReferenceCode": "order-ref",
        "customerReferenceCode": "customer-ref",
        "subscriptionReferenceCode": "sub-ref",
        "iyziEventType": "subscription.order.success",
    }
    payload = "merchant-secret123456subscription.order.successsub-reforder-refcustomer-ref"
    signature = hmac.new(
        b"merchant-secret",
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    sample_payload = "123456merchant-secretsubscription.order.successsub-reforder-refcustomer-ref"
    sample_signature = hmac.new(
        b"merchant-secret",
        sample_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    assert iyzico.verify_iyzico_subscription_signature(
        event,
        {"X-IYZ-SIGNATURE-V3": signature},
    )
    assert iyzico.verify_iyzico_subscription_signature(
        event,
        {"X-IYZ-SIGNATURE-V3": sample_signature},
    )
    assert not iyzico.verify_iyzico_subscription_signature(
        event,
        {"X-IYZ-SIGNATURE-V3": "bad-signature"},
    )


def test_iyzico_event_status_and_plan_mapping():
    assert iyzico.status_from_iyzico_event("subscription.order.success") == "active"
    assert iyzico.subscription_plan_for_status("active") == "pro"
    assert iyzico.status_from_iyzico_event("subscription.order.failure") == "past_due"
    assert iyzico.subscription_plan_for_status("past_due") == "free"
    assert iyzico.status_from_iyzico_event("subscription.cancel") == "canceled"
    assert iyzico.subscription_plan_for_status("canceled") == "free"
