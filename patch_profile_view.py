import re

with open('app.js', 'r') as f:
    content = f.read()

old_view = """function getProfileSetupView() {
    return `
    <div class="min-h-screen bg-gray-50 py-10 px-4 fade-in">
        <div class="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div class="text-center mb-8 border-b pb-6">
                <span class="text-xs font-bold uppercase tracking-widest text-primary bg-blue-50 px-3 py-1 rounded-full mb-3 inline-block">Step 2 of 2</span>
                <h2 class="text-3xl font-bold text-gray-800">Complete Institution Profile</h2>
                <p class="text-gray-500 mt-2">We need these details to verify your account before you can publish results.</p>
            </div>
            
            ${getErrorHTML()}
            
            <form id="profile-form" class="space-y-6">
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Type of Institute</label>
                        <select required id="inst-type" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all">
                            <option value="">Select Type</option>
                            <option value="School">School</option>
                            <option value="College">College</option>
                            <option value="University">University</option>
                            <option value="Coaching">Coaching Center</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                        <input required type="tel" id="inst-mobile" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all" />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">State (All India)</label>
                        <select required id="inst-state" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all bg-white">
                            <option value="" disabled selected>Select State</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">District</label>
                        <select required id="inst-district" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all bg-white" disabled>
                            <option value="" disabled selected>Select District</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Full Address</label>
                    <textarea required id="inst-address" rows="3" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all resize-none"></textarea>
                </div>
                <button type="submit" class="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-primary/40 transform hover:-translate-y-1 transition-all mt-6 text-lg">
                    Submit Details & Request Approval <i class="fa-solid fa-paper-plane ml-2"></i>
                </button>
            </form>
        </div>
    </div>`;
}"""

new_view = """function getProfileSetupView() {
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
                <span class="text-xs font-bold uppercase tracking-widest text-primary bg-blue-50 px-3 py-1 rounded-full mb-3 inline-block">Step 2 of 2</span>
                <h2 class="text-3xl font-bold text-gray-800">Complete Institution Profile</h2>
                <p class="text-gray-500 mt-2">We need these details to verify your account before you can publish results.</p>
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
                <button type="submit" class="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-primary/40 transform hover:-translate-y-1 transition-all mt-6 text-lg">
                    ${isRejected ? 'Submit & Reapply <i class="fa-solid fa-rotate-right ml-2"></i>' : 'Submit Details & Request Approval <i class="fa-solid fa-paper-plane ml-2"></i>'}
                </button>
            </form>
        </div>
    </div>`;
}"""

if old_view in content:
    content = content.replace(old_view, new_view)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Patched profile view UI!")
else:
    print("Could not find old profile UI block!")
