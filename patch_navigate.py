import re

with open('app.js', 'r') as f:
    content = f.read()

old_logic = """        } catch(e) {
            state.appStatus = 'pending';
        }
    }
    
    state.view = viewName;
    render();
}"""

new_logic = """        } catch(e) {
            state.appStatus = 'pending';
        }
        
        if (state.appStatus === 'pending') {
            viewName = 'pending';
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
    print("Patched navigate!")
else:
    print("Could not find old_logic block!")
