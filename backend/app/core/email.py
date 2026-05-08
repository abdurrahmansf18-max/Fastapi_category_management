from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import settings


def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def send_verification_email(to_email: str, verification_link: str) -> None:
    if not smtp_configured():
        print(f"[dev-email] Verify {to_email}: {verification_link}")
        return

    msg = EmailMessage()
    msg["Subject"] = "Verify your documentation workspace"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.set_content(
        "Welcome. Verify your email to activate your documentation workspace:\n\n"
        f"{verification_link}\n"
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        if settings.SMTP_TLS:
            smtp.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)
