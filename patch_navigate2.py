import re

with open('app.js', 'r') as f:
    content = f.read()

old_logic = """        if (state.appStatus === 'pending') {
            viewName = 'pending';
        } else if (state.appStatus === 'missing') {
            viewName = 'auth';
            localStorage.removeItem('igyr_session_email');
        }
    }
    
    state.view = viewName;
    render();
}"""

new_logic = """        if (state.appStatus === 'pending') {
            viewName = 'pending';
        } else if (state.appStatus === 'rejected') {
            viewName = 'profileSetup';
        } else if (state.appStatus === 'missing') {
            viewName = 'auth';
            localStorage.removeItem('igyr_session_email');
        }
    }
    
    state.view = viewName;
    render();
}"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Patched navigate for rejected!")
else:
    print("Could not find old navigate logic block!")
