import re
with open('backend/app.py', 'r') as f:
    content = f.read()

content = content.replace('"Your request is under processing waiting..."', '"Your request is under processing waiting.................."')

with open('backend/app.py', 'w') as f:
    f.write(content)
print("Patched backend error message")
