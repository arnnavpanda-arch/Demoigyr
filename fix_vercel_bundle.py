import json

vercel = {
  "functions": {
    "api/**/*.py": {
      "includeFiles": "*{.html,.js,.css,.jpg}"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.py?original_path=/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/api/index.py?original_path=/$1"
    }
  ]
}

with open('vercel.json', 'w') as f:
    json.dump(vercel, f, indent=2)

