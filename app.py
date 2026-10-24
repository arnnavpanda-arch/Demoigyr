import os
import sys
# Add the current directory to sys.path so Vercel can find the modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import get_db
from email_service import send_email, send_email_with_attachment, send_email_ex
from pdf_generator import generate_offer_letter_pdf
import random
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

class VercelFix:
    def __init__(self, app):
        self.app = app
    def __call__(self, environ, start_response):
        import urllib.parse
        qs = environ.get('QUERY_STRING', '')
        params = urllib.parse.parse_qs(qs, keep_blank_values=True)
        if 'orig' in params:
            environ['PATH_INFO'] = params['orig'][0]
            new_params = {k: v for k, v in params.items() if k != 'orig'}
            environ['QUERY_STRING'] = urllib.parse.urlencode(new_params, doseq=True)
        return self.app(environ, start_response)

app.wsgi_app = VercelFix(app.wsgi_app)


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    import os
    from flask import send_from_directory, send_file
    
    base = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(base)
    
    if path == '' or path == '/':
        path = 'index.html'
        
    req_path = os.path.join(root_dir, path)
    if os.path.exists(req_path):
        return send_from_directory(root_dir, path)
        
    files = os.listdir(root_dir) if os.path.exists(root_dir) else []
    return f"<h1>File Not Found</h1><p>Tried to load: {path}</p><p>Files available in Lambda: {files}</p>", 404










@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500





# Temporary in-memory store for OTPs (In a real app, use Redis or MongoDB with TTL)
# Format: { "email@test.com": { "otp": "1234", "expires": timestamp } }
otp_store = {}

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/institutes/resend-receipt', methods=['POST'])
def resend_receipt():
    from email_service import send_email
    data = request.json
    email = data.get('email', '').strip().lower()
    txn_id = data.get('txn_id', '')
    
    db = get_db()
    inst = db['institutes'].find_one({"email": email})
    if not inst:
        return jsonify({"error": "Institute not found"}), 404
        
    inst_name = inst.get("institute", {}).get("name", "Institute")
    
    txn = None
    phase_name = "Payment Phase"
    
    if "payments" in inst and "transactions" in inst["payments"]:
        for t in inst["payments"]["transactions"]:
            if t.get("id") == txn_id:
                txn = t
                break
                
    if not txn:
        return jsonify({"error": "Transaction not found"}), 404
        
    if "payments" in inst and "phases" in inst["payments"]:
        for p in inst["payments"]["phases"]:
            if p.get("id") == txn.get("phase_id"):
                phase_name = p.get("name", phase_name)
                break
                
    amount = txn.get("amount", 0)
    
    subject = f"Official Payment Receipt: INR {amount}"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0;">Payment Receipt (Copy)</h2>
        </div>
        <div style="padding: 20px;">
            <p>Dear <b>{inst_name}</b>,</p>
            <p>This is a copy of the receipt for your payment.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><b>Receipt ID:</b> {txn_id}</p>
                <p style="margin: 5px 0;"><b>Amount Paid:</b> INR {amount}</p>
                <p style="margin: 5px 0;"><b>Towards:</b> {phase_name}</p>
                <p style="margin: 5px 0;"><b>Date:</b> {txn.get('date', '')}</p>
                <p style="margin: 5px 0;"><b>Status:</b> <span style="color: #10b981; font-weight: bold;">SUCCESS</span></p>
            </div>
            <p>If you have any questions, please contact our support team.</p>
            <p>Thank you,<br><b>India Get Your Result (IGYR)</b></p>
        </div>
    </div>
    """
    send_email(email, subject, body)
    
    return jsonify({"message": "Receipt resent"}), 200

@app.route('/api/auth/send-code', methods=['POST'])
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
                return jsonify({"error": "Your request is under processing waiting.................."}), 400
            else:
                return jsonify({"error": "Email already registered. Please sign in."}), 400
    elif mode == 'login':
        if not inst:
            return jsonify({"error": "Email not registered. Please create an account."}), 400
        if inst.get('status') == 'pending':
            return jsonify({"error": "Your account is still under review. Please wait for the approval email to sign in."}), 400
    
    otp = str(random.randint(1000, 9999))
    otp_store[email] = otp
    
    body_html = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4F46E5; text-align: center;">Your Verification Code</h2>
        <p>You requested to sign in or register at <strong>India Get Your Result</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
            {otp}
        </div>
        <p style="font-size: 12px; color: #666; text-align: center;">If you didn't request this, please ignore this email.</p>
    </div>
    """
    
    success = send_email(email, "India Get Your Result - Login Code", body_html)
    
    if success:
        return jsonify({"message": "Verification code sent to email"}), 200
    else:
        return jsonify({"error": "Failed to send email. Please check the email address."}), 500

@app.route('/api/auth/verify', methods=['POST'])
def verify_code():
    data = request.json
    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()
    is_new_user = data.get('isNewUser', False)
    
    db = get_db()
    institutes_col = db['institutes']
    
    # Bypass OTP if it's 1234 just for testing locally if SMTP blocks us (optional, good for dev)
    # But let's enforce real OTP here since that's what the user wants!
    if email in otp_store and otp_store[email] == code:
        del otp_store[email] # Clear OTP after successful use
        
        # Check if they exist in DB
        existing_inst = institutes_col.find_one({"email": email})
        
        if is_new_user:
            if existing_inst:
                return jsonify({"error": "This email is already registered. Please switch to Sign In."}), 400
            return jsonify({"status": "verified", "message": "Code verified, please proceed to setup profile."}), 200
        else:
            if not existing_inst:
                return jsonify({"error": "Not registered or account was removed by admin."}), 404
            
            # Return current status so frontend knows where to route
            return jsonify({
                "status": existing_inst.get('status', 'pending'),
                "message": "Login successful"
            }), 200
    
    return jsonify({"error": "Invalid or expired verification code."}), 400

@app.route('/api/institutes/register', methods=['POST'])
def register_institute():
    data = request.json
    email = data.get('email', '').strip().lower()
    
    db = get_db()
    institutes_col = db['institutes']
    
    import random
    igyr_id = "IGYR-" + str(random.randint(10000000, 99999999))
    
    # Overwrite if exists in rare case, or create new
    institute_doc = {
        "email": email,
        "igyr_id": igyr_id,
        "status": "pending",
        "institute": data.get('instituteData', {}),
        "created_at": datetime.utcnow()
    }
    
    institutes_col.update_one({"email": email}, {"$set": institute_doc}, upsert=True)
    
    # Send confirmation email to user
    send_email(email, "Registration Received - India Get Your Result", 
        "<h3>Registration Received</h3><p>Your institution details have been received and are now under review by the Admin Team.</p>")
    
    return jsonify({"message": "Registration successful, pending admin approval"}), 200

@app.route('/api/institutes/status', methods=['GET'])
def get_status():
    email = request.args.get('email', '').strip().lower()
    
    db = get_db()
    inst = db['institutes'].find_one({"email": email})
    
    if not inst:
        return jsonify({"error": "Not found"}), 404
        
    # Send back necessary data without MongoDB _id object
    return jsonify({
        "status": inst.get("status"),
        "email": inst.get("email"),
        "institute": inst.get("institute", {}),
        "igyr_id": inst.get("igyr_id", ""),
        "details": inst.get("details"),
        "tabulation_file": inst.get("tabulation_file"),
        "history": inst.get("history", []),
        "payments": inst.get("payments", {}),
        "rejection_reason": inst.get("rejection_reason", "")
    }), 200

@app.route('/api/institutes/order', methods=['POST'])
def create_order():
    data = request.json
    email = data.get('email', '').strip().lower()
    details = data.get('resultDetails', {})
    
    db = get_db()
    institutes_col = db['institutes']
    
    # Change status to 'order_placed' (pending admin format approval)
    result = institutes_col.update_one(
        {"email": email},
        {"$set": {
            "status": "order_placed", 
            "details": details,
            "payments": {"total": 0, "paid": 0, "phases": []},
            "documents": []
        }}
    )
    
    if result.matched_count == 0:
        return jsonify({"error": "Account not found"}), 404
        
    return jsonify({"message": "Order placed, pending admin format approval"}), 200

# NEW ROUTES FOR UPLOADS AND PAYMENTS
from werkzeug.utils import secure_filename
import os

UPLOAD_FOLDER = '/tmp/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/institutes/upload', methods=['POST'])
def upload_document():
    import os
    email = request.form.get('email', '').strip().lower()
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    from werkzeug.utils import secure_filename
    filename = secure_filename(email + "_" + file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    # 1. Save temporarily to attach to email
    file.save(filepath)
    
    db = get_db()
    inst = db['institutes'].find_one({"email": email})
    inst_name = inst.get('institute', {}).get('name', email) if inst else email
    
    # 2. Update status to processing (DO NOT store the document in DB)
    db['institutes'].update_one(
        {"email": email},
        {
            "$set": {"status": "processing"}
        }
    )
    
    # 3. Send the uploaded data directly to the company inbox!
    from email_service import send_email_with_attachment
    company_email = 'indiagetyourresult@gmail.com'
    subject = f"Secure Data Upload: {inst_name}"
    body = f"<h3>Secure Data Received</h3><p>Institute: <b>{inst_name}</b> ({email})</p><p>Please find the attached data files. This file was NOT stored in the database for security purposes.</p>"
    
    success = send_email_with_attachment(company_email, subject, body, filepath)
    
    # 4. Delete the temporary file from the server so it is completely secure and only in email
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print("Could not delete temp file:", e)
    
    if success:
        return jsonify({"message": "File uploaded securely to email!"}), 200
    else:
        # Revert status if email failed
        db['institutes'].update_one({"email": email}, {"$set": {"status": "documents_required"}})
        return jsonify({"error": "Failed to send email. Please try again."}), 500

@app.route('/api/admin/approve-format', methods=['POST'])
def admin_approve_format():
    from datetime import datetime
    data = request.json
    email = data.get('email', '').strip().lower()
    
    db = get_db()
    institutes_col = db['institutes']
    inst = institutes_col.find_one({"email": email})
    
    if not inst:
        return jsonify({"error": "Institute not found"}), 404
        
    # Calculate automated bill
    pricing = db['config'].find_one({"type": "pricing"}) or {"normal": 50, "excel": 100, "both": 150}
    
    details = inst.get("details", {})
    option = details.get("option", "normal")
    try:
        students = int(details.get("totalStudents", 0))
    except ValueError:
        students = 0
        
    try:
        subjects = int(details.get("totalSubjects", 0))
    except ValueError:
        subjects = 0
        
    price_per = None
    formats = pricing.get("formats", [])
    if isinstance(formats, list):
        for f in formats:
            if isinstance(f, dict) and f.get("name", "").strip().lower() == option.strip().lower():
                price_per = f.get("rate")
                break
    if price_per is None:
        price_per = pricing.get(option, 50)
    try:
        price_per = float(price_per)
    except (ValueError, TypeError):
        price_per = 50.0
    subject_rate = float(pricing.get("subject_rate", 0))
    
    # Calculate base student cost + subject add-on cost
    total_bill = (students * price_per) + (subjects * subject_rate)
    
    phase = {
        "id": "phase_" + str(int(datetime.utcnow().timestamp())),
        "name": "Phase 1: Initial Billing (Format Approved)",
        "debited": total_bill,
        "credited": 0,
        "date": datetime.utcnow().isoformat()
    }
    
    # Change status to documents_required AND inject automated bill
    institutes_col.update_one(
        {"email": email},
        {
            "$set": {"status": "documents_required"},
            "$push": {"payments.phases": phase}
        }
    )
    
    body = f"<p>Great news! Your requested format has been approved.</p>"
    body += f"<p>Based on your order of {students} students ({option.upper()} format), an initial bill of <b>Rs. {total_bill}</b> has been generated on your dashboard.</p>"
    body += f"<p>Please log in to your dashboard to view payment details and upload your student data files securely.</p>"
    
    send_email(email, "Format Approved - Action Required", body)
    
    return jsonify({"message": "Format approved and initial bill generated successfully"}), 200

@app.route('/api/admin/add-phase', methods=['POST'])
def admin_add_phase():
    from datetime import datetime
    data = request.json
    email = data.get('email', '').strip().lower()
    name = data.get('name', 'New Phase')
    amount = data.get('amount', 0)
    
    db = get_db()
    phase = {
        "id": "phase_" + str(int(datetime.utcnow().timestamp())),
        "name": name,
        "debited": amount,
        "credited": 0,
        "date": datetime.utcnow().isoformat()
    }
    
    db['institutes'].update_one(
        {"email": email},
        {"$push": {"payments.phases": phase}}
    )
    
    return jsonify({"message": "Phase created"}), 200

@app.route('/api/admin/credit-phase', methods=['POST'])
def admin_credit_phase():
    from email_service import send_email
    data = request.json
    email = data.get('email', '').strip().lower()
    phase_id = data.get('phase_id', '')
    amount = data.get('amount', 0)
    
    db = get_db()
    
    from datetime import datetime
    txn = {
        "id": "txn_" + str(int(datetime.utcnow().timestamp())),
        "phase_id": phase_id,
        "amount": amount,
        "date": datetime.utcnow().isoformat()
    }

    db['institutes'].update_one(
        {"email": email, "payments.phases.id": phase_id},
        {
            "$inc": {"payments.phases.$.credited": amount},
            "$push": {"payments.transactions": txn}
        }
    )
    
    inst = db['institutes'].find_one({"email": email})
    phase_name = "Payment Phase"
    inst_name = "Institute"
    if inst:
        inst_name = inst.get("institute", {}).get("name", "Institute")
        if "payments" in inst:
            for p in inst["payments"].get("phases", []):
                if p["id"] == phase_id:
                    phase_name = p.get("name", phase_name)
                    break
    
    if amount > 0:
        subject = f"Official Payment Receipt: INR {amount}"
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0;">Payment Receipt</h2>
            </div>
            <div style="padding: 20px;">
                <p>Dear <b>{inst_name}</b>,</p>
                <p>We acknowledge with thanks the receipt of your payment.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><b>Amount Paid:</b> INR {amount}</p>
                    <p style="margin: 5px 0;"><b>Towards:</b> {phase_name}</p>
                    <p style="margin: 5px 0;"><b>Status:</b> <span style="color: #10b981; font-weight: bold;">SUCCESS</span></p>
                </div>
                <p>If you have any questions, please contact our support team.</p>
                <p>Thank you,<br><b>India Get Your Result (IGYR)</b></p>
            </div>
        </div>
        """
        send_email(email, subject, body)
    
    return jsonify({"message": "Credit added and receipt emailed"}), 200

@app.route('/api/admin/send-verification', methods=['POST'])
def admin_send_verification():
    data = request.json
    email = data.get('email', '').strip().lower()
    
    db = get_db()
    db['institutes'].update_one({"email": email}, {"$set": {"status": "verification_pending"}})
    
    send_email(email, "Verify Your Tabulation Register", "<p>Please log in to your dashboard to verify the draft tabulation register before we publish the results tomorrow.</p>")
    return jsonify({"message": "Verification request sent"}), 200

@app.route('/api/institutes/verify-response', methods=['POST'])
def client_verify_response():
    data = request.json
    email = data.get('email', '').strip().lower()
    response = data.get('response') # 'approve' or 'reject'
    reason = data.get('reason', '')
    
    db = get_db()
    if response == 'reject':
        db['institutes'].update_one({"email": email}, {"$set": {"status": "processing", "rejection_reason": reason}})
        # Could email admin here
    else:
        inst = db['institutes'].find_one({"email": email})
        history_item = {
            "date": datetime.utcnow().isoformat(),
            "details": inst.get("details", {}),
            "payments": inst.get("payments", {}),
            "documents": inst.get("documents", []),
            "tabulation_file": inst.get("tabulation_file", "")
        }
        db['institutes'].update_one(
            {"email": email}, 
            {
                "$set": {
                    "status": "ready_to_publish"
                }
            }
        )
        
    return jsonify({"message": "Response recorded"}), 200


# ----------------- ADMIN ROUTES -----------------

@app.route('/api/admin/publish', methods=['POST'])
def admin_publish():
    data = request.json
    email = data.get('email', '').strip().lower()
    
    db = get_db()
    inst = db['institutes'].find_one({"email": email})
    if not inst:
        return jsonify({"error": "Institute not found"}), 404
        
    db['institutes'].update_one(
        {"email": email}, 
        {
            "$set": {
                "status": "published"
            }
        }
    )
    send_email(email, "Congratulations! Results Published", "<p>Your results have been officially published! You can now view all your data on your dashboard.</p>")
    
    # Smart Payment Reminder
    payments = inst.get('payments', {})
    total_billed = float(payments.get('total', 0))
    total_paid = float(payments.get('paid', 0))
    balance = total_billed - total_paid
    
    if balance > 0:
        config = db['config'].find_one({"type": "pricing"}) or {}
        account = config.get("bank_account", "Not provided")
        ifsc = config.get("ifsc", "Not provided")
        phone = config.get("phone", "Not provided")
        
        # Format balance to Indian comma format if possible, or just .2f
        formatted_balance = f"₹{balance:,.2f}"
        
        email_body = f"""
        <p style="font-size: 16px;">Dear <strong>{inst.get('institute', {}).get('name', 'Institute')}</strong>,</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #b45309; font-size: 15px;">
                Your results have been successfully published, but our records indicate a pending balance of <strong style="font-size: 18px;">{formatted_balance}</strong> on your account.
            </p>
        </div>
        
        <p>Please clear this remaining balance at your earliest convenience to avoid any service interruptions.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 25px;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Official Payment Details</h3>
            <table style="width: 100%; font-size: 14px;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 40%;"><strong>Bank Account:</strong></td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">{account}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; border-top: 1px dashed #cbd5e1;"><strong>IFSC Code:</strong></td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600; border-top: 1px dashed #cbd5e1;">{ifsc}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; border-top: 1px dashed #cbd5e1;"><strong>Phone / UPI:</strong></td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600; border-top: 1px dashed #cbd5e1;">{phone}</td>
                </tr>
            </table>
        </div>
        
        <p style="margin-top: 25px;">Thank you for choosing IGYR!</p>
        """
        send_email(email, "Action Required: Pending Payment Reminder", email_body)
    return jsonify({"message": "Results published successfully"}), 200


@app.route('/api/admin/institutes', methods=['GET'])
def admin_get_all():
    # In a real app, verify admin session/token here
    db = get_db()
    institutes_col = db['institutes']
    
    all_insts = list(institutes_col.find({}, {"_id": 0}).sort("email", 1)) # exclude objectId
    return jsonify(all_insts), 200

@app.route('/api/admin/status', methods=['POST'])
def admin_update_status():
    data = request.json
    email = data.get('email', '').strip().lower()
    new_status = data.get('status')
    
    db = get_db()
    institutes_col = db['institutes']
    
    if new_status == 'rejected':
        institutes_col.delete_one({"email": email})
        send_email(email, "Registration Rejected", "<p>We're sorry, your registration to India Get Your Result was rejected by the admin. Please log in and Newly Create account and submit your details and reapply.</p>")
    else:
        institutes_col.update_one({"email": email}, {"$set": {"status": new_status}})
        if new_status == 'approved':
            send_email(email, "Registration Approved!", "<p>Congratulations! Your institution account has been approved. You can now log in and submit results.</p>")
            
    return jsonify({"message": "Status updated successfully"}), 200

@app.route('/api/admin/remove', methods=['DELETE'])
def admin_remove():
    email = request.args.get('email', '').strip().lower()
    
    db = get_db()
    db['institutes'].delete_one({"email": email})
    
    send_email(email, "Account Removed", "<p>Your institution account has been removed from the India Get Your Result hub.</p>")
    
    return jsonify({"message": "Account removed successfully"}), 200

@app.route('/api/admin/mark-task-done', methods=['POST'])
def admin_mark_task_done():
    data = request.json
    email = data.get('email', '').strip().lower()
    
    db = get_db()
    institutes_col = db['institutes']
    
    inst = institutes_col.find_one({"email": email})
    if not inst: return jsonify({"error": "Not found"}), 404
    
    history_item = {
        "date": datetime.utcnow().isoformat(),
        "details": inst.get("details", {}),
        "payments": inst.get("payments", {}),
        "documents": inst.get("documents", []),
        "tabulation_file": inst.get("tabulation_file", "")
    }
    
    institutes_col.update_one(
        {"email": email},
        {
            "$set": {
                "status": "approved",
                "details": {},
                "payments": {"total": 0, "paid": 0, "phases": []},
                "documents": [],
                "tabulation_file": ""
            },
            "$push": {"history": history_item}
        }
    )
    
    send_email(email, "Order Fully Completed!", "<p>Your payments are cleared and your order has been fully closed and archived. You can now submit new results.</p>")
    
    return jsonify({"message": "Task marked as completed and archived"}), 200


@app.route('/api/pricing', methods=['GET'])
def get_pricing():
    db = get_db()
    pricing = db['config'].find_one({"type": "pricing"})
    default_formats = [
        {"name": "Normal Tabulation", "rate": 50},
        {"name": "Excel Sheet", "rate": 100},
        {"name": "Admit card + Any type of Tabulation", "rate": 150}
    ]
    if not pricing:
        return jsonify({
            "formats": default_formats,
            "normal": 50, 
            "excel": 100, 
            "both": 150, 
            "subject_rate": 0,
            "bank_account": "", 
            "ifsc": "", 
            "phone": "",
            "message": ""
        }), 200
        
    formats = pricing.get("formats")
    if not formats or not isinstance(formats, list) or len(formats) == 0:
        formats = [
            {"name": "Normal Tabulation", "rate": int(pricing.get("normal", 50))},
            {"name": "Excel Sheet", "rate": int(pricing.get("excel", 100))},
            {"name": "Admit card + Any type of Tabulation", "rate": int(pricing.get("both", 150))}
        ]
        
    return jsonify({
        "formats": formats,
        "normal": pricing.get("normal", 50),
        "excel": pricing.get("excel", 100),
        "both": pricing.get("both", 150),
        "subject_rate": pricing.get("subject_rate", 0),
        "bank_account": pricing.get("bank_account", ""),
        "ifsc": pricing.get("ifsc", ""),
        "phone": pricing.get("phone", ""),
        "message": pricing.get("message", "")
    }), 200

@app.route('/api/admin/pricing', methods=['POST'])
def update_pricing():
    data = request.json or {}
    db = get_db()
    
    raw_formats = data.get("formats", [])
    cleaned_formats = []
    if isinstance(raw_formats, list):
        for f in raw_formats:
            if isinstance(f, dict) and f.get("name"):
                name = str(f.get("name")).strip()
                try:
                    rate = float(f.get("rate", 0))
                    rate = int(rate) if rate.is_integer() else rate
                except (ValueError, TypeError):
                    rate = 0
                if name:
                    cleaned_formats.append({"name": name, "rate": rate})
                    
    if not cleaned_formats:
        cleaned_formats = [
            {"name": "Normal Tabulation", "rate": int(data.get("normal", 50))},
            {"name": "Excel Sheet", "rate": int(data.get("excel", 100))},
            {"name": "Admit card + Any type of Tabulation", "rate": int(data.get("both", 150))}
        ]

    normal_val = cleaned_formats[0]["rate"] if len(cleaned_formats) > 0 else int(data.get("normal", 50))
    excel_val = cleaned_formats[1]["rate"] if len(cleaned_formats) > 1 else int(data.get("excel", 100))
    both_val = cleaned_formats[2]["rate"] if len(cleaned_formats) > 2 else int(data.get("both", 150))
    
    try:
        subject_rate = int(data.get("subject_rate", 0))
    except (ValueError, TypeError):
        subject_rate = 0

    db['config'].update_one(
        {"type": "pricing"},
        {"$set": {
            "formats": cleaned_formats,
            "normal": normal_val,
            "excel": excel_val,
            "both": both_val,
            "subject_rate": subject_rate,
            "bank_account": data.get("bank_account", ""),
            "ifsc": data.get("ifsc", ""),
            "phone": data.get("phone", ""),
            "message": data.get("message", "")
        }},
        upsert=True
    )
    return jsonify({"message": "Pricing updated", "formats": cleaned_formats}), 200


@app.route('/api/files/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/admin/upload-tabulation', methods=['POST'])
def admin_upload_tabulation():
    import os
    from werkzeug.utils import secure_filename
    from email_service import send_email_with_attachment
    
    email = request.form.get('email', '').strip().lower()
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    filename = secure_filename("tab_" + email + "_" + file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    # 1. Update status to verification_pending (DO NOT save file in DB)
    db = get_db()
    db['institutes'].update_one(
        {"email": email},
        {"$set": {
            "status": "verification_pending",
            "tabulation_file": ""
        }}
    )
    
    # 2. Email the tabulation register directly to the institute
    subject = "Action Required: Verify Your Tabulation Register"
    body = "<p>Your Draft Tabulation Register is ready!</p><p>Please find the attached document for your review. Once you have reviewed it, log back into your portal dashboard and click 'Approve & Publish' to finalize the process.</p>"
    
    success = send_email_with_attachment(email, subject, body, filepath)
    
    # 3. Delete temporary file from server
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print("Could delete temp file:", e)
        
    if success:
        return jsonify({"message": "Tabulation uploaded and verification requested via email"}), 200
    else:
        # Revert status
        db['institutes'].update_one({"email": email}, {"$set": {"status": "processing"}})
        return jsonify({"error": "Failed to send email to client."}), 500


@app.route('/api/admin/reject-order', methods=['POST'])
def admin_reject_order():
    data = request.json
    email = data.get('email', '').strip().lower()
    reason = data.get('reason', 'No reason provided')
    
    db = get_db()
    db['institutes'].update_one(
        {"email": email},
        {"$set": {
            "status": "order_rejected",
            "rejection_reason": reason
        }}
    )
    
    email_body = f"<p>Unfortunately, your requested result format and order details have been rejected by the admin.</p><p><strong>Reason:</strong> {reason}</p><p>Please log in to your dashboard to review this and submit a new request if applicable.</p>"
    send_email(email, "Order Request Rejected", email_body)
    
    return jsonify({"message": "Order rejected successfully"}), 200

@app.route('/api/institutes/reapply', methods=['POST'])
def client_reapply():
    data = request.json
    email = data.get('email', '').strip().lower()
    
    db = get_db()
    db['institutes'].update_one(
        {"email": email},
        {"$set": {
            "status": "approved",
            "details": {},
            "rejection_reason": ""
        }}
    )
    
    return jsonify({"message": "Re-apply allowed"}), 200


# ==========================================
# EMAIL CENTRE MODULE - SUPER ADMIN PANEL
# ==========================================

import time
import uuid
import re
from bson.objectid import ObjectId

OFFER_LETTERS_FOLDER = os.path.join(UPLOAD_FOLDER, 'offer_letters')
os.makedirs(OFFER_LETTERS_FOLDER, exist_ok=True)

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')

def text_to_html(text):
    if not text:
        return ""
    # Automatically convert normal plain text newlines into clean HTML paragraphs
    if not ("<p" in text or "<div" in text or "<br" in text or "<table" in text):
        paras = text.strip().split("\n\n")
        formatted_paras = []
        for p in paras:
            p_clean = p.replace("\n", "<br>")
            formatted_paras.append(f"<p style='margin: 0 0 14px 0; line-height: 1.6;'>{p_clean}</p>")
        return "".join(formatted_paras)
    return text


def is_valid_email(email):
    return bool(email and isinstance(email, str) and EMAIL_REGEX.match(email.strip()))

@app.route('/api/admin/email-centre/stats', methods=['GET'])
def get_email_centre_stats():
    db = get_db()
    institutes_col = db['institutes']
    logs_col = db['email_logs']
    
    total_institutes = institutes_col.count_documents({"status": {"$nin": ["removed"]}})
    total_sent = logs_col.count_documents({})
    delivered = logs_col.count_documents({"status": "Delivered"})
    failed = logs_col.count_documents({"status": "Failed"})
    
    return jsonify({
        "total_institutes": total_institutes,
        "total_sent": total_sent,
        "delivered": delivered,
        "failed": failed
    }), 200

@app.route('/api/admin/email-centre/send-institutes', methods=['POST'])
def email_centre_send_institutes():
    db = get_db()
    institutes_col = db['institutes']
    logs_col = db['email_logs']

    # Support both multipart form data (with optional attachment) and JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        recipients_type = request.form.get('recipients_type', 'all')
        selected_emails_raw = request.form.get('selected_emails', '')
        subject = request.form.get('subject', '').strip()
        message_html = request.form.get('message', '').strip()
        show_logo = request.form.get('show_logo', 'true').lower() == 'true'
        signature = request.form.get('signature', '').strip()
        
        attachment_file = request.files.get('attachment')
        attachment_bytes = None
        attachment_filename = None
        if attachment_file and attachment_file.filename:
            attachment_filename = secure_filename(attachment_file.filename)
            attachment_bytes = attachment_file.read()
    else:
        data = request.json or {}
        recipients_type = data.get('recipients_type', 'all')
        selected_emails_raw = data.get('selected_emails', [])
        subject = data.get('subject', '').strip()
        message_html = data.get('message', '').strip()
        show_logo = bool(data.get('show_logo', True))
        signature = data.get('signature', '').strip()
        attachment_bytes = None
        attachment_filename = None

    if not subject:
        return jsonify({"error": "Email subject is required"}), 400
    if not message_html:
        return jsonify({"error": "Email message is required"}), 400

    # Determine recipient institutes from database
    recipients = []
    if recipients_type == 'all':
        query = {"status": {"$nin": ["removed"]}}
        cursor = institutes_col.find(query, {"email": 1, "institute": 1})
        for doc in cursor:
            em = doc.get("email", "").strip().lower()
            if is_valid_email(em):
                recipients.append({
                    "email": em,
                    "name": doc.get("institute", {}).get("name", "Institute Partner")
                })
    else:
        # Selected emails
        if isinstance(selected_emails_raw, str):
            email_list = [e.strip().lower() for e in selected_emails_raw.split(',') if e.strip()]
        else:
            email_list = [str(e).strip().lower() for e in selected_emails_raw if str(e).strip()]
        
        # Deduplicate
        email_list = list(dict.fromkeys(email_list))
        cursor = institutes_col.find({"email": {"$in": email_list}}, {"email": 1, "institute": 1})
        found_map = {doc["email"].strip().lower(): doc.get("institute", {}).get("name", "Institute Partner") for doc in cursor if "email" in doc}
        
        for em in email_list:
            if is_valid_email(em):
                recipients.append({
                    "email": em,
                    "name": found_map.get(em, "Institute Partner")
                })

    if not recipients:
        return jsonify({"error": "No valid recipients found"}), 400

    results = []
    sent_count = 0
    fail_count = 0

    for r in recipients:
        email = r["email"]
        name = r["name"]
        
        # Individualized personalized message support
        personalized_body = text_to_html(message_html.replace("{{institute_name}}", name).replace("{{email}}", email))
        
        success, status_msg = send_email_ex(
            to_email=email,
            subject=subject,
            body_html=personalized_body,
            attachment_bytes=attachment_bytes,
            filename=attachment_filename,
            show_logo=show_logo,
            signature=signature if signature else None
        )
        
        status_str = "Delivered" if success else "Failed"
        if success:
            sent_count += 1
        else:
            fail_count += 1
            
        log_entry = {
            "mode": "Institutes Announcement",
            "recipient_name": name,
            "recipient_email": email,
            "subject": subject,
            "status": status_str,
            "failure_reason": "" if success else status_msg,
            "has_attachment": bool(attachment_filename),
            "timestamp": datetime.utcnow()
        }
        logs_col.insert_one(log_entry)
        results.append({"email": email, "status": status_str})
        
        # Small delay between dispatches to respect SMTP limits
        time.sleep(0.15)

    return jsonify({
        "message": f"Bulk email dispatch completed: {sent_count} sent, {fail_count} failed",
        "total": len(recipients),
        "sent": sent_count,
        "failed": fail_count,
        "results": results
    }), 200

@app.route('/api/admin/email-centre/preview-offer-pdf', methods=['POST'])
def email_centre_preview_offer_pdf():
    data = request.json or {}
    employee_name = data.get('employee_name', 'Employee Name').strip()
    position = data.get('position', 'Job Position').strip()
    template = data.get('template', 'corporate')
    
    try:
        pdf_bytes = generate_offer_letter_pdf(data, template=template)
        from flask import Response
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-Disposition": f"inline; filename=Offer_Letter_{secure_filename(employee_name)}.pdf"}
        )
    except Exception as e:
        return jsonify({"error": f"Failed to generate PDF preview: {str(e)}"}), 500

@app.route('/api/admin/email-centre/send-offer-letter', methods=['POST'])
def email_centre_send_offer_letter():
    data = request.json or {}
    employee_name = data.get('employee_name', '').strip()
    employee_email = data.get('employee_email', '').strip().lower()
    position = data.get('position', '').strip()
    template = data.get('template', 'corporate')
    
    # 1. Validation
    if not employee_name:
        return jsonify({"error": "Employee Full Name is required"}), 400
    if not employee_email or not is_valid_email(employee_email):
        return jsonify({"error": "A valid Employee Email Address is required"}), 400
    if not position:
        return jsonify({"error": "Offered Job Position is required"}), 400

    db = get_db()
    logs_col = db['email_logs']
    offers_col = db['offer_letters']

    # 2. Generate PDF
    try:
        clean_name = secure_filename(employee_name).replace(' ', '_')
        pdf_filename = f"Offer_Letter_{int(time.time())}_{clean_name}.pdf"
        pdf_filepath = os.path.join(OFFER_LETTERS_FOLDER, pdf_filename)
        
        generate_offer_letter_pdf(data, template=template, output_path=pdf_filepath)
        with open(pdf_filepath, 'rb') as f:
            pdf_bytes = f.read()
    except Exception as e:
        return jsonify({"error": f"Failed to generate Offer Letter PDF: {str(e)}"}), 500

    # 3. Create professional email content
    company_name = data.get('company_name', 'IGYR - India Get Your Result')
    deadline = data.get('deadline', '')
    joining_date = data.get('joining_date', '')
    salary = data.get('salary', '')
    custom_message = data.get('custom_email_body', '').strip()
    
    subject = f"Official Job Offer Letter – {employee_name} – {position}"
    
    if custom_message:
        email_content = custom_message
    else:
        email_content = f"""
        <p style="font-size: 16px; margin-bottom: 12px;">Dear <strong>{employee_name}</strong>,</p>
        <p style="font-size: 16px; color: #15803d; font-weight: bold; margin-bottom: 12px;">Congratulations!</p>
        <p>We are pleased to officially offer you the position of <strong>{position}</strong> at <strong>{company_name}</strong>.</p>
        <p>Please find your official offer letter attached to this email. It contains the comprehensive terms of your position, compensation package, joining date, and employment conditions.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 14px; text-transform: uppercase;">Key Offer Details:</h4>
            <p style="margin: 4px 0;">• <strong>Position:</strong> {position}</p>
            <p style="margin: 4px 0;">• <strong>Department:</strong> {data.get('department', 'Operations')}</p>
            <p style="margin: 4px 0;">• <strong>Compensation:</strong> {salary if salary else 'As detailed in offer letter'}</p>
            <p style="margin: 4px 0;">• <strong>Date of Joining:</strong> {joining_date if joining_date else 'To be scheduled'}</p>
            {f'<p style="margin: 4px 0; color: #b91c1c;">• <strong>Acceptance Deadline:</strong> {deadline}</p>' if deadline else ''}
        </div>

        <p>Kindly review the attached offer letter carefully and confirm your formal acceptance by replying to this email with the signed copy by <strong>{deadline if deadline else 'the stipulated deadline'}</strong>.</p>
        
        <p>We look forward to welcoming you to our team!</p>
        """

    signature_html = f"""
        <strong>HR & Recruitment Department</strong><br>
        {company_name}<br>
        <span style="color: #6b7280; font-size: 12px;">Confidential Recruitment Notice</span>
    """

    # 4. Dispatch Email with PDF attachment
    success, status_msg = send_email_ex(
        to_email=employee_email,
        subject=subject,
        body_html=email_content,
        attachment_bytes=pdf_bytes,
        filename=f"Offer_Letter_{clean_name}.pdf",
        show_logo=True,
        signature=signature_html
    )

    status_str = "Delivered" if success else "Failed"

    # 5. Store record in offer_letters collection
    offer_doc = {
        "employee_name": employee_name,
        "employee_email": employee_email,
        "employee_phone": data.get('employee_phone', ''),
        "position": position,
        "department": data.get('department', ''),
        "company_name": company_name,
        "location": data.get('location', ''),
        "salary": salary,
        "joining_date": joining_date,
        "deadline": deadline,
        "template": template,
        "pdf_filename": pdf_filename,
        "status": status_str,
        "failure_reason": "" if success else status_msg,
        "created_at": datetime.utcnow()
    }
    inserted = offers_col.insert_one(offer_doc)

    # 6. Store record in email_logs collection
    log_entry = {
        "mode": "Employee Offer Letter",
        "recipient_name": employee_name,
        "recipient_email": employee_email,
        "subject": subject,
        "status": status_str,
        "failure_reason": "" if success else status_msg,
        "offer_letter_id": str(inserted.inserted_id),
        "has_attachment": True,
        "timestamp": datetime.utcnow()
    }
    logs_col.insert_one(log_entry)

    if not success:
        return jsonify({"error": f"Offer letter generated, but email delivery failed: {status_msg}"}), 502

    return jsonify({
        "message": f"Offer letter generated and sent to {employee_email} successfully!",
        "offer_id": str(inserted.inserted_id),
        "pdf_url": f"/api/admin/email-centre/download-offer-pdf/{str(inserted.inserted_id)}"
    }), 200

@app.route('/api/admin/email-centre/download-offer-pdf/<letter_id>', methods=['GET'])
def email_centre_download_offer_pdf(letter_id):
    db = get_db()
    offers_col = db['offer_letters']
    
    try:
        offer = offers_col.find_one({"_id": ObjectId(letter_id)})
    except Exception:
        offer = None
        
    if not offer:
        return jsonify({"error": "Offer letter not found"}), 404
        
    pdf_filename = offer.get("pdf_filename")
    filepath = os.path.join(OFFER_LETTERS_FOLDER, pdf_filename)
    if not os.path.exists(filepath):
        # Regenerate on the fly if needed
        try:
            generate_offer_letter_pdf(offer, template=offer.get("template", "corporate"), output_path=filepath)
        except Exception:
            return jsonify({"error": "PDF file not found on server"}), 404

    return send_from_directory(
        OFFER_LETTERS_FOLDER,
        pdf_filename,
        as_attachment=True,
        download_name=f"Offer_Letter_{secure_filename(offer.get('employee_name', 'Employee'))}.pdf"
    )

@app.route('/api/admin/email-centre/send-custom-institutes', methods=['POST'])
def email_centre_send_custom_institutes():
    db = get_db()
    logs_col = db['email_logs']

    if request.content_type and 'multipart/form-data' in request.content_type:
        import json
        recipients_json = request.form.get('recipients', '[]')
        try:
            recipients = json.loads(recipients_json)
        except Exception:
            recipients = []
            
        send_type = request.form.get('type', 'template') # 'template' or 'custom'
        common_subject = request.form.get('subject', '').strip()
        common_message = request.form.get('message', '').strip()
        show_logo = request.form.get('show_logo', 'true').lower() == 'true'
        signature = request.form.get('signature', '').strip()
        
        attachment_file = request.files.get('attachment')
        attachment_bytes = None
        attachment_filename = None
        if attachment_file and attachment_file.filename:
            attachment_filename = secure_filename(attachment_file.filename)
            attachment_bytes = attachment_file.read()
    else:
        data = request.json or {}
        recipients = data.get('recipients', [])
        send_type = data.get('type', 'template')
        common_subject = data.get('subject', '').strip()
        common_message = data.get('message', '').strip()
        show_logo = bool(data.get('show_logo', True))
        signature = data.get('signature', '').strip()
        attachment_bytes = None
        attachment_filename = None

    if not recipients or not isinstance(recipients, list):
        return jsonify({"error": "At least one recipient institute must be selected"}), 400

    sent_count = 0
    fail_count = 0
    results = []

    for r in recipients:
        email = str(r.get('email', '')).strip().lower()
        name = str(r.get('name', 'Institute Partner')).strip()
        state = str(r.get('state', '')).strip()
        district = str(r.get('district', '')).strip()
        
        if not is_valid_email(email):
            continue

        if send_type == 'custom':
            sub = r.get('custom_subject', common_subject).strip() or common_subject
            body = r.get('custom_message', common_message).strip() or common_message
        else:
            sub = common_subject
            body = common_message

        # Replace placeholders
        body = text_to_html(body.replace("{{institute_name}}", name))
        body = body.replace("{{email}}", email)
        body = body.replace("{{state}}", state)
        body = body.replace("{{district}}", district)
        
        sub = sub.replace("{{institute_name}}", name)

        if not sub:
            sub = "Important Update from IGYR"

        success, status_msg = send_email_ex(
            to_email=email,
            subject=sub,
            body_html=body,
            attachment_bytes=attachment_bytes,
            filename=attachment_filename,
            show_logo=show_logo,
            signature=signature if signature else None
        )

        status_str = "Delivered" if success else "Failed"
        if success:
            sent_count += 1
        else:
            fail_count += 1

        log_entry = {
            "mode": "Custom Institute Message",
            "recipient_name": name,
            "recipient_email": email,
            "subject": sub,
            "status": status_str,
            "failure_reason": "" if success else status_msg,
            "has_attachment": bool(attachment_filename),
            "timestamp": datetime.utcnow()
        }
        logs_col.insert_one(log_entry)
        results.append({"email": email, "status": status_str})
        time.sleep(0.15)

    return jsonify({
        "message": f"Custom dispatch completed: {sent_count} sent, {fail_count} failed",
        "total": len(recipients),
        "sent": sent_count,
        "failed": fail_count,
        "results": results
    }), 200

@app.route('/api/admin/email-centre/history', methods=['GET'])
def email_centre_get_history():
    db = get_db()
    logs_col = db['email_logs']
    
    mode_filter = request.args.get('mode', '').strip()
    status_filter = request.args.get('status', '').strip()
    search = request.args.get('search', '').strip().lower()
    
    query = {}
    if mode_filter and mode_filter != 'all':
        query['mode'] = mode_filter
    if status_filter and status_filter != 'all':
        query['status'] = status_filter
    if search:
        query['$or'] = [
            {"recipient_name": {"$regex": search, "$options": "i"}},
            {"recipient_email": {"$regex": search, "$options": "i"}},
            {"subject": {"$regex": search, "$options": "i"}}
        ]

    limit = int(request.args.get('limit', 100))
    cursor = logs_col.find(query).sort("timestamp", -1).limit(limit)
    
    logs = []
    for doc in cursor:
        doc['id'] = str(doc.get('_id'))
        del doc['_id']
        if isinstance(doc.get('timestamp'), datetime):
            doc['timestamp'] = doc['timestamp'].strftime("%Y-%m-%d %H:%M:%S")
        logs.append(doc)

    return jsonify({"logs": logs}), 200

@app.route('/api/admin/email-centre/offer-letters', methods=['GET'])
def email_centre_get_offer_letters():
    db = get_db()
    offers_col = db['offer_letters']
    
    cursor = offers_col.find({}).sort("created_at", -1).limit(50)
    offers = []
    for doc in cursor:
        doc_id = str(doc.get('_id'))
        doc['id'] = doc_id
        doc['download_url'] = f"/api/admin/email-centre/download-offer-pdf/{doc_id}"
        del doc['_id']
        if isinstance(doc.get('created_at'), datetime):
            doc['created_at'] = doc['created_at'].strftime("%Y-%m-%d %H:%M:%S")
        offers.append(doc)

    return jsonify({"offers": offers}), 200


if __name__ == '__main__':
    # Initialize DB connection on startup
    get_db()
    app.run(host='0.0.0.0', port=5001, debug=True)
