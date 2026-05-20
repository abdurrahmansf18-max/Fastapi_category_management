import hashlib
import hmac

from app.db import provisioning
from app.routers import billing


def test_platform_payment_schema_is_iyzico_only():
    ddl = "\n".join(provisioning.PLATFORM_DDL).lower()
    assert ("str" + "ipe") not in ddl
    assert "provider_customer_id" in ddl
    assert "default 'iyzico'" in ddl


def test_iyzico_subscription_signature_v3_validation(monkeypatch):
    monkeypatch.setattr(billing.settings, "IYZICO_SECRET_KEY", "merchant-secret")
    monkeypatch.setattr(billing.settings, "IYZICO_MERCHANT_ID", "123456")
    monkeypatch.setattr(billing.settings, "IS_PRODUCTION", True)

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

    assert billing._verify_iyzico_subscription_signature(
        event,
        {"X-IYZ-SIGNATURE-V3": signature},
    )
    assert billing._verify_iyzico_subscription_signature(
        event,
        {"X-IYZ-SIGNATURE-V3": sample_signature},
    )
    assert not billing._verify_iyzico_subscription_signature(
        event,
        {"X-IYZ-SIGNATURE-V3": "bad-signature"},
    )


def test_iyzico_event_status_and_plan_mapping():
    assert billing._status_from_iyzico_event("subscription.order.success") == "active"
    assert billing._subscription_plan_for_status("active") == "pro"
    assert billing._status_from_iyzico_event("subscription.order.failure") == "past_due"
    assert billing._subscription_plan_for_status("past_due") == "free"
    assert billing._status_from_iyzico_event("subscription.cancel") == "canceled"
    assert billing._subscription_plan_for_status("canceled") == "free"
