with open('admin.js', 'r') as f:
    content = f.read()

reject_fn = """
async function rejectRegistration(email) {
    if (!(await confirmAction('Are you sure you want to REJECT and delete this registration? They will receive a rejection email.'))) return;
    updateStatus(email, 'rejected');
}
"""
if "rejectRegistration" not in content:
    content += reject_fn
    with open('admin.js', 'w') as f:
        f.write(content)
    print("Added rejectRegistration!")
