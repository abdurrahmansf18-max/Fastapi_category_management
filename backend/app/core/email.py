from __future__ import annotations

import smtplib
from html import escape
from email.message import EmailMessage

from app.core.config import settings
from app.core.observability import get_logger

logger = get_logger()
BRAND_NAME = "Docs Platform"
BRAND_COLOR = "#059669"


def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def _verification_email_html(verification_link: str) -> str:
    safe_link = escape(verification_link, quote=True)
    return f"""\
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:{BRAND_COLOR};color:#ffffff;">
                <div style="font-size:18px;font-weight:700;">{BRAND_NAME}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#0f172a;">Verify your workspace</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
                  Welcome. Confirm your email address to activate your documentation workspace.
                </p>
                <a href="{safe_link}" style="display:inline-block;background:{BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;font-size:14px;">
                  Verify email
                </a>
                <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
                  If the button does not work, open this link:<br>
                  <a href="{safe_link}" style="color:{BRAND_COLOR};word-break:break-all;">{safe_link}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _password_reset_email_html(reset_link: str) -> str:
    safe_link = escape(reset_link, quote=True)
    return f"""\
<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:{BRAND_COLOR};color:#ffffff;">
                <div style="font-size:18px;font-weight:700;">{BRAND_NAME}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#0f172a;">Reset your password</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
                  We received a request to reset your password. Click the button below to choose a new one.
                  This link expires in 1 hour.
                </p>
                <a href="{safe_link}" style="display:inline-block;background:{BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;font-size:14px;">
                  Reset password
                </a>
                <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
                  If you didn't request this, you can ignore this email.<br>
                  If the button does not work, open this link:<br>
                  <a href="{safe_link}" style="color:{BRAND_COLOR};word-break:break-all;">{safe_link}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    if not smtp_configured():
        logger.info(
            "email.password_reset.dev_link",
            extra={
                "props": {
                    "to_email": to_email,
                    "reset_link": reset_link,
                }
            },
        )
        return

    msg = EmailMessage()
    msg["Subject"] = "Reset your password"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.set_content(
        "We received a request to reset your password.\n\n"
        f"Click the link below to choose a new password (expires in 1 hour):\n\n"
        f"{reset_link}\n\n"
        "If you didn't request this, you can ignore this email.",
        cte="7bit",
    )
    msg.add_alternative(_password_reset_email_html(reset_link), subtype="html", cte="7bit")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        if settings.SMTP_TLS:
            smtp.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)
    logger.info("email.password_reset.sent", extra={"props": {"to_email": to_email}})


def send_verification_email(to_email: str, verification_link: str) -> None:
    if not smtp_configured():
        logger.info(
            "email.verification.dev_link",
            extra={
                "props": {
                    "to_email": to_email,
                    "verification_link": verification_link,
                }
            },
        )
        return

    msg = EmailMessage()
    msg["Subject"] = "Verify your documentation workspace"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.set_content(
        "Welcome. Verify your email to activate your documentation workspace:\n\n"
        f"{verification_link}\n",
        cte="7bit",
    )
    msg.add_alternative(_verification_email_html(verification_link), subtype="html", cte="7bit")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        if settings.SMTP_TLS:
            smtp.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)
    logger.info("email.verification.sent", extra={"props": {"to_email": to_email}})
