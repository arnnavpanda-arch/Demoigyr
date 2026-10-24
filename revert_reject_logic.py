import re

with open('backend/app.py', 'r') as f:
    content = f.read()

# 1. Fix send-code (Remove the rejected bypass, though since they are deleted, it doesn't strictly matter, but good for cleanup)
old_send_code = """    elif mode == 'login':
        if not inst:
            return jsonify({"error": "Email not registered. Please create an account."}), 400
        if inst.get('status') == 'pending':
            return jsonify({"error": "Your account is still under review. Please wait for the approval email to sign in."}), 400
        # If rejected, we allow them to log in so they can update details and reapply."""

new_send_code = """    elif mode == 'login':
        if not inst:
            return jsonify({"error": "Email not registered. Please create an account."}), 400
        if inst.get('status') == 'pending':
            return jsonify({"error": "Your account is still under review. Please wait for the approval email to sign in."}), 400"""

content = content.replace(old_send_code, new_send_code)

# 2. Fix admin_update_status to physically DELETE the account
old_admin = """    if new_status == 'rejected':
        institutes_col.update_one({"email": email}, {"$set": {"status": "rejected"}})
        send_email(email, "Registration Rejected", "<p>We're sorry, your registration to India Get Your Result was rejected by the admin. Please log in and Newly Create account and submit your details and reapply.</p>")"""

new_admin = """    if new_status == 'rejected':
        institutes_col.delete_one({"email": email})
        send_email(email, "Registration Rejected", "<p>We're sorry, your registration to India Get Your Result was rejected by the admin. Please log in and Newly Create account and submit your details and reapply.</p>")"""

content = content.replace(old_admin, new_admin)

with open('backend/app.py', 'w') as f:
    f.write(content)
print("Reverted reject logic to DELETE account!")
