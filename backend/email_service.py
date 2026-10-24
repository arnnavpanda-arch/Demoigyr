from email.mime.base import MIMEBase
from email import encoders
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465 # SSL
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "indiagetyourresult@gmail.com")
APP_PASSWORD = os.getenv("APP_PASSWORD", "qfaftniikmilgoaq")

def send_email(to_email, subject, body_html):
    msg = MIMEMultipart("alternative")
    msg['Subject'] = subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = to_email

    msg.attach(MIMEText(get_premium_email_html(subject, body_html), 'html'))

    try:
        # Connecting to Gmail's SMTP server
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
            print(f"✅ Email sent successfully to {to_email}")
            return True
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False

def send_email_with_multiple_attachments(to_email, subject, body_html, filepaths):
    msg = MIMEMultipart("mixed")
    msg['Subject'] = subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = to_email

    msg.attach(MIMEText(get_premium_email_html(subject, body_html), 'html'))

    attached_count = 0
    for fp in filepaths:
        if fp and os.path.exists(fp):
            filename = os.path.basename(fp)
            # Remove internal prefix if present for clean client download name
            display_name = filename
            if display_name.startswith("tab_"):
                parts = display_name.split("_", 2)
                if len(parts) >= 3:
                    display_name = parts[2]
            with open(fp, "rb") as attachment:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f"attachment; filename=\"{display_name}\"")
            msg.attach(part)
            attached_count += 1

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
            print(f"✅ Email with {attached_count} attachment(s) sent successfully to {to_email}")
            return True
    except Exception as e:
        print(f"❌ Failed to send email with multiple attachments to {to_email}: {e}")
        return False

def send_email_with_attachment(to_email, subject, body_html, filepath):
    if isinstance(filepath, (list, tuple)):
        return send_email_with_multiple_attachments(to_email, subject, body_html, filepath)

    msg = MIMEMultipart("mixed")
    msg['Subject'] = subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = to_email

    msg.attach(MIMEText(get_premium_email_html(subject, body_html), 'html'))

    if filepath and os.path.exists(filepath):
        filename = os.path.basename(filepath)
        display_name = filename
        if display_name.startswith("tab_"):
            parts = display_name.split("_", 2)
            if len(parts) >= 3:
                display_name = parts[2]
        with open(filepath, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f"attachment; filename=\"{display_name}\"")
        msg.attach(part)

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
            print(f"✅ Email with attachment sent successfully to {to_email}")
            return True
    except Exception as e:
        print(f"❌ Failed to send email with attachment to {to_email}: {e}")
        return False

def get_premium_email_html(title, content):
    return f'''
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 600px; margin: auto;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">IGYR</h1>
                                <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">India Get Your Result</p>
                            </td>
                        </tr>
                        
                        <!-- Title -->
                        <tr>
                            <td style="padding: 30px 40px 10px 40px;">
                                <h2 style="color: #1f2937; margin: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">{title}</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 20px 40px 40px 40px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                {content}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #f3f4f6;">
                                <p style="margin: 0; color: #9ca3af; font-size: 12px;">© 2026 India Get Your Result. All rights reserved.</p>
                                <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">This is an automated message. Please do not reply directly to this email.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    '''

def send_premium_email(to_email, subject, title, body_content):
    html = get_premium_email_html(title, body_content)
    return send_email(to_email, subject, html)

def send_premium_email_with_attachment(to_email, subject, title, body_content, filepath):
    html = get_premium_email_html(title, body_content)
    return send_email_with_attachment(to_email, subject, html, filepath)

def get_customizable_email_html(title, content, show_logo=True, signature=None):
    logo_header = ""
    if show_logo:
        logo_header = '''
        <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 25px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">IGYR</h1>
                <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">India Get Your Result</p>
            </td>
        </tr>
        '''
    else:
        logo_header = '''
        <tr>
            <td style="background-color: #1e3a8a; padding: 15px 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700;">IGYR Notification</h2>
            </td>
        </tr>
        '''

    signature_block = ""
    if signature:
        signature_block = f'''
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #4b5563;">
            {signature}
        </div>
        '''

    return f'''
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 600px; margin: auto;">
                        {logo_header}
                        
                        <!-- Title -->
                        <tr>
                            <td style="padding: 25px 35px 10px 35px;">
                                <h2 style="color: #1f2937; margin: 0; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">{title}</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 20px 35px 30px 35px; color: #374151; font-size: 15px; line-height: 1.6;">
                                {content}
                                {signature_block}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 18px; text-align: center; border-top: 1px solid #f3f4f6;">
                                <p style="margin: 0; color: #9ca3af; font-size: 12px;">© 2026 India Get Your Result (IGYR). All rights reserved.</p>
                                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 11px;">Official Communication from IGYR Super Admin</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    '''

def send_email_ex(to_email, subject, body_html, attachment_bytes=None, filename=None, filepath=None, show_logo=True, signature=None):
    """
    Extended email sender returning (success: bool, message: str).
    Supports buffer bytes or file path for attachments, and custom HTML wrapper options.
    """
    # Prevent email header injection
    safe_subject = str(subject).replace('\r', '').replace('\n', '').strip()
    
    has_attachment = bool(attachment_bytes or (filepath and os.path.exists(filepath)))
    msg = MIMEMultipart("mixed" if has_attachment else "alternative")
    msg['Subject'] = safe_subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = to_email

    full_html = get_customizable_email_html(safe_subject, body_html, show_logo=show_logo, signature=signature)
    msg.attach(MIMEText(full_html, 'html'))

    if attachment_bytes and filename:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(attachment_bytes)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        msg.attach(part)
    elif filepath and os.path.exists(filepath):
        fname = filename or os.path.basename(filepath)
        with open(filepath, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{fname}"')
        msg.attach(part)

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
            print(f"✅ Email sent successfully to {to_email}")
            return True, "Delivered"
    except Exception as e:
        err_msg = str(e)
        print(f"❌ Failed to send email to {to_email}: {err_msg}")
        return False, err_msg
