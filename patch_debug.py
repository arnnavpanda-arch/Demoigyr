import re
with open('backend/app.py', 'r') as f:
    content = f.read()

# Replace the previous catch_all
old_route = """@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    from flask import jsonify, request
    return jsonify({
        "error": "Vercel incorrectly routed frontend traffic to the Python backend.",
        "path_received": path,
        "method": request.method,
        "solution": "Your vercel.json is still using the old configuration. Please upload vercel.json exactly as it is on your computer."
    }), 404
"""

new_route = """@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    import os
    from flask import send_file
    
    # Check if we can find the frontend files by walking up
    base = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(base)
    
    html_path = os.path.join(root_dir, 'index.html')
    if os.path.exists(html_path):
        if path == '' or path == '/':
            return send_file(html_path)
        
        req_path = os.path.join(root_dir, path)
        if os.path.exists(req_path):
            return send_file(req_path)
            
    # If not found, list contents of root directory for debugging
    files = os.listdir(root_dir) if os.path.exists(root_dir) else []
    return f"<h1>Debug: Vercel Lambda Environment</h1><p>Path requested: {path}</p><p>Files in {root_dir}: {files}</p>", 404
"""

content = content.replace(old_route, new_route)

with open('backend/app.py', 'w') as f:
    f.write(content)
