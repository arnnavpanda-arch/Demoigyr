import re

with open('backend/app.py', 'r') as f:
    content = f.read()

old_text = "<p>We're sorry, your registration to India Get Your Result was rejected by the admin. Please log in to your account to update your details and reapply.</p>"
new_text = "<p>We're sorry, your registration to India Get Your Result was rejected by the admin. Please log in and Newly Create account and submit your details and reapply.</p>"

if old_text in content:
    content = content.replace(old_text, new_text)
    with open('backend/app.py', 'w') as f:
        f.write(content)
    print("Patched Rejection Email Text!")
else:
    print("Could not find old text block!")
