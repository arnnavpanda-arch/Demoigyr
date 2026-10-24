import re

with open('app.js', 'r') as f:
    content = f.read()

old_fetch = """                const res = await fetch(`${API_BASE}/auth/send-code`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email })
                });"""

new_fetch = """                const res = await fetch(`${API_BASE}/auth/send-code`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, mode: state.authMode })
                });"""

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Patched app.js send-code")
else:
    print("Could not find fetch block")
