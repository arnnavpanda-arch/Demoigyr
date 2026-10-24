import re

with open('app.js', 'r') as f:
    content = f.read()

old_msg = "if(status === 'approved') return '<span class=\"text-green-600 font-bold\"><i class=\"fa-solid fa-check\"></i> Account Verified:</span> You have no ongoing publications. Click \"Publish New Results\" to start.';"
new_msg = """if(status === 'approved') {
            const hasDues = ((state.payments?.phases || []).reduce((a, p) => a + (p.debited || 0), 0) - (state.payments?.phases || []).reduce((a, p) => a + (p.credited || 0), 0)) > 0;
            if(hasDues) return '<span class="text-red-600 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Action Required:</span> You have pending dues. Please clear them to unlock new result publications.';
            return '<span class="text-green-600 font-bold"><i class="fa-solid fa-check"></i> Account Verified:</span> You have no ongoing publications. Click "Publish New Result" to start.';
        }"""

if old_msg in content:
    content = content.replace(old_msg, new_msg)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Patched status message!")
else:
    print("Could not find old message!")
