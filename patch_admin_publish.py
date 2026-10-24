import re
with open('backend/app.py', 'r') as f:
    content = f.read()

old_block = """    if balance > 0:
        config = db['admin_config'].find_one({"_id": "pricing"}) or {}
        bank_details = config.get("bank_details", {})
        account = bank_details.get("account", "Not provided")
        ifsc = bank_details.get("ifsc", "Not provided")
        phone = bank_details.get("phone", "Not provided")
        
        email_body = f\"\"\"
        <p>Dear {inst.get('institute', {}).get('name', 'Institute')},</p>
        <p>Your results have been published, but our records indicate a pending balance of <strong>₹{balance}</strong> on your account.</p>
        <p>Please clear this remaining balance as soon as possible.</p>
        <h3>Official Payment Details:</h3>
        <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Bank Account:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{account}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>IFSC Code:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{ifsc}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone / UPI:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{phone}</td></tr>
        </table>
        <p>Thank you for choosing IGYR.</p>
        \"\"\"
        send_email(email, "Action Required: Pending Payment Reminder", email_body)"""

new_block = """    if balance > 0:
        config = db['config'].find_one({"type": "pricing"}) or {}
        account = config.get("bank_account", "Not provided")
        ifsc = config.get("ifsc", "Not provided")
        phone = config.get("phone", "Not provided")
        
        # Format balance to Indian comma format if possible, or just .2f
        formatted_balance = f"₹{balance:,.2f}"
        
        email_body = f\"\"\"
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
        \"\"\"
        send_email(email, "Action Required: Pending Payment Reminder", email_body)"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('backend/app.py', 'w') as f:
        f.write(content)
    print("Patched admin_publish email details!")
else:
    print("Could not find old block!")
