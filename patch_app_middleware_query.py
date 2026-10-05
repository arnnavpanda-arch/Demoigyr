import re
with open('backend/app.py', 'r') as f:
    content = f.read()

# Replace VercelFix
old_middleware = """class VercelFix:
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

app.wsgi_app = VercelFix(app.wsgi_app)"""

new_middleware = """class VercelFix:
    def __init__(self, app):
        self.app = app
    def __call__(self, environ, start_response):
        import urllib.parse
        qs = environ.get('QUERY_STRING', '')
        params = urllib.parse.parse_qs(qs, keep_blank_values=True)
        if 'orig' in params:
            environ['PATH_INFO'] = params['orig'][0]
            new_params = {k: v for k, v in params.items() if k != 'orig'}
            environ['QUERY_STRING'] = urllib.parse.urlencode(new_params, doseq=True)
        return self.app(environ, start_response)

app.wsgi_app = VercelFix(app.wsgi_app)"""

content = content.replace(old_middleware, new_middleware)

with open('backend/app.py', 'w') as f:
    f.write(content)
print("Updated middleware")
