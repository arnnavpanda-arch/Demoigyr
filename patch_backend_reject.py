import re

with open('backend/app.py', 'r') as f:
    content = f.read()

old_logic = """    elif mode == 'login':
        if not inst:
            return jsonify({"error": "Email not registered. Please create an account."}), 400
        if inst.get('status') == 'pending':
            return jsonify({"error": "Your account is still under review. Please wait for the approval email to sign in."}), 400
        if inst.get('status') == 'rejected':
            return jsonify({"error": "Your registration was rejected. Please contact support."}), 400"""

new_logic = """    elif mode == 'login':
        if not inst:
            return jsonify({"error": "Email not registered. Please create an account."}), 400
        if inst.get('status') == 'pending':
            return jsonify({"error": "Your account is still under review. Please wait for the approval email to sign in."}), 400
        # If rejected, we allow them to log in so they can update details and reapply."""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
else:
    print("Could not find send-code login block")

old_admin = """    if new_status == 'rejected':
        institutes_col.delete_one({"email": email})
        send_email(email, "Registration Rejected", "<p>We're sorry, your registration to India Get Your Result was rejected by the admin.</p>")"""

new_admin = """    if new_status == 'rejected':
        institutes_col.update_one({"email": email}, {"$set": {"status": "rejected"}})
        send_email(email, "Registration Rejected", "<p>We're sorry, your registration to India Get Your Result was rejected by the admin. Please log in to your account to update your details and reapply.</p>")"""

if old_admin in content:
    content = content.replace(old_admin, new_admin)
else:
    print("Could not find admin reject block")

with open('backend/app.py', 'w') as f:
    f.write(content)
print("Patched backend reject logic!")
