import re
with open('backend/app.py', 'r') as f:
    content = f.read()

# Replace the previous catch_all
old_route = re.search(r"@app\.route\('/', defaults=\{'path': ''\}\).*?return f\"<h1>Debug: Vercel Lambda Environment</h1>.*?404\n", content, flags=re.DOTALL).group(0)

new_route = """@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    import os
    from flask import send_from_directory, send_file
    
    base = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(base)
    
    if path == '' or path == '/':
        path = 'index.html'
        
    req_path = os.path.join(root_dir, path)
    if os.path.exists(req_path):
        return send_from_directory(root_dir, path)
        
    files = os.listdir(root_dir) if os.path.exists(root_dir) else []
    return f"<h1>File Not Found</h1><p>Tried to load: {path}</p><p>Files available in Lambda: {files}</p>", 404
"""

content = content.replace(old_route, new_route)

with open('backend/app.py', 'w') as f:
    f.write(content)
