import re

with open('app.js', 'r') as f:
    content = f.read()

old_pending = """            <div class="bg-gray-100 p-4 rounded-xl mb-6 text-sm flex items-start text-left">
                <i class="fa-solid fa-envelope-circle-check mt-1 mr-3 text-primary text-lg"></i>
                <div>
                    <strong class="block text-gray-800 mb-1">Confirmation Sent</strong>
                    An email has been sent to your registered address regarding this review process.
                </div>
            </div>
            
        </div>
    </div>`;"""

new_pending = """            <div class="bg-gray-100 p-4 rounded-xl mb-6 text-sm flex items-start text-left">
                <i class="fa-solid fa-envelope-circle-check mt-1 mr-3 text-primary text-lg"></i>
                <div>
                    <strong class="block text-gray-800 mb-1">What's Next?</strong>
                    Once approved, you will receive an email. You can then sign in using your registered email and a verification code.
                </div>
            </div>
            
            <button onclick="localStorage.removeItem('igyr_session_email'); state.email=''; navigate('auth');" class="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center">
                Return to Login Page <i class="fa-solid fa-arrow-right-to-bracket ml-2"></i>
            </button>
            
        </div>
    </div>`;"""

if old_pending in content:
    content = content.replace(old_pending, new_pending)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Patched Pending View UI!")
else:
    print("Could not find old pending UI block!")
