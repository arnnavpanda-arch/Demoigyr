import re

with open('app.js', 'r') as f:
    content = f.read()

old_button = """                                ${['approved', 'published'].includes(appStatus) ? `
                                    <button id="card-new-result" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all transform hover:-translate-y-1 text-sm flex items-center whitespace-nowrap">
                                        <i class="fa-solid fa-bolt mr-2"></i> Publish New Result
                                    </button>
                                ` : ''}"""

new_button = """                                ${['approved', 'published'].includes(appStatus) ? (
                                    ((state.payments?.phases || []).reduce((a, p) => a + (p.debited || 0), 0) - (state.payments?.phases || []).reduce((a, p) => a + (p.credited || 0), 0) > 0) ? `
                                    <button onclick="document.querySelector('[data-tab=\\'payment\\']').click()" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all transform hover:-translate-y-1 text-sm flex items-center whitespace-nowrap">
                                        <i class="fa-solid fa-triangle-exclamation mr-2"></i> Clear Dues to Publish
                                    </button>
                                    ` : `
                                    <button id="card-new-result" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all transform hover:-translate-y-1 text-sm flex items-center whitespace-nowrap">
                                        <i class="fa-solid fa-bolt mr-2"></i> Publish New Result
                                    </button>
                                    `
                                ) : ''}"""

if old_button in content:
    content = content.replace(old_button, new_button)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Patched new result button!")
else:
    print("Could not find old button!")
