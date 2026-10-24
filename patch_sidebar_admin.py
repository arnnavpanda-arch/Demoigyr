with open('admin.html', 'r') as f:
    content = f.read()

content = content.replace('<span class="hidden md:inline ml-1">', '<span class="ml-2 md:ml-1 whitespace-nowrap">')
content = content.replace('<span class="hidden md:inline">', '<span class="ml-2 md:ml-0 whitespace-nowrap">')

with open('admin.html', 'w') as f:
    f.write(content)
print("Patched admin.html")
