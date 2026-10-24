import re

with open('app.js', 'r') as f:
    content = f.read()

old_logic = """    // PENDING VIEW
    if (state.view === 'pending') {
        const checkStatus = setInterval(async () => {
            if (state.view !== 'pending') { clearInterval(checkStatus); return; }
            
            try {
                const res = await fetch(`${API_BASE}/institutes/status?email=${state.email}&t=${Date.now()}`);
                if (!res.ok) {
                    clearInterval(checkStatus);
                    state.errorMsg = 'Your registration was rejected and removed. Please try again with valid data.';
                    navigate('auth');
                    return;
                }
                const data = await res.json();
                
                if (data.status === 'approved') {
                    clearInterval(checkStatus);
                    navigate('dashboard');
                }
            } catch (err) { }
        }, 3000);
    }"""

new_logic = """    // PENDING VIEW
    if (state.view === 'pending') {
        // Clear session so they have to login after receiving approval email
        localStorage.removeItem('igyr_session_email');
    }"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Patched Pending Logic!")
else:
    print("Could not find old pending logic block!")
