with open('backend/email_service.py', 'r') as f:
    content = f.read()

premium_template = """
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
"""

if "get_premium_email_html" not in content:
    content = content + premium_template
    with open('backend/email_service.py', 'w') as f:
        f.write(content)
    print("Added premium templates to email_service.py")
