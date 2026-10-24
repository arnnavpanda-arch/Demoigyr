import re

with open('admin.js', 'r') as f:
    content = f.read()

old_layout = """                        <div class="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div>
                                <h4 class="font-bold text-gray-800 text-lg mb-1">${inst.institute?.name || 'Unknown Institute'}</h4>
                                <div class="flex flex-col gap-2 mt-4">
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
                                </div>
                            </div>
                            <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
                                <button onclick="updateStatus('${inst.email}', 'approved')" class="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center">
                                    <i class="fa-solid fa-check mr-2"></i> Approve
                                </button>
                                <button onclick="rejectRegistration('${inst.email}')" class="flex-1 sm:flex-none bg-white hover:bg-red-50 text-red-600 border border-red-200 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center">
                                    <i class="fa-solid fa-xmark mr-2"></i> Reject
                                </button>
                            </div>
                        </div>"""

new_layout = """                        <div>
                            <h4 class="font-bold text-gray-800 text-lg mb-1">${inst.institute?.name || 'Unknown Institute'}</h4>
                            
                            <div class="flex flex-col gap-2 mt-4">
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
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
                                <button onclick="updateStatus('${inst.email}', 'approved')" class="w-full bg-green-600 hover:bg-green-700 text-white px-2 py-3 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center">
                                    <i class="fa-solid fa-check mr-2"></i> Approve
                                </button>
                                <button onclick="rejectRegistration('${inst.email}')" class="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 px-2 py-3 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center">
                                    <i class="fa-solid fa-xmark mr-2"></i> Reject
                                </button>
                            </div>
                        </div>"""

if old_layout in content:
    content = content.replace(old_layout, new_layout)
    with open('admin.js', 'w') as f:
        f.write(content)
    print("Patched admin registration buttons layout!")
else:
    print("Could not find old layout!")
