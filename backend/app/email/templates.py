"""Email content templates (HTML + plain text)."""

from __future__ import annotations

from dataclasses import dataclass

VERIFICATION_SUBJECT = "Verify your AnvilPrep email"
WELCOME_SUBJECT = "Welcome to AnvilPrep"


@dataclass(frozen=True)
class EmailContent:
    subject: str
    html: str
    text: str


def _html(title: str, body_html: str, footer: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f4f5f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:32px 32px 8px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <h1 style="margin:0 0 16px 0;font-size:20px;line-height:28px;color:#111827;">{title}</h1>
                {body_html}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">
                {footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def verification_email(link: str, expires_hours: int) -> EmailContent:
    title = "Verify your email address"
    body = f"""
                <p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#374151;">
                  Welcome to AnvilPrep! Confirm this email address to finish setting up your account.
                </p>
                <p style="margin:0 0 24px 0;">
                  <a href="{link}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;line-height:20px;font-weight:600;padding:10px 20px;border-radius:6px;">
                    Verify my email
                  </a>
                </p>
                <p style="margin:0 0 8px 0;font-size:14px;line-height:22px;color:#374151;">
                  Or paste this link into your browser:
                </p>
                <p style="margin:0;font-size:13px;line-height:20px;word-break:break-all;">
                  <a href="{link}" style="color:#2563eb;text-decoration:underline;">{link}</a>
                </p>
    """
    footer = f"""
                This link expires in {expires_hours} hours and can be used once.
                If you did not create an AnvilPrep account, you can safely ignore this email.
    """
    plain = (
        "Welcome to AnvilPrep!\n\n"
        "Confirm your email address to finish setting up your account:\n"
        f"{link}\n\n"
        f"This link expires in {expires_hours} hours and can be used once.\n"
        "If you did not create an AnvilPrep account, you can safely ignore this email.\n"
    )
    return EmailContent(subject=VERIFICATION_SUBJECT, html=_html(title, body, footer), text=plain)


def welcome_email(app_url: str) -> EmailContent:
    title = "Welcome to AnvilPrep"
    body = f"""
                <p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#374151;">
                  Your account is ready. Here is what you can do right away:
                </p>
                <ul style="margin:0 0 20px 0;padding:0 0 0 18px;font-size:14px;line-height:22px;color:#374151;">
                  <li style="margin-bottom:6px;">Practice Java coding problems with instant test feedback</li>
                  <li style="margin-bottom:6px;">Run mock coding and system-design interviews</li>
                  <li>Build your own problem lists and track your streak</li>
                </ul>
                <p style="margin:0;">
                  <a href="{app_url}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;line-height:20px;font-weight:600;padding:10px 20px;border-radius:6px;">
                    Start practicing
                  </a>
                </p>
    """
    footer = """
                You received this email because an AnvilPrep account was created with this address.
                If that wasn't you, you can safely ignore this email.
    """
    plain = (
        "Welcome to AnvilPrep!\n\n"
        "Your account is ready:\n"
        "- Practice Java coding problems with instant test feedback\n"
        "- Run mock coding and system-design interviews\n"
        "- Build your own problem lists and track your streak\n\n"
        f"Start here: {app_url}\n\n"
        "You received this email because an AnvilPrep account was created with this address.\n"
        "If that wasn't you, you can safely ignore this email.\n"
    )
    return EmailContent(subject=WELCOME_SUBJECT, html=_html(title, body, footer), text=plain)
