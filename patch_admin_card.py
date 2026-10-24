import re

with open('admin.js', 'r') as f:
    content = f.read()

old_layout = """                                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600 mt-3 w-full max-w-full overflow-hidden">
                                    <p class="flex items-start break-all"><i class="fa-solid fa-envelope w-5 text-gray-400 shrink-0 mt-0.5"></i> <span class="min-w-0">${inst.email}</span></p>
                                    <p class="flex items-start"><i class="fa-solid fa-phone w-5 text-gray-400 shrink-0 mt-0.5"></i> <span>${inst.institute?.mobile || 'N/A'}</span></p>
                                    <p class="flex items-start"><i class="fa-solid fa-location-dot w-5 text-gray-400 shrink-0 mt-0.5"></i> <span>${inst.institute?.district || 'N/A'}, ${inst.institute?.state || 'N/A'}</span></p>
                                    <p class="flex items-start"><i class="fa-solid fa-building w-5 text-gray-400 shrink-0 mt-0.5"></i> <span class="uppercase tracking-wider text-xs font-bold">${inst.institute?.type || 'N/A'}</span></p>
                                </div>"""

new_layout = """                                <div class="flex flex-col gap-2 mt-4">
                                    <div class="flex items-center text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 w-full overflow-hidden">
                                        <i class="fa-solid fa-envelope w-7 text-blue-500 text-center shrink-0"></i>
                                        <span class="truncate font-medium">${inst.email}</span>
                                    </div>
                                    <div class="flex items-center text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 w-full overflow-hidden">
                                        <i class="fa-solid fa-phone w-7 text-green-500 text-center shrink-0"></i>
                                        <span class="font-medium">${inst.institute?.mobile || 'N/A'}</span>
                                    </div>
                                    <div class="flex items-center text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 w-full overflow-hidden">
                                        <i class="fa-solid fa-location-dot w-7 text-red-500 text-center shrink-0"></i>
                                        <span class="truncate font-medium">${inst.institute?.district || 'N/A'}, ${inst.institute?.state || 'N/A'}</span>
                                    </div>
                                    <div class="flex items-center text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 w-full overflow-hidden">
                                        <i class="fa-solid fa-building w-7 text-purple-500 text-center shrink-0"></i>
                                        <span class="font-bold text-gray-800 tracking-wide">${inst.institute?.type || 'N/A'}</span>
                                    </div>
                                </div>"""

if old_layout in content:
    content = content.replace(old_layout, new_layout)
    with open('admin.js', 'w') as f:
        f.write(content)
    print("Patched admin registration card layout!")
else:
    print("Could not find old layout!")
