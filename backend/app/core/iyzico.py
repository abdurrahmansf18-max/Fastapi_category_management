"""Minimal Iyzico helpers kept for a future payment integration.

Bu modül aktif ödeme endpoint'i içermez. Sadece ileride Iyzico eklenecekse
kullanılabilecek temel seçenek, event ve imza doğrulama yardımcılarını tutar.
"""
from __future__ import annotations

import hashlib
import hmac as hmac_lib
from typing import Mapping

from app.core.config import settings

IYZICO_PRO_STATUSES = {"ACTIVE", "UPGRADED", "TRIAL", "TRIALING"}


def iyzico_options() -> dict:
    return {
        "api_key": settings.IYZICO_API_KEY,
        "secret_key": settings.IYZICO_SECRET_KEY,
        "base_url": settings.IYZICO_BASE_URL,
    }


def iyzico_event_type(event: Mapping[str, object]) -> str:
    return str(event.get("iyziEventType") or event.get("eventType") or "")


def subscription_plan_for_status(status: str) -> str:
    return "pro" if status.upper() in IYZICO_PRO_STATUSES else "free"


def status_from_iyzico_event(event_type: str, provider_status: str = "") -> str:
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


def iyzico_provider_event_id(event: Mapping[str, object]) -> str:
    event_type = iyzico_event_type(event)
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


def _expected_subscription_signatures(event: Mapping[str, object]) -> tuple[str, ...]:
    event_type = iyzico_event_type(event)
    subscription_ref = str(event.get("subscriptionReferenceCode") or event.get("referenceCode") or "")
    order_ref = str(event.get("orderReferenceCode") or "")
    customer_ref = str(event.get("customerReferenceCode") or event.get("parentReferenceCode") or "")
    payloads = (
        "".join([settings.IYZICO_SECRET_KEY, settings.IYZICO_MERCHANT_ID, event_type, subscription_ref, order_ref, customer_ref]),
        "".join([settings.IYZICO_MERCHANT_ID, settings.IYZICO_SECRET_KEY, event_type, subscription_ref, order_ref, customer_ref]),
    )
    return tuple(
        hmac_lib.new(
            settings.IYZICO_SECRET_KEY.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        for payload in payloads
    )


def verify_iyzico_subscription_signature(
    event: Mapping[str, object],
    headers: Mapping[str, str],
) -> bool:
    signature = _case_insensitive_header(headers, "X-IYZ-SIGNATURE-V3").strip().lower()
    if not settings.IYZICO_MERCHANT_ID:
        return not settings.IS_PRODUCTION
    if not signature:
        return False
    return any(
        hmac_lib.compare_digest(expected, signature)
        for expected in _expected_subscription_signatures(event)
    )
