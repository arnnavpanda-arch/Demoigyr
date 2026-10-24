import re
with open('backend/email_service.py', 'r') as f:
    content = f.read()

# I will replace the msg.attach(MIMEText(body_html, 'html')) to use the wrapper

old_send = "msg.attach(MIMEText(body_html, 'html'))"
new_send = "msg.attach(MIMEText(get_premium_email_html(subject, body_html), 'html'))"

if new_send not in content:
    content = content.replace(old_send, new_send)
    with open('backend/email_service.py', 'w') as f:
        f.write(content)
    print("Wrapped all emails in premium template!")
