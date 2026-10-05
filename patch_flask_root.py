import re
with open('backend/app.py', 'r') as f:
    content = f.read()

root_route = """@app.route('/', defaults={'path': ''})
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

# Insert right after CORS(app)
content = content.replace("CORS(app)  # Enable CORS for frontend requests", "CORS(app)  # Enable CORS for frontend requests\n\n" + root_route)

with open('backend/app.py', 'w') as f:
    f.write(content)
print("Patched catch_all")
