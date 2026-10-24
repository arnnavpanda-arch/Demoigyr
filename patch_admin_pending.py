import re

with open('admin.js', 'r') as f:
    content = f.read()

old_html = """            if (inst.status === 'pending') {
                pendingHtml += `
                    <div class="border rounded p-4 mb-2 bg-yellow-50">
                        <p class="font-bold">${inst.institute?.name || 'Unknown Institute'}</p>
                        <p class="text-sm">${inst.email}</p>
                        <button onclick="updateStatus('${inst.email}', 'approved')" class="bg-green-500 text-white px-3 py-1 rounded text-sm mt-2">Approve</button>
                    </div>`;
            }"""

new_html = """            if (inst.status === 'pending') {
                pendingHtml += `
                    <div class="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow relative">
                        <div class="absolute top-0 left-0 w-full h-1 bg-yellow-400 rounded-t-xl"></div>
                        <div class="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div>
                                <h4 class="font-bold text-gray-800 text-lg mb-1">${inst.institute?.name || 'Unknown Institute'}</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600 mt-3">
                                    <p><i class="fa-solid fa-envelope w-5 text-gray-400"></i> ${inst.email}</p>
                                    <p><i class="fa-solid fa-phone w-5 text-gray-400"></i> ${inst.institute?.mobile || 'N/A'}</p>
                                    <p><i class="fa-solid fa-location-dot w-5 text-gray-400"></i> ${inst.institute?.district || 'N/A'}, ${inst.institute?.state || 'N/A'}</p>
                                    <p><i class="fa-solid fa-building w-5 text-gray-400"></i> <span class="uppercase tracking-wider text-xs font-bold">${inst.institute?.type || 'N/A'}</span></p>
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
                        </div>
                    </div>`;
            }"""

if old_html in content:
    content = content.replace(old_html, new_html)
    with open('admin.js', 'w') as f:
        f.write(content)
    print("Patched admin.js rendering!")
else:
    print("Could not find old html block!")
