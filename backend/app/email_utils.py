import os
import smtplib
from email.message import EmailMessage


def send_email(to_email: str, subject: str, body: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM", smtp_username or "noreply@student-learning.local")

    if not smtp_host:
        print(f"[email skipped] To: {to_email} | Subject: {subject}\n{body}")
        return False

    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            if smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)
            server.send_message(message)
        return True
    except Exception as exc:
        print(f"[email failed] To: {to_email} | Subject: {subject} | Error: {exc}")
        return False


def send_email_with_attachment(to_email: str, subject: str, body: str, file_path: str, filename: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM", smtp_username or "noreply@student-learning.local")

    if not smtp_host:
        print(f"[email skipped] To: {to_email} | Subject: {subject}\n{body}\nAttachment: {file_path}")
        return False

    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with open(file_path, "rb") as attachment:
        message.add_attachment(
            attachment.read(),
            maintype="application",
            subtype="octet-stream",
            filename=filename,
        )

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            if smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)
            server.send_message(message)
        return True
    except Exception as exc:
        print(f"[email failed] To: {to_email} | Subject: {subject} | Error: {exc}")
        return False
