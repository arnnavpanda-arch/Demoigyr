import re

with open('app.js', 'r') as f:
    content = f.read()

old_view = """function getVerifyView() {
    return `
    <div class="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <div class="bg-white p-8 rounded-3xl w-full max-w-md fade-in text-center shadow-2xl border border-gray-100">
            <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="fa-solid fa-shield-halved text-4xl text-primary"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Verification Required</h2>
            <p class="text-gray-600 mb-8 text-sm">We've sent a 4-digit code to <br/><strong class="text-gray-800">${state.email}</strong></p>
            ${getErrorHTML()}
            <form id="verify-form" class="space-y-6">"""

new_view = """function getVerifyView() {
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
            <form id="verify-form" class="space-y-6">"""

if old_view in content:
    content = content.replace(old_view, new_view)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Patched Verify View!")
else:
    print("Could not find old verify view!")
