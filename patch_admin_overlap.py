import re

with open('admin.js', 'r') as f:
    content = f.read()

old_layout = """                                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600 mt-3">
                                    <p><i class="fa-solid fa-envelope w-5 text-gray-400"></i> ${inst.email}</p>
                                    <p><i class="fa-solid fa-phone w-5 text-gray-400"></i> ${inst.institute?.mobile || 'N/A'}</p>
                                    <p><i class="fa-solid fa-location-dot w-5 text-gray-400"></i> ${inst.institute?.district || 'N/A'}, ${inst.institute?.state || 'N/A'}</p>
                                    <p><i class="fa-solid fa-building w-5 text-gray-400"></i> <span class="uppercase tracking-wider text-xs font-bold">${inst.institute?.type || 'N/A'}</span></p>
                                </div>"""

new_layout = """                                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600 mt-3 w-full max-w-full overflow-hidden">
                                    <p class="flex items-start break-all"><i class="fa-solid fa-envelope w-5 text-gray-400 shrink-0 mt-0.5"></i> <span class="min-w-0">${inst.email}</span></p>
                                    <p class="flex items-start"><i class="fa-solid fa-phone w-5 text-gray-400 shrink-0 mt-0.5"></i> <span>${inst.institute?.mobile || 'N/A'}</span></p>
                                    <p class="flex items-start"><i class="fa-solid fa-location-dot w-5 text-gray-400 shrink-0 mt-0.5"></i> <span>${inst.institute?.district || 'N/A'}, ${inst.institute?.state || 'N/A'}</span></p>
                                    <p class="flex items-start"><i class="fa-solid fa-building w-5 text-gray-400 shrink-0 mt-0.5"></i> <span class="uppercase tracking-wider text-xs font-bold">${inst.institute?.type || 'N/A'}</span></p>
                                </div>"""

if old_layout in content:
    content = content.replace(old_layout, new_layout)
    with open('admin.js', 'w') as f:
        f.write(content)
    print("Patched admin registration layout!")
else:
    print("Could not find old layout!")
