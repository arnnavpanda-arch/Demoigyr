import re

with open('backend/app.py', 'r') as f:
    content = f.read()

old_logic = """    if mode == 'register':
        if inst:
            if inst.get('status') == 'pending':
                return jsonify({"error": "Your request is under processing waiting.................."}), 400
            else:
                return jsonify({"error": "Email already registered. Please sign in."}), 400"""

new_logic = """    if mode == 'register':
        if inst:
            if inst.get('status') == 'pending':
                return jsonify({"error": "Your request is under processing waiting.................."}), 400
            else:
                return jsonify({"error": "Email already registered. Please sign in."}), 400
    elif mode == 'login':
        if not inst:
            return jsonify({"error": "Email not registered. Please create an account."}), 400
        if inst.get('status') == 'pending':
            return jsonify({"error": "Your account is still under review. Please wait for the approval email to sign in."}), 400
        if inst.get('status') == 'rejected':
            return jsonify({"error": "Your registration was rejected. Please contact support."}), 400"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('backend/app.py', 'w') as f:
        f.write(content)
    print("Patched backend send-code login block")
else:
    print("Could not find backend logic")
