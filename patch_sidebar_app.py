with open('app.js', 'r') as f:
    content = f.read()

# Replace the hidden spans with visible spans
content = content.replace('<span class="hidden md:inline">', '<span class="ml-2 md:ml-0 whitespace-nowrap">')

with open('app.js', 'w') as f:
    f.write(content)
print("Patched app.js")
