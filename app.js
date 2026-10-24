let lastAppDataHash = '';
const isLocal = window.location.hostname === '127.0.0.1' || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '0.0.0.0' || 
                window.location.hostname.startsWith('192.168.') || 
                window.location.hostname.startsWith('10.') || 
                window.location.port !== '' || 
                window.location.protocol === 'file:';

const API_BASE = isLocal 
    ? `http://${(window.location.hostname && !window.location.hostname.startsWith('192.168.') && !window.location.hostname.startsWith('10.') && window.location.hostname !== '0.0.0.0') ? window.location.hostname : '127.0.0.1'}:5001/api` 
    : '/api';
// State Management
const savedEmail = localStorage.getItem('igyr_session_email') || '';
const state = {
    activeTab: 'profile',
    showWelcomeModal: false,
    view: savedEmail ? 'dashboard' : 'auth',
    authMode: 'login',
    email: savedEmail,
    isNewUser: false,
    instituteData: { name: '', type: '', state: '', district: '', mobile: '', address: '' },
    resultDetails: { totalStudents: '', examDate: '', totalSubjects: '', option: 'normal' },
    errorMsg: '',
    pricing: {normal: 50, excel: 100, both: 150}
};

// Registration Security Lockout Tracker (5-minute security lock)
let regLockoutInterval = null;

function getLockoutRemainingSeconds() {
    const until = parseInt(localStorage.getItem('igyr_reg_lockout_until') || '0', 10);
    if (!until) return 0;
    const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    if (remaining <= 0) {
        localStorage.removeItem('igyr_reg_lockout_until');
    }
    return remaining;
}

function setRegistrationLockout(seconds = 300) {
    const target = Date.now() + (seconds * 1000);
    localStorage.setItem('igyr_reg_lockout_until', target.toString());
}

function setupLockoutCountdown() {
    if (regLockoutInterval) {
        clearInterval(regLockoutInterval);
        regLockoutInterval = null;
    }

    const timerEl = document.getElementById('reg-lockout-timer');
    if (!timerEl) return;

    regLockoutInterval = setInterval(() => {
        const remaining = getLockoutRemainingSeconds();
        const el = document.getElementById('reg-lockout-timer');
        if (remaining <= 0) {
            clearInterval(regLockoutInterval);
            regLockoutInterval = null;
            localStorage.removeItem('igyr_reg_lockout_until');
            state.errorMsg = '';
            render();
            return;
        }
        if (el) {
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }, 1000);
}

// Main Container
const appContainer = document.getElementById('app-container');

// Mock Email Toast
function showMockEmail(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl z-[100] fade-in border-l-4 border-accent flex items-center gap-4 max-w-sm';
    toast.innerHTML = `
        <div class="bg-gray-800 p-2 rounded-full"><i class="fa-solid fa-envelope-open-text text-accent text-xl"></i></div>
        <div>
            <p class="text-xs text-accent font-bold uppercase tracking-wider mb-1">Mock Email Delivered</p>
            <p class="text-sm font-medium leading-tight">${message}</p>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400); 
    }, 6000);
}

// Render Function
function render() {
    appContainer.innerHTML = '';
    let content = '';

    switch (state.view) {
        case 'auth': content = getAuthView(); break;
        case 'verify': content = getVerifyView(); break;
        case 'policy': content = getPolicyView(); break;
        case 'profileSetup': content = getProfileSetupView(); break;
        case 'pending': content = getPendingView(); break;
        case 'dashboard': content = getDashboardView(); break;
        case 'nextSteps': content = getNextStepsView(); break;
        case 'payment': content = getPaymentView(); break;
        case 'success': content = getSuccessView(); break;
        default: content = getAuthView();
    }

    if (typeof morphdom !== 'undefined') {
        const wrap = (h, node) => `<${node.tagName.toLowerCase()} id="${node.id}" class="${node.className}">${h}</${node.tagName.toLowerCase()}>`;
        morphdom(appContainer, wrap(content, appContainer));
    } else {
        appContainer.innerHTML = content;
    }
    attachEventListeners();
}

async function navigate(viewName) {
    state.errorMsg = '';
    
    if (viewName === 'dashboard' || viewName === 'nextSteps') {
        try {
            // Fetch live pricing first (so it's independent)
            try {
                const pRes = await fetch(`${API_BASE}/pricing?t=${Date.now()}`);
                if (pRes.ok) state.pricing = await pRes.json();
            } catch(e) {}
            
            // Fetch user status
            const res = await fetch(`${API_BASE}/institutes/status?email=${state.email}&t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                state.appStatus = data.status;
                if (data.institute && data.institute.name) {
                    state.instituteData = data.institute;
                }
                state.igyr_id = data.igyr_id || '';
                state.payments = data.payments || {total: 0, paid: 0, phases: []};
                state.details = data.details || {};
                state.tabulation_file = data.tabulation_file || null;
                state.history = data.history || [];
                state.rejection_reason = data.institute?.rejection_reason || data.rejection_reason || '';
            } else {
                state.appStatus = 'missing';
            }
        } catch(e) {
            state.appStatus = 'pending';
        }
        
        if (state.appStatus === 'pending') {
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
}

function getErrorHTML() {
    if (!state.errorMsg) return '';
    return `<div class="bg-red-100/90 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium animate-pulse shadow-sm border border-red-200">${state.errorMsg}</div>`;
}

// -----------------------------------------------------------
// View Templates
// -----------------------------------------------------------

function getAuthView() {
    const isLogin = state.authMode === 'login';
    const lockoutSec = getLockoutRemainingSeconds();
    const isLockedOut = !isLogin && (lockoutSec > 0);

    const loginForm = `
        <h3 class="text-2xl font-bold text-gray-800 mb-2">Welcome Back!</h3>
        <p class="text-gray-500 mb-6 text-sm">Sign in to manage your institution's results</p>
        ${getErrorHTML()}
        <form id="auth-form" class="space-y-5">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <div class="relative">
                    <i class="fa-solid fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="email" id="email-input" value="${state.email}" required
                        class="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all focus:bg-white shadow-inner" 
                        placeholder="admin@institute.com" />
                </div>
            </div>
            <button type="submit" class="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-primary/40 transform hover:-translate-y-1 transition-all">
                Sign In & Get Code <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
        </form>
    `;

    const mins = Math.floor(lockoutSec / 60);
    const secs = lockoutSec % 60;
    const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const lockedRegisterView = `
        <div class="text-center py-2 fade-in">
            <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-red-200 shadow-sm animate-pulse">
                <i class="fa-solid fa-lock text-3xl"></i>
            </div>
            <h3 class="text-xl font-extrabold text-red-900 mb-1">Security Lockout Active</h3>
            <p class="text-xs text-red-600 font-medium mb-4 px-2 leading-relaxed">
                Too many unauthorized registration attempts detected. For system security, account creation is temporarily suspended.
            </p>
            
            <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-4 shadow-inner">
                <span class="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Portal Unlocks In</span>
                <div id="reg-lockout-timer" class="font-mono text-4xl font-extrabold text-red-600 tracking-wider">
                    ${formattedTimer}
                </div>
                <div class="text-[11px] text-gray-500 mt-2 flex items-center justify-center gap-1">
                    <i class="fa-solid fa-arrows-rotate text-red-500 text-xs"></i>
                    <span>Countdown timer persists even if browser is refreshed.</span>
                </div>
            </div>

            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-xs text-amber-800 mb-5 shadow-sm">
                <p class="font-bold mb-1"><i class="fa-solid fa-shield-halved text-amber-600 mr-1"></i> Pre-Approval Requirement</p>
                <p class="text-[11px] text-amber-700 leading-normal">Only institutions whose official email is pre-authorized by IGYR Super Admin can create an account. Unauthorized attempts trigger a 5-minute security lockout after 3 tries.</p>
            </div>

            <button disabled class="w-full bg-gray-200 text-gray-400 font-bold py-3.5 px-4 rounded-xl cursor-not-allowed text-sm">
                <i class="fa-solid fa-ban mr-2"></i> Account Creation Locked
            </button>
        </div>
    `;

    const registerForm = `
        <h3 class="text-2xl font-bold text-gray-800 mb-1">Create Account</h3>
        <p class="text-gray-500 mb-4 text-sm">Join IGYR to publish your results seamlessly</p>
        
        <div class="bg-blue-50/90 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-900 flex items-start gap-2.5">
            <i class="fa-solid fa-shield-halved text-blue-600 mt-0.5 shrink-0 text-sm"></i>
            <div>
                <span class="font-bold">Security Pre-Authorization:</span> Only organization emails pre-approved by the IGYR Admin can register. Unauthorized attempts will be locked out after 3 tries.
            </div>
        </div>

        ${getErrorHTML()}
        <form id="auth-form" class="space-y-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Institute Name</label>
                <div class="relative">
                    <i class="fa-solid fa-building-columns absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="name-input" required
                        class="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all focus:bg-white shadow-inner" 
                        placeholder="Your Institute Name" />
                </div>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <div class="relative">
                    <i class="fa-solid fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="email" id="email-input" value="${state.email}" required
                        class="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all focus:bg-white shadow-inner" 
                        placeholder="admin@institute.com" />
                </div>
            </div>
            <button type="submit" class="w-full bg-gradient-to-r from-accent to-orange-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-accent/40 transform hover:-translate-y-1 transition-all">
                Register & Get Code <i class="fa-solid fa-user-plus ml-1"></i>
            </button>
        </form>
    `;

    return `
    <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
        <div class="absolute top-[-10%] left-[-10%] w-full max-w-sm h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div class="absolute top-[20%] right-[-10%] w-full max-w-xs h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div class="absolute bottom-[-20%] left-[20%] w-full max-w-xs md:max-w-sm h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

        <div class="glass-panel w-full max-w-4xl w-[95%] md:w-full flex flex-col md:flex-row rounded-[2rem] overflow-hidden shadow-3d relative z-10 fade-in border border-white/60">
            <div class="w-full md:w-1/2 bg-gradient-to-br from-primary via-blue-800 to-gray-900 text-white p-10 flex flex-col justify-center items-center text-center relative overflow-hidden">
               <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
               <img src="logo.jpg" alt="IGYR Logo" class="w-44 h-44 rounded-full shadow-3d border-4 border-white/20 mb-8 transform hover:scale-105 transition duration-500 hover:rotate-3 relative z-10 object-cover" />
               <h2 class="text-4xl font-extrabold tracking-tight mb-2 shadow-sm text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 relative z-10">IGYR Portal</h2>
               <p class="text-blue-100 font-medium tracking-widest text-sm uppercase relative z-10">India Get Your Result</p>
               <p class="mt-6 text-sm text-blue-200/80 leading-relaxed relative z-10">The premium platform for institutions to manage and publish results seamlessly across India.</p>
            </div>

            <div class="w-full md:w-1/2 bg-white/90 backdrop-blur-xl p-10 flex flex-col justify-center">
                <div class="flex justify-between items-center mb-6 bg-gray-100 p-1.5 rounded-xl shadow-inner">
                    <button id="tab-login" class="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-white text-primary shadow-md transform scale-100' : 'text-gray-500 hover:text-gray-700 scale-95'}">Sign In</button>
                    <button id="tab-register" class="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-white text-primary shadow-md transform scale-100' : 'text-gray-500 hover:text-gray-700 scale-95'}">Create Account</button>
                </div>
                <div id="auth-content" class="fade-in">${isLogin ? loginForm : (isLockedOut ? lockedRegisterView : registerForm)}</div>
            </div>
        </div>
    </div>`;
}

function getVerifyView() {
    const isRegistering = state.authMode === 'register' || state.isNewUser;
    
    return `
    <div class="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <div class="bg-white p-8 rounded-3xl w-full max-w-md fade-in text-center shadow-2xl border border-gray-100">
            <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="fa-solid fa-shield-halved text-4xl text-primary"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Verification Required</h2>
            <p class="text-gray-600 mb-4 text-sm">We've sent a 4-digit code to <br/><strong class="text-gray-800">${state.email}</strong></p>
            
            ${isRegistering ? `
            <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded text-left mb-6 shadow-sm">
                <p class="font-bold text-red-700 text-sm mb-1"><i class="fa-solid fa-circle-exclamation mr-1"></i> Important Notice</p>
                <p class="text-xs text-red-600 leading-relaxed">
                    After your registration is submitted, if the confirmation email is not showing in your mail inbox, please check the <strong>Gmail Spam section</strong> and <strong>Report Not Spam</strong>. The email will then safely show in your primary inbox.
                </p>
            </div>
            ` : ''}
            
            ${getErrorHTML()}
            <form id="verify-form" class="space-y-6">
                <input type="text" id="verify-code" required
                    class="w-full px-4 py-4 text-center tracking-[1em] text-2xl font-mono border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-primary outline-none transition-colors" 
                    placeholder="XXXX" maxlength="4" />
                <button type="submit" class="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-colors shadow-lg">
                    Verify & Continue
                </button>
            </form>
        </div>
    </div>`;
}

function getPolicyView() {
    return `
    <div class="min-h-screen bg-gray-50 py-10 px-4 fade-in">
        <div class="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div class="bg-gradient-to-r from-gray-900 via-primary to-blue-900 p-8 text-white text-center relative overflow-hidden">
                <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
                <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 backdrop-blur-sm shadow-inner relative z-10">
                    <i class="fa-solid fa-scale-balanced text-3xl text-yellow-300"></i>
                </div>
                <span class="inline-block px-3 py-1 bg-white/15 rounded-full text-[11px] font-bold uppercase tracking-wider text-blue-200 mb-2 relative z-10 border border-white/10">Step 2 of 2: Terms of Service</span>
                <h2 class="text-2xl md:text-3xl font-extrabold relative z-10">IGYR – Privacy Policy & Terms and Conditions</h2>
                <p class="text-blue-100 text-xs md:text-sm mt-2 max-w-xl mx-auto leading-relaxed relative z-10">
                    Please review our institutional policies, data protection guidelines, and verification rules. You must accept these terms to submit your registration for approval.
                </p>
            </div>

            <div class="p-6 md:p-8">
                <!-- 9 Policy Points Container -->
                <div class="space-y-4 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                    
                    <!-- 1. Privacy Policy -->
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                            1
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm md:text-base flex items-center gap-2">
                                Privacy Policy
                            </h4>
                            <p class="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                                IGYR (India Get Your Result) respects the privacy of institutes, users, and students. We collect necessary information to provide our services, manage accounts, and publish examination results.
                            </p>
                        </div>
                    </div>

                    <!-- 2. Data Protection -->
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-100">
                            2
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm md:text-base">
                                Data Protection
                            </h4>
                            <p class="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                                We take reasonable security measures to protect institute information, student records, examination results, and account details against unauthorized access, misuse, and disclosure.
                            </p>
                        </div>
                    </div>

                    <!-- 3. Institute Registration -->
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm shrink-0 border border-teal-100">
                            3
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm md:text-base">
                                Institute Registration
                            </h4>
                            <p class="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                                Only email addresses authorized by the IGYR administration can be used to create new institute accounts. Users must provide accurate information and complete the required verification process.
                            </p>
                        </div>
                    </div>

                    <!-- 4. Account Verification and Approval -->
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-100">
                            4
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm md:text-base">
                                Account Verification and Approval
                            </h4>
                            <p class="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                                Every new institute must verify its registered email address and wait for final approval from the IGYR administration. Email eligibility does not guarantee account approval.
                            </p>
                        </div>
                    </div>

                    <!-- 5. Account Security -->
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-sm shrink-0 border border-cyan-100">
                            5
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm md:text-base">
                                Account Security
                            </h4>
                            <p class="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                                Users must keep their login credentials confidential and must not attempt unauthorized access, bypass security controls, or misuse another institute’s information.
                            </p>
                        </div>
                    </div>

                    <!-- 6. Registration Lockout Policy -->
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm shrink-0 border border-red-100">
                            6
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm md:text-base">
                                Registration Lockout Policy
                            </h4>
                            <p class="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                                After three failed eligibility attempts within the configured attempt window, the registration system will temporarily lock the relevant security identifier for five minutes. The lock remains active after refreshing the page and expires automatically after five minutes, unless another security restriction applies.
                            </p>
                        </div>
                    </div>

                    <!-- 7. Result Publishing Policy -->
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-100">
                            7
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm md:text-base">
                                Result Publishing Policy
                            </h4>
                            <p class="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                                Institutes are responsible for ensuring that uploaded student details, examination marks, grades, and results are accurate and authorized for publication. Any errors should be reported promptly for correction.
                            </p>
                        </div>
                    </div>

                    <!-- 8. Acceptable Use and Account Suspension -->
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0 border border-orange-100">
                            8
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm md:text-base">
                                Acceptable Use and Account Suspension
                            </h4>
                            <p class="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                                Users must not submit false information, manipulate results, misuse student data, or engage in fraudulent activities. IGYR may restrict or suspend accounts for violations of its policies, subject to applicable law.
                            </p>
                        </div>
                    </div>

                    <!-- 9. Data Retention and Service Availability -->
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3.5 hover:border-blue-300 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-100">
                            9
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm md:text-base">
                                Data Retention and Service Availability
                            </h4>
                            <p class="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed">
                                Information is retained according to applicable legal requirements and operational needs. IGYR aims to provide reliable services but cannot guarantee uninterrupted access or absolute data security.
                            </p>
                        </div>
                    </div>

                </div>

                <!-- Right-Mark Checkbox & Submission Form -->
                <form id="policy-form" class="mt-6 pt-5 border-t border-gray-200">
                    <div class="bg-blue-50/70 border-2 border-blue-200 rounded-2xl p-4 mb-6 hover:bg-blue-50 transition-colors">
                        <label class="flex items-start gap-3.5 cursor-pointer select-none">
                            <div class="relative flex items-center mt-0.5 shrink-0">
                                <input type="checkbox" id="policy-agree-checkbox" required class="peer w-6 h-6 opacity-0 absolute cursor-pointer">
                                <div class="w-6 h-6 border-2 border-gray-400 rounded-lg peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center transition-all bg-white shadow-sm peer-focus:ring-2 peer-focus:ring-primary/20">
                                    <i class="fa-solid fa-check text-white text-sm opacity-0 peer-checked:opacity-100 font-bold"></i>
                                </div>
                            </div>
                            <span class="text-xs md:text-sm text-gray-800 font-semibold leading-relaxed">
                                I have read, understood, and accept the <strong>IGYR – Privacy Policy & Terms and Conditions</strong>. I confirm that our institution's registration details are accurate and agree to abide by all operational policies while awaiting final administrative approval.
                            </span>
                        </label>
                    </div>

                    <div class="flex flex-col sm:flex-row items-center gap-3">
                        <button type="button" onclick="navigate('profileSetup')" class="w-full sm:w-auto px-6 py-4 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors text-sm flex items-center justify-center">
                            <i class="fa-solid fa-arrow-left mr-2"></i> Edit Details
                        </button>
                        <button type="submit" id="btn-submit-policy" class="flex-1 w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-primary/40 transform hover:-translate-y-0.5 text-base flex items-center justify-center">
                            <i class="fa-solid fa-paper-plane mr-2"></i> Submit Registration for Approval
                        </button>
                    </div>
                </form>

            </div>
        </div>
    </div>`;
}

function getProfileSetupView() {
    const isRejected = state.appStatus === 'rejected';
    const d = state.instituteData || {};
    
    return `
    <div class="min-h-screen bg-gray-50 py-10 px-4 fade-in">
        <div class="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div class="text-center mb-8 border-b pb-6">
                ${isRejected ? `
                <div class="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
                    <p class="font-bold text-red-700 text-lg mb-1"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Registration Rejected</p>
                    <p class="text-sm text-red-600">Your previous application was rejected by the admin. Please correct your details below and reapply.</p>
                </div>
                ` : `
                <span class="text-xs font-bold uppercase tracking-widest text-primary bg-blue-50 px-3 py-1 rounded-full mb-3 inline-block">Step 1 of 2: Institution Profile</span>
                <h2 class="text-3xl font-bold text-gray-800">Complete Institution Profile</h2>
                <p class="text-gray-500 mt-2">Enter your institutional details before reviewing the official terms and conditions.</p>
                `}
            </div>
            
            ${getErrorHTML()}
            
            <form id="profile-form" class="space-y-6">
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Type of Institute</label>
                        <select required id="inst-type" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all">
                            <option value="">Select Type</option>
                            <option value="School" ${d.type === 'School' ? 'selected' : ''}>School</option>
                            <option value="College" ${d.type === 'College' ? 'selected' : ''}>College</option>
                            <option value="University" ${d.type === 'University' ? 'selected' : ''}>University</option>
                            <option value="Coaching" ${d.type === 'Coaching' ? 'selected' : ''}>Coaching Center</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                        <input required type="tel" id="inst-mobile" value="${d.mobile || ''}" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all" />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">State (All India)</label>
                        <select required id="inst-state" data-selected="${d.state || ''}" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all bg-white">
                            <option value="" disabled selected>Select State</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">District</label>
                        <select required id="inst-district" data-selected="${d.district || ''}" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all bg-white" disabled>
                            <option value="" disabled selected>Select District</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Full Address</label>
                    <textarea required id="inst-address" rows="3" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all resize-none">${d.address || ''}</textarea>
                </div>
                <button type="submit" class="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-primary/40 transform hover:-translate-y-1 transition-all mt-6 text-base md:text-lg flex items-center justify-center">
                    <span>Continue to Privacy Policy & Terms</span> <i class="fa-solid fa-arrow-right ml-2"></i>
                </button>
            </form>
        </div>
    </div>`;
}

function getPendingView() {
    return `
    <div class="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div class="glass-panel p-10 rounded-3xl w-full max-w-lg fade-in text-center shadow-2xl border-t-8 border-t-accent">
            <div class="relative w-24 h-24 mx-auto mb-6">
                <div class="absolute inset-0 bg-yellow-100 rounded-full animate-ping opacity-75"></div>
                <div class="relative w-24 h-24 bg-white border-4 border-yellow-100 rounded-full flex items-center justify-center shadow-sm">
                    <i class="fa-solid fa-hourglass-half text-4xl text-accent"></i>
                </div>
            </div>
            
            <h2 class="text-2xl font-bold text-gray-800 mb-3">Institution Under Review</h2>
            <p class="text-gray-600 mb-6 leading-relaxed">We have received your institution details. Our admin team is carefully verifying your application to ensure validity.</p>
            
            <div class="bg-gray-100 p-4 rounded-xl mb-6 text-sm flex items-start text-left">
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
    </div>`;
}

function getDashboardView() {
    let appStatus = state.appStatus || 'removed';
    let appName = state.instituteData.name || 'Admin';
    let payments = state.payments || {total: 0, paid: 0, phases: []};
    let details = state.details || {};
    
    // Load pricing from state (synced with backend)
    const pricing = state.pricing;
    
    
    // Build Timeline HTML
    let timelineHtml = '';
    const orderStates = ['order_placed', 'documents_required', 'processing', 'verification_pending', 'ready_to_publish', 'published'];
    if (orderStates.includes(appStatus)) {
        const steps = [
            { id: 'order_placed', label: 'Order Placed', icon: 'fa-cart-shopping' },
            { id: 'documents_required', label: 'Upload Data', icon: 'fa-file-arrow-up' },
            { id: 'processing', label: 'Processing', icon: 'fa-gear' },
            { id: 'verification_pending', label: 'Verification', icon: 'fa-clipboard-check' },
            { id: 'ready_to_publish', label: 'Approved', icon: 'fa-thumbs-up' },
            { id: 'published', label: 'Published', icon: 'fa-trophy' }
        ];
        
        let currentIndex = steps.findIndex(s => s.id === appStatus);
        
        let stepsHtml = steps.map((step, index) => {
            let statusClass = 'text-gray-400';
            let bgClass = 'bg-gray-200';
            let lineClass = 'bg-gray-200';
            
            if (index < currentIndex) {
                statusClass = 'text-green-600';
                bgClass = 'bg-green-500 text-white';
                lineClass = 'bg-green-500';
            } else if (index === currentIndex) {
                statusClass = 'text-blue-600 font-bold';
                bgClass = 'bg-blue-600 text-white ring-4 ring-blue-100';
                if(appStatus === 'published') {
                    statusClass = 'text-green-600 font-bold';
                    bgClass = 'bg-green-500 text-white ring-4 ring-green-100';
                }
            }
            
            return `
                <div class="relative flex flex-col items-center flex-1">
                    ${index < steps.length - 1 ? `<div class="absolute top-5 left-1/2 w-full h-1 ${lineClass} -z-10 transition-colors duration-500"></div>` : ''}
                    <div class="w-10 h-10 rounded-full ${bgClass} flex items-center justify-center shadow-sm transition-all duration-500 mb-2">
                        <i class="fa-solid ${step.icon}"></i>
                    </div>
                    <span class="text-[10px] sm:text-xs text-center ${statusClass}">${step.label}</span>
                </div>
            `;
        }).join('');
        
        timelineHtml = `
            <div class="mt-8 mb-4">
                <div class="flex justify-between relative z-0">
                    ${stepsHtml}
                </div>
            </div>
        `;
    }

    const getStatusMessage = (status) => {
        if(status === 'pending') return '<span class="text-yellow-600 font-bold"><i class="fa-solid fa-clock"></i> Verification Pending:</span> Details under review by admin.';
        if(status === 'rejected') return '<span class="text-red-600 font-bold"><i class="fa-solid fa-xmark"></i> Registration Rejected:</span> Please contact support.';
        if(status === 'order_rejected') return '<span class="text-red-600 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Order Rejected:</span> Your requested output format was rejected by the admin.';
        if(status === 'removed') return '<span class="text-red-600 font-bold"><i class="fa-solid fa-ban"></i> Account Revoked:</span> Institution removed from hub.';
        if(status === 'approved') {
            const hasDues = ((state.payments?.phases || []).reduce((a, p) => a + (p.debited || 0), 0) - (state.payments?.phases || []).reduce((a, p) => a + (p.credited || 0), 0)) > 0;
            if(hasDues) return '<span class="text-red-600 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Action Required:</span> You have pending dues. Please clear them to unlock new result publications.';
            return '<span class="text-green-600 font-bold"><i class="fa-solid fa-check"></i> Account Verified:</span> You have no ongoing publications. Click "Publish New Result" to start.';
        }
        if(status === 'order_placed') return '<span class="text-blue-600 font-bold"><i class="fa-solid fa-clock"></i> Order Placed:</span> Awaiting admin approval of your requested format.';
        if(status === 'documents_required') return '<span class="text-purple-600 font-bold"><i class="fa-solid fa-file-arrow-up"></i> Documents Required:</span> Admin approved format. Please upload required files below.';
        if(status === 'processing') return '<span class="text-blue-600 font-bold"><i class="fa-solid fa-gear fa-spin"></i> Processing:</span> Admin is currently processing your data.';
        if(status === 'verification_pending') return '<span class="text-orange-600 font-bold"><i class="fa-solid fa-clipboard-check"></i> Action Required:</span> Please verify the Tabulation Register before publication.';
        if(status === 'published') return '<span class="text-green-600 font-bold"><i class="fa-solid fa-trophy"></i> Published:</span> Results are live. Please clear any pending payments.';
        return '';
    };
    
    let requiredFilesHtml = '';
    if(appStatus === 'documents_required') {
        let docs = 'PDF Document (Normal Tabulation)';
        if(details.option === 'excel') docs = 'Excel Data Sheet';
        if(details.option === 'excel_admit') docs = 'Excel Data Sheet + Admit Card Details (Merged)';
        
        requiredFilesHtml = `
            <div class="mt-6 p-5 border border-purple-200 bg-purple-50 rounded-xl shadow-sm">
                <h4 class="font-bold text-purple-800 mb-2"><i class="fa-solid fa-envelope-open-text mr-2"></i> Action Required: Email Data</h4>
                <p class="text-sm text-gray-600 mb-4">Admin requires: <strong class="text-gray-800">${docs}</strong></p>
                <div class="flex flex-col md:flex-row items-center gap-3">
                    <input type="file" id="file-upload" class="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"/>
                    <button id="btn-upload" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors shadow-sm w-full md:w-auto flex items-center justify-center">
                        <i class="fa-solid fa-paper-plane mr-2"></i> Send securely via Email
                    </button>
                </div>
                <p class="text-xs text-purple-600 mt-3 font-medium"><i class="fa-solid fa-circle-info mr-1"></i> For total security, this file is NEVER saved on our servers. It is directly forwarded to the Admin's private email inbox and immediately deleted from our system.</p>
            </div>
        `;
    }
    
    let verificationHtml = '';
    if(appStatus === 'verification_pending') {
        verificationHtml = `
            <div class="mt-6 p-5 border border-orange-200 bg-orange-50 rounded-xl shadow-sm text-center">
                <i class="fa-solid fa-envelope-open-text text-4xl text-orange-500 mb-3"></i>
                <h4 class="text-xl font-bold text-orange-800 mb-2">Check Your Email</h4>
                <p class="text-sm text-gray-600 mb-4 font-medium">The Admin has generated your Draft Tabulation Register and sent it securely to your registered email address <strong>(${state.email})</strong>.</p>
                <div class="bg-white p-4 rounded border border-orange-100 mb-5 shadow-sm text-left text-sm text-gray-700">
                    <i class="fa-solid fa-circle-info text-blue-500 mr-2"></i> Open your email inbox, review the attached PDF/Excel file, and then return here to authorize the final publication.
                </div>
                <div class="flex gap-3">
                    <button id="btn-verify-approve" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors"><i class="fa-solid fa-check mr-2"></i> Approve Tabulation</button>
                    <button id="btn-verify-reject" class="flex-1 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white font-bold py-3 rounded-lg border border-red-200 shadow-sm transition-colors"><i class="fa-solid fa-xmark mr-2"></i> Reject (Changes Needed)</button>
                </div>
            </div>
        `;
    }
    
    let paymentTrackerHtml = '';
    const activeOrderStates = ['order_placed', 'documents_required', 'processing', 'verification_pending', 'ready_to_publish', 'published'];
    const historyPayments = (state.history || []).filter(h => h.payments && h.payments.phases && h.payments.phases.length > 0).reverse();
    
    if (activeOrderStates.includes(appStatus) || (state.payments && state.payments.phases && state.payments.phases.length > 0) || historyPayments.length > 0) {
        const payments = state.payments || {phases: []};
        const totalBilled = (payments.phases || []).reduce((acc, p) => acc + (p.debited || 0), 0);
        const totalPaid = (payments.phases || []).reduce((acc, p) => acc + (p.credited || 0), 0);
        const percent = totalBilled > 0 ? Math.min(100, Math.round((totalPaid / totalBilled) * 100)) : 0;
        let phasesHtml = (payments.phases || []).map((p, i) => {
            const balance = p.debited - p.credited;
            return `
            <div class="text-xs bg-white p-3 rounded-xl border shadow-sm mb-2">
                <div class="flex justify-between items-center mb-2 border-b pb-2">
                    <span class="font-bold text-gray-800 text-sm"><i class="fa-solid fa-file-invoice mr-1 text-gray-400"></i> ${p.name}</span>
                    <span class="text-[10px] text-gray-500">${new Date(p.date).toLocaleDateString()}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-red-50 p-1.5 rounded border border-red-100">
                        <span class="block text-[10px] text-red-500 uppercase font-bold">Billed</span>
                        <span class="font-bold text-red-700">₹${p.debited}</span>
                    </div>
                    <div class="bg-green-50 p-1.5 rounded border border-green-100 relative">
                        <span class="block text-[10px] text-green-500 uppercase font-bold">Paid</span>
                        <span class="font-bold text-green-700">₹${p.credited}</span>
                        ${p.credited > 0 ? `<div class="absolute -top-2 -right-2 bg-green-500 text-white text-[8px] px-1 py-0.5 rounded shadow flex items-center gap-1" title="Receipt sent via Email"><i class="fa-solid fa-envelope"></i><span>Emailed</span></div>` : ''}
                    </div>
                    <div class="bg-blue-50 p-1.5 rounded border border-blue-100">
                        <span class="block text-[10px] text-blue-500 uppercase font-bold">Due</span>
                        <span class="font-bold text-blue-700">₹${balance}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
        

        
        paymentTrackerHtml = `
            <div class="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                <h3 class="text-xl font-bold text-gray-800 mb-6"><i class="fa-solid fa-wallet text-blue-600 mr-2"></i> Payment Tracking</h3>
                
                <div class="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div class="text-center md:text-left mb-4 md:mb-0">
                        <p class="text-sm text-gray-500 uppercase tracking-wide font-bold">Total Paid</p>
                        <p class="text-3xl font-black text-green-600">₹${totalPaid}</p>
                    </div>
                    <div class="text-center md:text-right">
                        <p class="text-sm text-gray-500 uppercase tracking-wide font-bold">Total Billed</p>
                        <p class="text-3xl font-black text-gray-800">₹${totalBilled}</p>
                    </div>
                </div>
                
                <div class="relative w-full bg-gray-100 rounded-full h-4 mb-2 shadow-inner">
                    <div class="absolute top-0 left-0 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000" style="width: ${percent}%"></div>
                    <div class="absolute top-0 bottom-0 left-[80%] border-l-2 border-dashed border-gray-400"></div>
                </div>
                
                <div class="flex justify-between text-xs text-gray-500 font-bold mb-6">
                    <span>0%</span>
                    <span class="ml-16"><i class="fa-solid fa-lock ${percent >= 80 ? 'text-green-500' : 'text-gray-400'} mr-1"></i> 80% Minimum required</span>
                    <span>100%</span>
                </div>
                
                ${(payments.phases || []).length > 0 ? `
                    <h4 class="text-sm font-bold text-gray-700 mb-2 border-t pt-4"><i class="fa-solid fa-book mr-1"></i> Transaction Ledger</h4>
                    <div class="flex flex-col gap-1 max-h-48 overflow-y-auto mb-4">${phasesHtml}</div>
                    
                    ${(payments.transactions && payments.transactions.length > 0) ? `
                        <h4 class="text-sm font-bold text-gray-700 mb-2 border-t pt-4"><i class="fa-solid fa-receipt mr-1"></i> Official Receipts</h4>
                        <div class="flex flex-col gap-2 max-h-48 overflow-y-auto">
                            ${payments.transactions.map((t, i) => `
                                <div class="flex justify-between items-center bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm">
                                    <div>
                                        <p class="font-bold text-gray-800">Receipt #${t.id.replace('txn_', '')}</p>
                                        <p class="text-[10px] text-gray-500">${new Date(t.date).toLocaleString()}</p>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="font-black text-green-600">₹${t.amount}</span>
                                        <button onclick="printReceipt('${t.id}')" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors border shadow-sm flex items-center gap-1 font-bold" title="Print Official Receipt">
                                            <i class="fa-solid fa-print"></i> Print
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                ` : ''}
                
                ${totalBilled === 0 && (state.payments?.phases || []).length === 0 ? '<div class="text-center p-4 bg-gray-50 rounded border border-dashed"><p class="text-sm text-gray-500 italic">No active payment request for the current order.</p></div>' : ''}
                
                ${historyPayments.length > 0 ? `
                <div class="mt-6 pt-6 border-t border-gray-200">
                    <h4 class="text-sm font-bold text-gray-700 mb-3"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Previous Order Payments</h4>
                    <div class="flex flex-col gap-3 max-h-64 overflow-y-auto">
                        ${historyPayments.map((hist, i) => {
                            const hTotalBilled = (hist.payments.phases || []).reduce((acc, p) => acc + (p.debited || 0), 0);
                            const hTotalPaid = (hist.payments.phases || []).reduce((acc, p) => acc + (p.credited || 0), 0);
                            const hPercent = hTotalBilled > 0 ? Math.min(100, Math.round((hTotalPaid / hTotalBilled) * 100)) : 0;
                            const isSettled = hTotalPaid >= hTotalBilled && hTotalBilled > 0;
                            return `
                            <div class="bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-bold text-gray-800 text-sm"><i class="fa-regular fa-calendar-check mr-1 text-gray-500"></i> Order Closed: ${new Date(hist.date).toLocaleDateString()}</span>
                                    <span class="text-[10px] font-bold px-2 py-1 ${isSettled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-full shadow-sm"><i class="fa-solid ${isSettled ? 'fa-check' : 'fa-triangle-exclamation'} mr-1"></i> ${isSettled ? 'Settled' : 'Unpaid Balance'}</span>
                                </div>
                                <div class="flex justify-between items-end mb-3">
                                    <div class="text-xs">
                                        <p class="text-gray-500 uppercase font-bold tracking-wide">Total Paid</p>
                                        <p class="text-xl font-black text-green-600">₹${hTotalPaid}</p>
                                    </div>
                                    <div class="text-xs text-right">
                                        <p class="text-gray-500 uppercase font-bold tracking-wide">Total Billed</p>
                                        <p class="text-lg font-bold text-gray-700">₹${hTotalBilled}</p>
                                    </div>
                                </div>
                                
                                <div class="relative w-full bg-gray-200 rounded-full h-1.5 shadow-inner mb-3">
                                    <div class="absolute top-0 left-0 h-1.5 ${isSettled ? 'bg-green-500' : 'bg-red-500'} rounded-full" style="width: ${hPercent}%"></div>
                                </div>
                                
                                <details class="text-xs">
                                    <summary class="cursor-pointer text-blue-600 font-bold hover:text-blue-800 select-none bg-white border inline-block px-3 py-1.5 rounded-md shadow-sm"><i class="fa-solid fa-list mr-1"></i> View Transaction Ledger</summary>
                                    <div class="mt-2 flex flex-col gap-1 border border-gray-100 bg-white p-3 rounded-lg shadow-inner">
                                        ${(hist.payments.phases || []).map(p => `
                                            <div class="flex justify-between items-center border-b border-gray-100 pb-1.5 last:border-0 last:pb-0">
                                                <span class="text-gray-600 font-medium">${p.name}</span>
                                                <div class="text-right">
                                                    <span class="font-bold text-green-600">₹${p.credited}</span>
                                                    <span class="text-gray-400 text-[10px] mx-1">/</span>
                                                    <span class="font-bold text-red-600">₹${p.debited}</span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </details>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                
                
            </div>
        `;
    }

    let bankDetailsHtml = '';
    if (pricing.bank_account || pricing.ifsc || pricing.phone) {
        bankDetailsHtml = `
            <div class="mt-6 pt-6 border-t border-gray-100">
                <h4 class="text-sm font-bold text-blue-800 mb-3"><i class="fa-solid fa-building-columns mr-2"></i> Official Payment Details</h4>
                <div class="flex flex-col gap-3">
                    <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                        <span class="block text-gray-500 mb-1 text-xs uppercase font-bold">Bank Account Number</span>
                        <span class="font-bold text-gray-800 break-all font-mono">${pricing.bank_account || 'N/A'}</span>
                    </div>
                    <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                        <span class="block text-gray-500 mb-1 text-xs uppercase font-bold">IFSC Code</span>
                        <span class="font-bold text-gray-800 font-mono">${pricing.ifsc || 'N/A'}</span>
                    </div>
                    <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                        <span class="block text-gray-500 mb-1 text-xs uppercase font-bold">UPI ID / Phone Number</span>
                        <span class="font-bold text-gray-800 font-mono">${pricing.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    let formatsList = (pricing.formats && pricing.formats.length > 0) ? pricing.formats : [
        { name: "Normal Tabulation", rate: pricing.normal || 50 },
        { name: "Excel Sheet", rate: pricing.excel || 100 },
        { name: "Admit card + Any type of Tabulation", rate: pricing.both || 150 }
    ];

    const formatsCards = formatsList.map(fmt => `
        <div class="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm">
            <div class="text-xs uppercase font-bold text-gray-700 mb-2 leading-tight">${fmt.name}</div>
            <div class="font-black text-xl text-green-700">₹${fmt.rate} <span class="text-[10px] font-normal text-gray-400">/ student</span></div>
        </div>
    `).join('');

    const pricingHtml = `
        <div class="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div class="border-b pb-3 mb-5">
                <h3 class="text-lg font-bold text-gray-800"><i class="fa-solid fa-tags text-primary mr-2"></i> Result Formats & Rate Card</h3>
                <p class="text-xs text-gray-500 mt-1">Official result processing rates configured by the admin</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                ${formatsCards}
                <div class="p-4 bg-purple-50 rounded-xl border border-purple-200 flex flex-col justify-between shadow-sm">
                    <div class="text-xs uppercase font-bold text-purple-700 mb-2 leading-tight">Subject Add-on</div>
                    <div class="font-black text-xl text-purple-700">₹${pricing.subject_rate || 0} <span class="text-[10px] font-normal opacity-75">/ subject</span></div>
                </div>
            </div>
            ${bankDetailsHtml}
            ${pricing.message ? `
            <div class="mt-6 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg text-sm text-orange-800">
                <p class="font-bold mb-1"><i class="fa-solid fa-bullhorn mr-1"></i> Admin Notice:</p>
                <p class="whitespace-pre-line">${pricing.message}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    let historyItems = '';
    if (state.history && state.history.length > 0) {
        historyItems = state.history.map((h, i) => `
            <details class="mb-3 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                <summary class="p-4 font-bold cursor-pointer hover:bg-gray-100 outline-none flex justify-between items-center">
                    <span><i class="fa-solid fa-folder-open text-blue-500 mr-2"></i> Result ${i+1} (${new Date(h.date).toLocaleDateString()})</span>
                    <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded uppercase tracking-wider">Published</span>
                </summary>
                <div class="p-4 border-t border-gray-200 bg-white text-sm">
                    <p class="mb-2"><strong>Format:</strong> ${h.details.option ? h.details.option.toUpperCase() : 'N/A'}</p>
                    <p class="mb-2"><strong>Students:</strong> ${h.details.totalStudents} | <strong>Subjects:</strong> ${h.details.totalSubjects} | <strong>Exam Date:</strong> ${h.details.examDate}</p>
                    <p class="mb-2"><strong>Total Paid:</strong> ₹${h.payments ? h.payments.paid : 0}</p>
                    <div class="mt-3 pt-3 border-t">
                        ${h.tabulation_file ? `<a href="${API_BASE}/files/${h.tabulation_file}" target="_blank" class="text-blue-600 hover:underline"><i class="fa-solid fa-file-arrow-down mr-1"></i> Download Tabulation Register</a>` : ''}
                    </div>
                </div>
            </details>
        `).join('');
    }

    const historyHtml = `
        <div class="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h3 class="text-lg font-bold text-gray-800 mb-4"><i class="fa-solid fa-clock-rotate-left text-gray-600 mr-2"></i> Result History</h3>
            ${historyItems ? historyItems : `
            <div class="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 text-sm">
                No past results found. When you publish a result, it will appear here.
            </div>
            `}
        </div>
    `;

    return `
    <div class="bg-gray-50 flex flex-col md:flex-row fade-in h-screen overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-full md:w-64 bg-gray-900 text-white flex flex-row md:flex-col shadow-xl flex-shrink-0 md:h-full z-50 border-b md:border-b-0 border-gray-800">
            <div class="p-3 md:p-6 flex flex-row md:flex-col items-center border-r md:border-r-0 md:border-b border-gray-800 flex-shrink-0">
                <img src="logo.jpg" alt="Logo" class="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 md:border-4 border-gray-800 mr-3 md:mr-0 md:mb-3 shadow-lg" />
                <div><div class="font-black text-base md:text-xl tracking-wide">IGYR</div><div class="text-[10px] md:text-xs text-gray-400 leading-tight">Institute Portal</div></div>
            </div>
            
            <nav class="flex-1 p-2 md:p-4 flex flex-row md:flex-col gap-1 md:gap-2 md:space-y-2 overflow-x-auto md:overflow-y-auto items-center md:items-stretch">
                <button data-tab="profile" class="sidebar-tab-btn flex-shrink-0 md:w-full text-left px-3 md:px-5 py-2 md:py-3.5 rounded-xl transition-all duration-300 flex items-center text-sm md:text-base ${
                    state.activeTab === 'profile' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-lg shadow-blue-900/40' 
                    : 'text-gray-400 font-medium hover:bg-gray-800 hover:text-white'
                }">
                    <i class="fa-solid fa-user w-5 text-center text-lg md:mr-3"></i> <span class="ml-2 md:ml-0 whitespace-nowrap">Profile</span>
                </button>
                <button data-tab="order_status" class="sidebar-tab-btn flex-shrink-0 md:w-full text-left px-3 md:px-5 py-2 md:py-3.5 rounded-xl transition-all duration-300 flex items-center text-sm md:text-base ${
                    state.activeTab === 'order_status' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-lg shadow-blue-900/40' 
                    : 'text-gray-400 font-medium hover:bg-gray-800 hover:text-white'
                }">
                    <i class="fa-solid fa-list-check w-5 text-center text-lg md:mr-3"></i> <span class="ml-2 md:ml-0 whitespace-nowrap">Order Status</span>
                </button>
                <button data-tab="pricing" class="sidebar-tab-btn flex-shrink-0 md:w-full text-left px-3 md:px-5 py-2 md:py-3.5 rounded-xl transition-all duration-300 flex items-center text-sm md:text-base ${
                    state.activeTab === 'pricing' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-lg shadow-blue-900/40' 
                    : 'text-gray-400 font-medium hover:bg-gray-800 hover:text-white'
                }">
                    <i class="fa-solid fa-tags w-5 text-center text-lg md:mr-3"></i> <span class="ml-2 md:ml-0 whitespace-nowrap">Pricing Config</span>
                </button>
                <button data-tab="payment" class="sidebar-tab-btn flex-shrink-0 md:w-full text-left px-3 md:px-5 py-2 md:py-3.5 rounded-xl transition-all duration-300 flex items-center text-sm md:text-base ${
                    state.activeTab === 'payment' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-lg shadow-blue-900/40' 
                    : 'text-gray-400 font-medium hover:bg-gray-800 hover:text-white'
                }">
                    <i class="fa-solid fa-wallet w-5 text-center text-lg md:mr-3"></i> <span class="ml-2 md:ml-0 whitespace-nowrap">Payment Tracking</span>
                </button>
                <button data-tab="history" class="sidebar-tab-btn flex-shrink-0 md:w-full text-left px-3 md:px-5 py-2 md:py-3.5 rounded-xl transition-all duration-300 flex items-center text-sm md:text-base ${
                    state.activeTab === 'history' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-lg shadow-blue-900/40' 
                    : 'text-gray-400 font-medium hover:bg-gray-800 hover:text-white'
                }">
                    <i class="fa-solid fa-clock-rotate-left w-5 text-center text-lg md:mr-3"></i> <span class="ml-2 md:ml-0 whitespace-nowrap">Result History</span>
                </button>
            </nav>
            
            <div class="p-2 md:p-4 border-t border-gray-800 mt-auto flex-shrink-0">
                <button id="btn-logout" class="w-full flex items-center justify-center bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors py-2 md:py-3 rounded-lg font-bold">
                    <i class="fa-solid fa-power-off md:mr-2"></i> <span class="ml-2 md:ml-0 whitespace-nowrap">Logout</span>
                </button>
            </div>
        </aside>
        
        <!-- Main Content -->
        <main class="flex-1 min-h-0 overflow-y-auto bg-gray-50 p-4 md:p-8">
            <div class="max-w-4xl mx-auto space-y-6 pb-20">
                ${state.activeTab === 'profile' ? `
                    <div class="text-center mb-8 pt-8">
                        <img src="logo.jpg" alt="Logo" class="w-32 h-32 mx-auto rounded-full border-4 border-white shadow-xl mb-6 object-cover" />
                        <h1 class="text-3xl font-black text-gray-800">Welcome to IGYR</h1>
                        <p class="text-gray-500 mt-2 font-medium">Manage your institution's results easily.</p>
                    </div>
                    <!-- Institute Profile Widget -->
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div class="h-24 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                        <div class="px-6 pb-6 relative">
                            <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white absolute -top-10">
                                <i class="fa-solid fa-building-columns text-3xl text-blue-600"></i>
                            </div>
                            <div class="pt-12">
                                <h2 class="text-2xl font-black text-gray-800 mb-1">${appName}</h2>
                                <p class="text-sm text-gray-500 font-bold mb-6 uppercase tracking-wider">${state.instituteData.type || 'Institute'}</p>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                                        <span class="block text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Institution ID</span>
                                        <span class="font-mono text-xl text-blue-700 font-black tracking-wide">${state.igyr_id || 'Pending...'}</span>
                                    </div>
                                    <div class="space-y-4 text-sm text-gray-600 p-2">
                                        <p class="flex items-start"><i class="fa-solid fa-location-dot w-6 mt-0.5 text-gray-400"></i> <span class="font-medium">${state.instituteData.district || ''}, ${state.instituteData.state || ''}</span></p>
                                        <p class="flex items-start"><i class="fa-solid fa-phone w-6 mt-0.5 text-gray-400"></i> <span class="font-medium">${state.instituteData.mobile || 'N/A'}</span></p>
                                        <p class="flex items-start"><i class="fa-solid fa-envelope w-6 mt-0.5 text-gray-400"></i> <span class="font-medium">${state.email}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${state.activeTab === 'order_status' ? `
                    <!-- Active Order Status -->
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10"></div>
                        <div class="p-8">
                            <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                                <div>
                                    <h2 class="text-2xl font-black text-gray-800">Order Status Tracker</h2>
                                    <p class="text-sm text-gray-500 mt-1">Live updates on your active publication</p>
                                </div>
                                ${['approved', 'published'].includes(appStatus) ? (
                                    ((state.payments?.phases || []).reduce((a, p) => a + (p.debited || 0), 0) - (state.payments?.phases || []).reduce((a, p) => a + (p.credited || 0), 0) > 0) ? `
                                    <button onclick="document.querySelector('[data-tab=\'payment\']').click()" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all transform hover:-translate-y-1 text-sm flex items-center whitespace-nowrap">
                                        <i class="fa-solid fa-triangle-exclamation mr-2"></i> Clear Dues to Publish
                                    </button>
                                    ` : `
                                    <button id="card-new-result" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all transform hover:-translate-y-1 text-sm flex items-center whitespace-nowrap">
                                        <i class="fa-solid fa-bolt mr-2"></i> Publish New Result
                                    </button>
                                    `
                                ) : ''}
                            </div>
                            
                            ${timelineHtml}
                            ${appStatus === 'order_rejected' ? `
                                <div class="mb-6 p-6 border-2 border-red-200 bg-red-50 rounded-xl shadow-sm text-center">
                                    <i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
                                    <h3 class="text-xl font-bold text-red-800 mb-2">Order Format Rejected</h3>
                                    <p class="text-red-600 mb-4 font-medium">Admin Reason: <span class="bg-white px-3 py-1 rounded border border-red-200 inline-block mt-2 font-bold break-words max-w-full">${state.rejection_reason || 'Please review your format options and try again.'}</span></p>
                                    <button onclick="reapplyOrder()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all">Acknowledge & Re-Apply</button>
                                </div>
                            ` : `
                                <div class="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 text-sm shadow-inner mt-4">
                                    ${getStatusMessage(appStatus)}
                                </div>
                            `}
                            
                            ${requiredFilesHtml}
                            ${verificationHtml}
                        </div>
                    </div>
                ` : ''}
                
                ${state.activeTab === 'pricing' ? pricingHtml : ''}
                
                ${state.activeTab === 'payment' ? paymentTrackerHtml : ''}
                
                ${state.activeTab === 'history' ? historyHtml : ''}
            </div>
        </main>
        
        ${state.showWelcomeModal ? `
            <div class="fixed inset-0 bg-gray-50 z-50 flex flex-col items-center justify-center fade-in bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <img src="logo.jpg" alt="Logo" class="w-full max-w-xs h-72 mx-auto rounded-full border-[12px] border-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] mb-12 animate-bounce object-cover" style="animation-duration: 3s;" />
                
                <div class="flex justify-center w-full mb-12">
                    <h1 class="text-3xl md:text-5xl lg:text-6xl font-black overflow-hidden border-r-[6px] border-blue-600 whitespace-nowrap typing-animation text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600" 
                        style="margin: 0; filter: drop-shadow(3px 3px 0px rgba(139, 92, 246, 0.4)) drop-shadow(6px 6px 0px rgba(59, 130, 246, 0.2));">Welcome to India Get Your Result.</h1>
                </div>
                
                <button id="btn-enter-dashboard" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-2xl py-5 px-16 rounded-full shadow-[0_10px_25px_rgba(99,102,241,0.5)] transition-all transform hover:scale-110 border-4 border-white">
                    Enter Dashboard <i class="fa-solid fa-rocket ml-3"></i>
                </button>
            </div>
            
            <style>
                .typing-animation {
                    width: 33ch; /* Exact width of the text */
                    animation: 
                        typing 2.5s steps(33, end) forwards, 
                        blink-caret .75s step-end 5, 
                        hide-caret 0.1s forwards 3.5s;
                }
                @keyframes typing {
                    from { width: 0 }
                    to { width: 33.5ch; }
                }
                @keyframes blink-caret {
                    from, to { border-color: transparent }
                    50% { border-color: #2563eb; }
                }
                @keyframes hide-caret {
                    to { border-color: transparent; }
                }
            </style>
        ` : ''}
    </div>
`;
}


function getNextStepsView() {
    const rawFormats = state.pricing?.formats;
    const formats = (rawFormats && rawFormats.length > 0) ? rawFormats : [
        { name: "Normal Tabulation", rate: state.pricing?.normal || 50 },
        { name: "Excel Sheet", rate: state.pricing?.excel || 100 },
        { name: "Admit card + Any type of Tabulation", rate: state.pricing?.both || 150 }
    ];

    if (!state.resultDetails.option && formats.length > 0) {
        state.resultDetails.option = formats[0].name;
    }

    const formatsHtml = formats.map((fmt, idx) => {
        const isChecked = state.resultDetails.option === fmt.name || (state.resultDetails.option === 'normal' && idx === 0) || (state.resultDetails.option === 'excel' && fmt.name.toLowerCase().includes('excel')) || (state.resultDetails.option === 'both' && fmt.name.toLowerCase().includes('admit'));
        let icon = "fa-file-lines";
        const nameLower = fmt.name.toLowerCase();
        if (nameLower.includes("tabulation") || nameLower.includes("normal") || nameLower.includes("table")) icon = "fa-table";
        else if (nameLower.includes("excel") || nameLower.includes("sheet") || nameLower.includes("csv")) icon = "fa-file-excel";
        else if (nameLower.includes("admit") || nameLower.includes("card") || nameLower.includes("id")) icon = "fa-id-card-clip";
        else if (nameLower.includes("cert") || nameLower.includes("degree")) icon = "fa-certificate";
        else if (nameLower.includes("qr") || nameLower.includes("code")) icon = "fa-qrcode";
        else if (nameLower.includes("mark") || nameLower.includes("grade")) icon = "fa-award";

        return `
            <label class="relative flex flex-col p-6 border-2 rounded-2xl cursor-pointer transition-all ${isChecked ? 'border-primary bg-blue-50/60 shadow-md ring-2 ring-blue-500/20' : 'border-gray-100 hover:border-gray-300 bg-white'}">
                <input type="radio" name="formatOption" value="${fmt.name}" ${isChecked ? 'checked' : ''} class="absolute right-4 top-4 w-5 h-5 accent-primary" />
                <i class="fa-solid ${icon} text-3xl mb-4 ${isChecked ? 'text-primary' : 'text-gray-400'}"></i>
                <span class="block font-bold text-gray-800 mb-1 text-base leading-snug">${fmt.name}</span>
                <span class="text-xs text-gray-500 leading-tight mb-4">Official result format</span>
                <div class="mt-auto pt-3 border-t border-gray-100 flex items-baseline justify-between">
                    <span class="text-xs font-semibold text-gray-500">Rate:</span>
                    <span class="text-lg font-black text-green-600">₹${fmt.rate} <span class="text-[10px] font-normal text-gray-400">/ stu</span></span>
                </div>
            </label>
        `;
    }).join('');

    return `
    <div class="min-h-screen bg-gray-50 py-10 px-4 fade-in">
        <div class="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div class="flex items-center gap-4 mb-8 border-b pb-6">
                <button id="btn-back-dash" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Publish Configuration</h2>
                    <p class="text-sm text-gray-500 mt-1">Provide examination details and select your output format</p>
                </div>
            </div>
            
            <form id="next-steps-form" class="space-y-8">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Total Students</label>
                        <input required type="number" min="1" id="res-students" value="${state.resultDetails.totalStudents}" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-colors" />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Publish Date</label>
                        <input required type="date" id="res-date" value="${state.resultDetails.examDate}" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-colors" />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Total Subjects</label>
                        <input required type="number" min="1" id="res-subjects" value="${state.resultDetails.totalSubjects}" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-colors" />
                    </div>
                </div>

                <div>
                    <div class="flex items-center justify-between mb-4">
                        <label class="block text-lg font-bold text-gray-800">Select Output Format</label>
                        <span class="text-xs text-gray-500 font-medium">Choose from admin configured formats</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        ${formatsHtml}
                    </div>
                </div>

                <div class="border-t pt-8 flex justify-end">
                    <button type="submit" class="bg-gray-900 text-white font-bold py-4 px-10 rounded-xl hover:bg-black transition-colors shadow-lg flex items-center">
                        Continue to Request <i class="fa-solid fa-arrow-right ml-3"></i>
                    </button>
                </div>
            </form>
        </div>
    </div>`;
}

function getPaymentView() {
    return `
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 fade-in">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 border border-gray-100 text-center">
            <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="fa-solid fa-file-invoice text-3xl text-blue-600"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Request Output Format</h2>
            <p class="text-gray-500 mb-6">You have selected <strong>${state.resultDetails.option}</strong> format. The admin will review this request and provide the required document upload slots.</p>
            
            <button id="btn-pay" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-1">
                Submit Request to Admin <i class="fa-solid fa-arrow-right ml-2"></i>
            </button>
            <button onclick="navigate('nextSteps')" class="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors">
                Cancel
            </button>
        </div>
    </div>
    `;
}

function getSuccessView() {
    const isExcel = state.resultDetails.option === 'excel';
    const otherServiceText = state.resultDetails.option === 'normal' ? 'Normal Tabulation' : 'Excel & Admit Card';
    
    return `
    <div class="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div class="bg-white p-12 rounded-3xl w-full max-w-2xl fade-in text-center shadow-2xl border-t-8 border-t-success relative overflow-hidden">
            <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            
            <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative z-10">
                <i class="fa-solid fa-check text-5xl text-success"></i>
            </div>
            <h1 class="text-4xl font-extrabold text-gray-800 mb-3 relative z-10">Payment Successful!</h1>
            <p class="text-gray-500 mb-10 text-lg relative z-10">A receipt has been sent to your email.</p>
            
            <div class="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-left mb-10 shadow-sm relative z-10">
                <h3 class="font-bold text-gray-900 text-xl mb-5 flex items-center"><i class="fa-solid fa-list-check text-primary mr-3"></i> What happens next?</h3>
                <ul class="space-y-5 text-gray-600 font-medium">
                    <li class="flex gap-4">
                        <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-primary flex-shrink-0 text-xs">1</div>
                        <span>Follow our admin team via email for the next procedures.</span>
                    </li>
                    <li class="flex gap-4">
                        <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-primary flex-shrink-0 text-xs">2</div>
                        <span>
                            ${isExcel 
                                ? "Our team will type all data into the website. An attached Excel sheet demo document will be sent by email soon." 
                                : "Our admin team will type all necessary details and process your selected service (" + otherServiceText + ") according to the need. Details will be sent via email."}
                        </span>
                    </li>
                    <li class="flex gap-4">
                        <div class="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0 text-xs"><i class="fa-solid fa-lock"></i></div>
                        <span>Please provide all final data with dates. <strong class="text-gray-900">Note: All data is highly confidential.</strong></span>
                    </li>
                </ul>
            </div>

            <button id="btn-finish" class="bg-gray-900 hover:bg-black text-white font-bold py-4 px-12 rounded-xl transition-all shadow-lg hover:-translate-y-1 relative z-10">
                Return to Dashboard
            </button>
        </div>
    </div>`;
}


// -----------------------------------------------------------
// Event Listeners Registration
// -----------------------------------------------------------


function attachEventListeners() {
    // Active countdown timer initialization for security lockout
    setupLockoutCountdown();

    const btnEnter = document.getElementById('btn-enter-dashboard');
    if (btnEnter) {
        btnEnter.addEventListener('click', () => {
            state.showWelcomeModal = false;
            render();
        });
    }

    const tabBtns = document.querySelectorAll('.sidebar-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.activeTab = btn.getAttribute('data-tab');
            render();
        });
    });
    
    // AUTH TABS
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    
    if (tabLogin) tabLogin.addEventListener('click', () => { state.authMode = 'login'; state.errorMsg = ''; render(); });
    if (tabRegister) tabRegister.addEventListener('click', () => { state.authMode = 'register'; state.errorMsg = ''; render(); });

    // AUTH FORM
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Client-side lockout guard
            if (state.authMode === 'register') {
                const remaining = getLockoutRemainingSeconds();
                if (remaining > 0) {
                    const m = Math.floor(remaining / 60);
                    const s = remaining % 60;
                    state.errorMsg = `Security Lockout Active: Account creation is locked for ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}. Please wait.`;
                    render();
                    return;
                }
            }

            const email = document.getElementById('email-input').value.trim().toLowerCase();
            state.email = email;
            state.isNewUser = (state.authMode === 'register');
            
            const btn = authForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Sending OTP...';
            btn.disabled = true;
            
            try {
                const res = await fetch(`${API_BASE}/auth/send-code`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, mode: state.authMode })
                });
                
                const data = await res.json();
                btn.innerHTML = originalText;
                btn.disabled = false;
                
                // Handle 5-minute security lockout (3 failed attempts or active lock)
                if (res.status === 429 || data.locked) {
                    const secs = data.remaining_seconds || 300;
                    setRegistrationLockout(secs);
                    state.errorMsg = data.error || 'System is locked for 5 minutes due to 3 unauthorized registration attempts.';
                    render();
                    return;
                }

                if (!res.ok) {
                    state.errorMsg = data.error || 'Failed to send verification code.';
                    render();
                    return;
                }
                
                if (state.isNewUser) {
                    const nameInput = document.getElementById('name-input');
                    if (nameInput) state.instituteData.name = nameInput.value;
                }
                
                navigate('verify');
            } catch (err) {
                state.errorMsg = 'Server error. Is the Python backend running?';
                render();
            }
        });
    }

    // VERIFY
    const verifyForm = document.getElementById('verify-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('verify-code').value;
            if (code.length < 4) {
                state.errorMsg = 'Enter a valid verification code.';
                render();
                return;
            }
            
            const btn = verifyForm.querySelector('button[type="submit"]');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Verifying...';
            btn.disabled = true;
            
            try {
                const res = await fetch(`${API_BASE}/auth/verify`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email: state.email, code, isNewUser: state.isNewUser })
                });
                const data = await res.json();
                
                if (!res.ok) {
                    state.errorMsg = data.error;
                    render();
                    return;
                }
                
                // Save session on successful login
                localStorage.setItem('igyr_session_email', state.email);
                state.showWelcomeModal = true;
                state.activeTab = 'profile';
                
                if (state.isNewUser) {
                    navigate('profileSetup');
                } else {
                    if (data.status === 'pending') navigate('pending');
                    else navigate('dashboard');
                }
            } catch (err) {
                state.errorMsg = 'Server error.';
                render();
            }
        });
    }

    // POLICY FORM (IGYR – Privacy Policy & Terms and Conditions)
    const policyForm = document.getElementById('policy-form');
    if (policyForm) {
        policyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const checkbox = document.getElementById('policy-agree-checkbox');
            if (checkbox && !checkbox.checked) {
                alert('Please mark the agreement checkbox to accept the IGYR Privacy Policy & Terms and Conditions before continuing.');
                return;
            }

            const btn = document.getElementById('btn-submit-policy');
            const origText = btn ? btn.innerHTML : '';
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Registering Account for Approval...';
                btn.disabled = true;
            }

            try {
                const res = await fetch(`${API_BASE}/institutes/register`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email: state.email, instituteData: state.instituteData })
                });
                const data = await res.json();
                
                if (res.ok) {
                    state.appStatus = 'pending';
                    navigate('pending');
                } else {
                    alert(data.error || 'Failed to submit registration for approval.');
                    if (btn) {
                        btn.innerHTML = origText;
                        btn.disabled = false;
                    }
                }
            } catch (err) {
                alert('Server error. Please ensure the backend is running.');
                if (btn) {
                    btn.innerHTML = origText;
                    btn.disabled = false;
                }
            }
        });
    }

    // PROFILE SETUP (Institution Details)
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        const stateSelect = document.getElementById('inst-state');
        const distSelect = document.getElementById('inst-district');
        
        if (stateSelect && distSelect && typeof indiaData !== 'undefined') {
            const selState = stateSelect.getAttribute('data-selected');
            const selDist = distSelect.getAttribute('data-selected');
            
            indiaData.states.forEach(stateObj => {
                const opt = document.createElement('option');
                opt.value = stateObj.state;
                opt.textContent = stateObj.state;
                if (selState && selState === stateObj.state) opt.selected = true;
                stateSelect.appendChild(opt);
            });
            
            if (selState) {
                const stateInfo = indiaData.states.find(s => s.state === selState);
                if (stateInfo && stateInfo.districts) {
                    stateInfo.districts.forEach(dist => {
                        const opt = document.createElement('option');
                        opt.value = dist;
                        opt.textContent = dist;
                        if (selDist && selDist === dist) opt.selected = true;
                        distSelect.appendChild(opt);
                    });
                    distSelect.disabled = false;
                }
            }

            stateSelect.addEventListener('change', (e) => {
                const selectedState = e.target.value;
                const stateInfo = indiaData.states.find(s => s.state === selectedState);
                
                distSelect.innerHTML = '<option value="" disabled selected>Select District</option>';
                
                if (stateInfo && stateInfo.districts) {
                    stateInfo.districts.forEach(dist => {
                        const opt = document.createElement('option');
                        opt.value = dist;
                        opt.textContent = dist;
                        distSelect.appendChild(opt);
                    });
                    distSelect.disabled = false;
                } else {
                    distSelect.disabled = true;
                }
            });
        }

        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            state.instituteData.type = document.getElementById('inst-type').value;
            state.instituteData.mobile = document.getElementById('inst-mobile').value;
            state.instituteData.state = document.getElementById('inst-state').value;
            state.instituteData.district = document.getElementById('inst-district').value;
            state.instituteData.address = document.getElementById('inst-address').value;
            
            // Proceed to Step 2: Privacy Policy & Terms and Conditions
            navigate('policy');
        });
    }

    // PENDING VIEW
    if (state.view === 'pending') {
        // Automatically clear session so they are required to sign in after receiving the approval email
        localStorage.removeItem('igyr_session_email');
    }

    // DASHBOARD
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', () => { localStorage.removeItem('igyr_session_email'); state.isNewUser = false; state.email = ''; navigate('auth'); });

    const cardNewResult = document.getElementById('card-new-result');
    if (cardNewResult) cardNewResult.addEventListener('click', async () => {
        try {
            const res = await fetch(`${API_BASE}/institutes/status?email=${state.email}&t=${Date.now()}`);
            if (!res.ok) {
                showToast('Your institution was removed from the hub. Please log out and sign back in to re-apply.');
                return;
            }
            const data = await res.json();
            
            if (data.status === 'pending') {
                showToast('Please wait for admin approval before publishing results.');
                return;
            }
            if (data.status === 'paid') {
                showToast('You already have an active order processing. Please wait for the admin team to finish.');
                return;
            }
            
            navigate('nextSteps');
        } catch (e) {
            showToast('Failed to verify status.');
        }
    });

    // NEXT STEPS
    const btnBackDash = document.getElementById('btn-back-dash');
    if (btnBackDash) btnBackDash.addEventListener('click', () => navigate('dashboard'));

    const nextStepsForm = document.getElementById('next-steps-form');
    if (nextStepsForm) {
        const radios = document.querySelectorAll('input[name="formatOption"]');
        radios.forEach(radio => radio.addEventListener('change', (e) => { state.resultDetails.option = e.target.value; render(); }));

        nextStepsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const checkedRadio = document.querySelector('input[name="formatOption"]:checked');
            if (checkedRadio) {
                state.resultDetails.option = checkedRadio.value;
            }
            state.resultDetails.totalStudents = document.getElementById('res-students').value;
            state.resultDetails.examDate = document.getElementById('res-date').value;
            state.resultDetails.totalSubjects = document.getElementById('res-subjects').value;
            
            navigate('payment');
        });
    }

    // PAYMENT (Now just submitting request)
    const btnPay = document.getElementById('btn-pay');
    if (btnPay) btnPay.addEventListener('click', async () => {
        btnPay.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting...';
        btnPay.classList.add('bg-gray-600');
        
        try {
            const res = await fetch(`${API_BASE}/institutes/order`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email: state.email, resultDetails: state.resultDetails })
            });
            if (res.ok) {
                setTimeout(() => navigate('dashboard'), 1000);
            } else {
                showToast('Order failed. Please contact support.');
                navigate('dashboard');
            }
        } catch(e) {
            showToast('Network error.');
        }
    });

    // UPLOAD DOCUMENTS
    const btnUpload = document.getElementById('btn-upload');
    if (btnUpload) btnUpload.addEventListener('click', async () => {
        const fileInput = document.getElementById('file-upload');
        if(!fileInput.files.length) { showToast('Please select a file!'); return; }
        
        const formData = new FormData();
        formData.append('email', state.email);
        formData.append('file', fileInput.files[0]);
        
        btnUpload.innerHTML = 'Uploading...';
        try {
            const res = await fetch(`${API_BASE}/institutes/upload`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                showToast('Documents uploaded successfully!');
                navigate('dashboard');
            }
        } catch(e) { showToast('Upload failed'); }
    });

    // VERIFY TABULATION
    const btnVerifyApprove = document.getElementById('btn-verify-approve');
    if (btnVerifyApprove) btnVerifyApprove.addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE}/institutes/verify-response`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email: state.email, response: 'approve' })
            });
            showToast('Verified!'); navigate('dashboard');
        } catch(e) {}
    });

    const btnVerifyReject = document.getElementById('btn-verify-reject');
    if (btnVerifyReject) btnVerifyReject.addEventListener('click', async () => {
        const reason = prompt("Please provide a reason and new data details:");
        if (!reason) return;
        try {
            await fetch(`${API_BASE}/institutes/verify-response`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email: state.email, response: 'reject', reason })
            });
            showToast('Rejection sent to admin.'); navigate('dashboard');
        } catch(e) {}
    });
}
// Init
document.addEventListener('DOMContentLoaded', () => { if(state.email) { navigate('dashboard'); } else { render(); } });

async function reapplyOrder() {
    try {
        await fetch(`${API_BASE}/institutes/reapply`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: state.email})
        });
        navigate('dashboard');
    } catch(e) { showToast('Failed'); }
}

window.printReceipt = (txnId) => {
    const txn = state.payments.transactions.find(t => t.id === txnId);
    if (!txn) return;
    
    let phaseName = 'Payment Phase';
    if (state.payments.phases) {
        const phase = state.payments.phases.find(p => p.id === txn.phase_id);
        if (phase) phaseName = phase.name;
    }
    
    const instName = state.instituteData.name || 'Institute';
    
    const instEmail = state.email || 'N/A';
    const igyrId = state.igyr_id || 'N/A';
    
    // Determine the base URL for the logo so it loads correctly in the new window
    const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    
    const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Official Payment Receipt - ${txnId}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
            :root { --primary: #0ea5e9; --success: #10b981; --dark: #1e293b; --gray: #64748b; --light: #f1f5f9; }
            body { font-family: 'Inter', sans-serif; padding: 40px; color: var(--dark); background: #f8fafc; margin: 0; }
            .receipt-box { background: white; border: 1px solid #e2e8f0; max-width: 700px; margin: 0 auto; padding: 50px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-radius: 12px; }
            
            .header-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 2px solid var(--light); }
            .brand-col { display: flex; flex-direction: column; }
            .brand-title { font-size: 24px; font-weight: 800; color: var(--dark); margin: 0 0 5px 0; letter-spacing: -0.5px; }
            .brand-subtitle { font-size: 14px; color: var(--gray); margin: 0; }
            .logo-img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--light); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            
            .receipt-title { font-size: 32px; font-weight: 800; color: var(--success); margin: 0 0 5px 0; letter-spacing: 1px; text-transform: uppercase; }
            .receipt-no { font-size: 14px; font-weight: 600; color: var(--gray); margin: 0; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; background: var(--light); padding: 25px; border-radius: 8px; }
            .info-block { display: flex; flex-direction: column; }
            .info-label { font-size: 12px; text-transform: uppercase; font-weight: 800; color: var(--gray); margin-bottom: 8px; letter-spacing: 1px; }
            .info-val { font-size: 15px; font-weight: 600; color: var(--dark); }
            
            .table-container { margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; padding: 15px; background: var(--dark); color: white; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
            td { padding: 15px; border-bottom: 1px solid var(--light); font-size: 15px; font-weight: 600; }
            .amount-col { text-align: right; }
            
            .total-row td { background: #f0fdf4; border-bottom: none; font-size: 18px; color: var(--success); }
            .total-val { font-size: 24px; font-weight: 800; }
            
            .footer { text-align: center; font-size: 12px; color: var(--gray); margin-top: 50px; border-top: 2px dashed var(--light); padding-top: 30px; line-height: 1.6; }
            .stamp { color: var(--success); font-weight: 800; font-size: 18px; letter-spacing: 2px; margin-bottom: 10px; display: inline-block; border: 2px solid var(--success); padding: 8px 20px; border-radius: 4px; transform: rotate(-5deg); opacity: 0.8; }
            
            @media print {
                body { padding: 0; background: white; }
                .receipt-box { border: none; box-shadow: none; margin: 0; padding: 20px; max-width: 100%; }
                .stamp { border: 2px solid #10b981; color: #10b981; }
            }
        </style>
    </head>
    <body>
        <div class="receipt-box">
            <div class="header-flex">
                <div class="brand-col">
                    <img src="${baseUrl}logo.jpg" alt="IGYR Logo" class="logo-img" onerror="this.style.display='none'">
                    <h2 class="brand-title" style="margin-top: 15px;">India Get Your Result</h2>
                    <p class="brand-subtitle">Official Result Publication Hub</p>
                </div>
                <div style="text-align: right;">
                    <h1 class="receipt-title">RECEIPT</h1>
                    <p class="receipt-no">#${txnId.replace('txn_', 'RCPT-').toUpperCase()}</p>
                    <p style="font-size: 14px; font-weight: 600; color: var(--gray); margin-top: 10px;">Date: ${new Date(txn.date + (txn.date.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12: true})}</p>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-block">
                    <span class="info-label">Billed To</span>
                    <span class="info-val">${instName}</span>
                    <span class="info-val" style="font-weight: 400; color: var(--gray); font-size: 14px; margin-top: 4px;">${instEmail}</span>
                </div>
                <div class="info-block">
                    <span class="info-label">Institute Reference ID</span>
                    <span class="info-val" style="font-family: monospace; font-size: 16px; background: white; padding: 4px 8px; border-radius: 4px; display: inline-block; border: 1px solid #e2e8f0; width: fit-content;">${igyrId}</span>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="amount-col">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div>Payment against billing phase:</div>
                                <div style="font-size: 13px; color: var(--gray); font-weight: 400; margin-top: 4px;">${phaseName}</div>
                            </td>
                            <td class="amount-col">₹${txn.amount}</td>
                        </tr>
                        <tr class="total-row">
                            <td style="text-align: right; font-weight: 800; text-transform: uppercase;">Total Received</td>
                            <td class="amount-col total-val">₹${txn.amount}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div style="text-align: center; margin-top: 40px;">
                <div class="stamp">PAID IN FULL</div>
            </div>
            
            <div class="footer">
                <p>This is a computer-generated official receipt and does not require a physical signature.</p>
                <p><strong>Note:</strong> All payments are final and non-refundable once the publication process has begun.</p>
                <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} India Get Your Result. All rights reserved.</p>
            </div>
        </div>
        <script>
            window.onload = function() { setTimeout(() => { window.print(); }, 800); }
        </script>
    </body>
    </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
    } else {
        showToast("Please allow popups to print the receipt.");
    }
};

window.dismissWelcome = () => { console.log('dismissWelcome clicked'); state.showWelcomeModal = false; render(); };
window.changeTab = (tabId) => { console.log('changeTab clicked', tabId); state.activeTab = tabId; render(); };


window.showToast = function(msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-5 right-5 space-y-3 z-[9999]';
        document.body.appendChild(container);
    }
    const isError = msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('invalid');
    const type = isError ? 'error' : 'success';
    const toast = document.createElement('div');
    const bg = type === 'error' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700';
    const icon = type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check';
    toast.className = `flex items-center p-4 mb-4 text-sm rounded-lg border-l-4 shadow-xl ${bg} transition-all duration-300 transform translate-y-10 opacity-0 min-w-[300px]`;
    toast.innerHTML = `<i class="fa-solid ${icon} text-xl mr-3"></i><span class="font-bold">${msg}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);
    
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}


// Auto-poll for live real-time updates across multiple devices
setInterval(async () => {
    if (state.isLoggedIn && state.email && state.view === 'dashboard') {
        try {
            const res = await fetch(`${API_BASE}/institutes/status?email=${state.email}&t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                
                const currentHash = JSON.stringify(data);
                if (lastAppDataHash === currentHash) return; 
                lastAppDataHash = currentHash;
                
                state.appStatus = data.status;
                if (data.institute && data.institute.name) {
                    state.instituteData = data.institute;
                }
                state.igyr_id = data.igyr_id || '';
                state.payments = data.payments || {total: 0, paid: 0, phases: []};
                state.details = data.details || {};
                state.tabulation_file = data.tabulation_file || null;
                state.history = data.history || [];
                state.rejection_reason = data.institute?.rejection_reason || data.rejection_reason || '';
                
                render(); // Soft re-render
            }
        } catch(e) {}
    }
}, 3000);
