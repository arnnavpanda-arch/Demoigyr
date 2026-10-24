import re

with open('backend/app.py', 'r') as f:
    content = f.read()

old_logic = """@app.route('/api/auth/send-code', methods=['POST'])
def send_code():
    data = request.json
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
        
    otp = str(random.randint(1000, 9999))"""

new_logic = """@app.route('/api/auth/send-code', methods=['POST'])
def send_code():
    data = request.json
    email = data.get('email', '').strip().lower()
    mode = data.get('mode', 'login')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
        
    db = get_db()
    inst = db['institutes'].find_one({"email": email})
    
    if mode == 'register':
        if inst:
            if inst.get('status') == 'pending':
                return jsonify({"error": "Your request is under processing waiting..."}), 400
            else:
                return jsonify({"error": "Email already registered. Please sign in."}), 400
    
    otp = str(random.randint(1000, 9999))"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('backend/app.py', 'w') as f:
        f.write(content)
    print("Patched backend send-code")
else:
    print("Could not find backend logic")
