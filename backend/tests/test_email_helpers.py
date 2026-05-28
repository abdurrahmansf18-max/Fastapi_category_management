from app.core import email


class FakeSMTP:
    sent_messages = []

    def __init__(self, host, port):
        self.host = host
        self.port = port

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def starttls(self):
        return None

    def login(self, *_args):
        return None

    def send_message(self, msg):
        self.sent_messages.append(msg)


def test_verification_email_keeps_mailhog_link_clickable(monkeypatch):
    FakeSMTP.sent_messages = []
    monkeypatch.setattr(email.settings, "SMTP_HOST", "mailhog")
    monkeypatch.setattr(email.settings, "SMTP_PORT", 1025)
    monkeypatch.setattr(email.settings, "SMTP_FROM", "noreply@localhost")
    monkeypatch.setattr(email.settings, "SMTP_TLS", False)
    monkeypatch.setattr(email.settings, "SMTP_USER", "")
    monkeypatch.setattr(email.settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(email.smtplib, "SMTP", FakeSMTP)

    link = "http://localhost:3000/verify-email?token=" + "a" * 43

    email.send_verification_email("user@example.com", link)

    assert FakeSMTP.sent_messages
    raw_message = FakeSMTP.sent_messages[0].as_string()
    assert "Content-Transfer-Encoding: 7bit" in raw_message
    assert "token=3D" not in raw_message
    assert link in raw_message
    assert "multipart/alternative" in raw_message
    assert "Verify email" in raw_message
