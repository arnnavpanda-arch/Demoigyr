with open('admin.js', 'r') as f:
    content = f.read()

reject_fn = """
window.rejectRegistration = async function(email) {
    if (!(await confirmAction('Are you sure you want to REJECT this registration? They will receive a rejection email.'))) return;
    updateStatus(email, 'rejected');
};
"""

content += reject_fn

with open('admin.js', 'w') as f:
    f.write(content)
print("Added rejectRegistration function!")
