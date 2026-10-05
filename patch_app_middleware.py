import re
with open('backend/app.py', 'r') as f:
    content = f.read()

middleware = """
class VercelFix:
    def __init__(self, app):
        self.app = app
    def __call__(self, environ, start_response):
        # Force the path to match the requested URI if Vercel mangled it
        request_uri = environ.get('REQUEST_URI', '')
        if request_uri and '?' in request_uri:
            request_uri = request_uri.split('?')[0]
            
        if request_uri and request_uri.startswith('/api/'):
            environ['PATH_INFO'] = request_uri
            
        return self.app(environ, start_response)

app.wsgi_app = VercelFix(app.wsgi_app)
"""

if "VercelFix" not in content:
    content = content.replace("CORS(app)  # Enable CORS for frontend requests", "CORS(app)  # Enable CORS for frontend requests\n" + middleware)
    with open('backend/app.py', 'w') as f:
        f.write(content)
print("Patched app.py")
