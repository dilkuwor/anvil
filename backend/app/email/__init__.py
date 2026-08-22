"""Dedicated email delivery module.

All outbound email goes through :mod:`app.email` so no other package talks to
the email provider directly. The Resend API key stays server-side: it is read
from settings (environment variables) here and is never returned to clients or
written to logs.
"""

from app.email.resend import EmailSendError, send_email
from app.email.templates import verification_email

__all__ = ["EmailSendError", "send_email", "verification_email"]
