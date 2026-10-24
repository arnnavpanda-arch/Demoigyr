let lastAdminDataHash = '';
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

async function loadApplication() {
    const pendingContainer = document.getElementById('application-container');
    const postContainer = document.getElementById('post-payment-container');
    const paymentsListContainer = document.getElementById('payments-list-container');
    const registeredContainer = document.getElementById('registered-container');
    
    if (!pendingContainer || !postContainer) return;
    
    try {
        const res = await fetch(`${API_BASE}/admin/institutes?t=${Date.now()}`);
        if (!res.ok) {
            throw new Error(`Failed to fetch institutes: HTTP ${res.status}`);
        }
        const data = await res.json();
        const institutes = Array.isArray(data) ? data : [];
        
        // Auto-refresh logic (only re-render if data actually changed)
        const currentHash = JSON.stringify(institutes);
        if (lastAdminDataHash === currentHash) return; // No changes, do not flicker UI
        
        let pendingHtml = '';
        let postHtml = '';
        let registeredHtml = '';
        let paymentsListHtml = '';
        const publishContainer = document.getElementById('publish-list');
        if (publishContainer) publishContainer.innerHTML = '';
        let publishInstitutes = [];
        
        window.allInstitutesData = institutes; // Store globally for modal

        institutes.forEach(inst => {
            // PENDING REGISTRATIONS

            if (inst.status === 'ready_to_publish') {
                publishInstitutes.push(inst);
            }

            if (inst.status === 'pending') {
                pendingHtml += `
                    <div class="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow relative">
                        <div class="absolute top-0 left-0 w-full h-1 bg-yellow-400 rounded-t-xl"></div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-lg mb-1">${inst.institute?.name || 'Unknown Institute'}</h4>
                            
                            <div class="flex flex-col gap-2 mt-4">
                                <div class="flex items-center text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 w-full overflow-hidden">
                                    <i class="fa-solid fa-envelope w-7 text-blue-500 text-center shrink-0"></i>
                                    <span class="truncate font-medium">${inst.email}</span>
                                </div>
                                <div class="flex items-center text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 w-full overflow-hidden">
                                    <i class="fa-solid fa-phone w-7 text-green-500 text-center shrink-0"></i>
                                    <span class="font-medium">${inst.institute?.mobile || 'N/A'}</span>
                                </div>
                                <div class="flex items-center text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 w-full overflow-hidden">
                                    <i class="fa-solid fa-location-dot w-7 text-red-500 text-center shrink-0"></i>
                                    <span class="truncate font-medium">${inst.institute?.district || 'N/A'}, ${inst.institute?.state || 'N/A'}</span>
                                </div>
                                <div class="flex items-center text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 w-full overflow-hidden">
                                    <i class="fa-solid fa-building w-7 text-purple-500 text-center shrink-0"></i>
                                    <span class="font-bold text-gray-800 tracking-wide">${inst.institute?.type || 'N/A'}</span>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
                                <button onclick="updateStatus('${inst.email}', 'approved')" class="w-full bg-green-600 hover:bg-green-700 text-white px-2 py-3 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center">
                                    <i class="fa-solid fa-check mr-2"></i> Approve
                                </button>
                                <button onclick="rejectRegistration('${inst.email}')" class="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 px-2 py-3 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center">
                                    <i class="fa-solid fa-xmark mr-2"></i> Reject
                                </button>
                            </div>
                        </div>
                    </div>`;
            }

            // REGISTERED INSTITUTES TAB & PAYMENTS LIST
            if (inst.status !== 'pending' && inst.status !== 'removed') {
                if (paymentsListContainer) {
                    paymentsListHtml += `
                        <tr class="hover:bg-gray-50 payment-row">
                            <td class="p-3 font-mono text-xs payment-id">${inst.igyr_id || 'IGYR-WAITING'}</td>
                            <td class="p-3 font-bold payment-name">${inst.institute?.name || 'Unknown'}</td>
                            <td class="p-3 uppercase text-[10px] font-bold text-gray-500">${inst.status === 'approved' ? 'Idle / No Order' : inst.status}</td>
                            <td class="p-3 text-right">
                                <button onclick="openPaymentModal('${inst.email}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors">
                                    Manage Ledger
                                </button>
                            </td>
                        </tr>
                    `;
                }
                
                if (registeredContainer) {
                const totalPublished = (inst.history || []).length;
                registeredHtml += `
                    <div class="border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer" onclick="showInstituteDetails('${inst.email}')">
                        <span class="absolute top-3 right-3 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            ${inst.igyr_id || 'IGYR-WAITING'}
                        </span>
                        <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                            <i class="fa-solid fa-building-columns text-xl"></i>
                        </div>
                        <h4 class="font-bold text-gray-800 line-clamp-1">${inst.institute?.name || 'Unknown'}</h4>
                        <p class="text-xs text-gray-500 mb-3">${inst.email}</p>
                        
                        <div class="flex justify-between items-center text-xs pt-3 border-t">
                            <span class="font-bold text-gray-600"><i class="fa-solid fa-trophy text-yellow-500 mr-1"></i> ${totalPublished} Results</span>
                            <span class="uppercase tracking-wider font-bold ${inst.status === 'approved' ? 'text-green-500' : 'text-blue-500'}">${inst.status}</span>
                        </div>
                    </div>
                `;
                }
            }
            
            
            // ACTIVE ORDERS & PAYMENTS (SPLIT)
            if (['order_placed', 'documents_required', 'processing', 'verification_pending', 'published'].includes(inst.status)) {
                
                // 1. ORDER ACTIONS HTML (Goes to postContainer)
                let actionsHtml = '';
                if(inst.status === 'order_placed') {
                    actionsHtml = `
                        <div class="flex gap-2">
                            <button onclick="approveFormat('${inst.email}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold flex-1">Approve Format & Request Data</button>
                            <button onclick="rejectOrder('${inst.email}')" class="bg-red-100 hover:bg-red-600 hover:text-white text-red-600 px-4 py-2 rounded text-sm font-bold flex-1 border border-red-200 transition-colors">Reject Order</button>
                        </div>
                    `;
                }
                else if(inst.status === 'documents_required') {
                    actionsHtml = `<p class="text-xs text-purple-600 font-bold"><i class="fa-solid fa-clock"></i> Waiting for institute to upload documents...</p>`;
                }
                else if(inst.status === 'processing') {
                    actionsHtml = `
                        <div class="mt-3 border-t pt-3 flex flex-col gap-2">
                            <label class="text-xs font-bold text-gray-700">Upload & Send Tabulation Register:</label>
                            <div class="flex items-center gap-2">
                                <input type="file" id="file-${inst.email}" class="text-xs border p-1 w-full rounded bg-white">
                                <button onclick="sendVerificationWithFile('${inst.email}')" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap"><i class="fa-solid fa-paper-plane mr-1"></i> Send</button>
                            </div>
                        </div>
                    `;
                }
                else if(inst.status === 'verification_pending') {
                    actionsHtml = `<p class="text-xs text-orange-600 font-bold"><i class="fa-solid fa-clock"></i> Waiting for institute to approve tabulation...</p>`;
                }
                
                
                let badgeClass = 'bg-gray-100 text-gray-600';
                let statusIcon = 'fa-circle-dot';
                let statusText = inst.status.replace('_', ' ').toUpperCase();
                
                if(inst.status === 'order_placed') { badgeClass = 'bg-blue-100 text-blue-700'; statusIcon = 'fa-cart-plus'; statusText = 'FORMAT APPROVAL PENDING'; }
                if(inst.status === 'documents_required') { badgeClass = 'bg-purple-100 text-purple-700'; statusIcon = 'fa-file-arrow-up'; statusText = 'WAITING FOR DATA UPLOAD'; }
                if(inst.status === 'processing') { badgeClass = 'bg-orange-100 text-orange-700'; statusIcon = 'fa-gears'; statusText = 'IN PROCESSING'; }
                if(inst.status === 'verification_pending') { badgeClass = 'bg-yellow-100 text-yellow-700'; statusIcon = 'fa-clipboard-check'; statusText = 'WAITING FOR VERIFICATION'; }
                if(inst.status === 'ready_to_publish') { badgeClass = 'bg-pink-100 text-pink-700'; statusIcon = 'fa-cloud-arrow-up'; statusText = 'READY TO PUBLISH'; }
                if(inst.status === 'published') { badgeClass = 'bg-green-100 text-green-700'; statusIcon = 'fa-check-double'; statusText = 'PUBLISHED'; }

                let adminDocsHtml = (inst.status === 'verification_pending') ? `<div class="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm flex items-start gap-2"><i class="fa-solid fa-envelope-circle-check text-yellow-600 mt-0.5"></i><span class="text-yellow-800 font-medium">Tabulation Register Sent to Client via Email. Awaiting their approval.</span></div>` : '';
                
                let docsHtml = '';
                if(inst.documents && inst.documents.length) {
                    docsHtml = `<div class="mt-4"><p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"><i class="fa-solid fa-folder-open text-blue-500 mr-1"></i> Client Uploaded Documents:</p><div class="flex flex-wrap gap-2">` + 
                    inst.documents.map(d => `<a href="${API_BASE}/files/${d}" target="_blank" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border shadow-sm"><i class="fa-solid fa-file-arrow-down text-blue-600 mr-1"></i> ${d.substring(0,20)}...</a>`).join('') + 
                    `</div></div>`;
                }

                postHtml += `
                    <div class="bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
                        <!-- Card Header -->
                        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gradient-to-br from-white to-gray-50">
                            <div>
                                <div class="mb-1 flex items-center gap-2 flex-wrap">
                                    <span class="bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded font-mono tracking-wider shadow-sm">${inst.igyr_id || 'IGYR-WAITING'}</span>
                                    <h4 class="font-black text-gray-800 text-lg">${inst.institute?.name || 'Unknown Institute'}</h4>
                                </div>
                                <div class="flex items-center gap-3">
                                    <p class="text-xs text-gray-500 font-mono"><i class="fa-regular fa-envelope mr-1"></i> ${inst.email}</p>
                                    <div onclick="showInstituteDetails('${inst.email}')" class="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline transition-colors flex items-center gap-1 cursor-pointer z-10 relative">
                                        <i class="fa-solid fa-up-right-from-square"></i> View Profile
                                    </div>
                                </div>
                            </div>
                            <span class="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${badgeClass} border border-opacity-50 border-current shadow-sm flex items-center gap-1 whitespace-nowrap">
                                <i class="fa-solid ${statusIcon}"></i> ${statusText}
                            </span>
                        </div>
                        
                        <!-- Order Details Grid -->
                        <div class="p-6 flex-grow">
                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Requested Format</span>
                                    <span class="font-bold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-100">${inst.details?.option?.toUpperCase() || 'N/A'}</span>
                                </div>
                                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Exam Date</span>
                                    <span class="font-bold text-gray-700 text-sm"><i class="fa-regular fa-calendar text-blue-400 mr-1"></i> ${inst.details?.examDate || 'N/A'}</span>
                                </div>
                                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Students</span>
                                    <span class="font-black text-gray-800 text-lg">${inst.details?.totalStudents || 0}</span>
                                </div>
                                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Subjects</span>
                                    <span class="font-black text-gray-800 text-lg">${inst.details?.totalSubjects || 0}</span>
                                </div>
                            </div>
                            
                            ${docsHtml}
                            ${adminDocsHtml}
                        </div>
                        
                        <!-- Action Footer -->
                        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto">
                            ${actionsHtml}
                        </div>
                    </div>
                `;



            }

        });
        
        // Empty state fallbacks if collections have no active records
        if (!pendingHtml) {
            pendingHtml = `
                <div class="col-span-full text-center text-gray-400 py-12 bg-white rounded-xl border border-dashed border-gray-200">
                    <i class="fa-solid fa-user-check text-3xl mb-2 text-emerald-500"></i>
                    <p class="text-sm font-bold text-gray-700">No New Registrations Pending Review</p>
                    <p class="text-xs text-gray-400 mt-1">All registered institutes have been processed.</p>
                </div>
            `;
        }
        
        if (!postHtml) {
            postHtml = `
                <div class="col-span-full text-center text-gray-400 py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                    <i class="fa-solid fa-boxes-stacked text-4xl mb-3 text-blue-300"></i>
                    <p class="text-base font-bold text-gray-700">No Active Orders in Pipeline</p>
                    <p class="text-xs text-gray-400 mt-1">When institutes submit results to publish, their order pipeline will appear here.</p>
                </div>
            `;
        }
        
        if (!registeredHtml) {
            registeredHtml = `
                <div class="col-span-full text-center text-gray-400 py-12 bg-white rounded-xl border border-dashed border-gray-200">
                    <i class="fa-solid fa-building-columns text-3xl mb-2 text-gray-300"></i>
                    <p class="text-sm font-bold text-gray-700">No Registered Institutes Found</p>
                </div>
            `;
        }
        
        if (!paymentsListHtml) {
            paymentsListHtml = `
                <tr>
                    <td colspan="4" class="p-8 text-center text-gray-400 text-xs">
                        No active institute ledgers found.
                    </td>
                </tr>
            `;
        }

        // Direct and reliable DOM updates
        pendingContainer.innerHTML = pendingHtml;
        postContainer.innerHTML = postHtml;
        if (registeredContainer) {
            registeredContainer.innerHTML = registeredHtml;
        }
        if (paymentsListContainer) {
            paymentsListContainer.innerHTML = paymentsListHtml;
        }
        
        if (typeof renderPublishList === 'function') {
            renderPublishList(publishInstitutes);
        }

        // Successfully updated DOM, commit current hash
        lastAdminDataHash = currentHash;

    } catch (e) {
        console.error("loadApplication error:", e);
        const errHtml = `<div class="col-span-full text-center text-red-500 py-12 border border-red-200 bg-red-50 rounded-xl"><i class="fa-solid fa-triangle-exclamation text-4xl mb-4"></i><p class="text-lg font-bold">Failed to load data</p><p class="text-sm mt-2 text-red-400 text-left bg-white p-4 overflow-x-auto mx-4 border rounded">${e.stack || e.message || e}</p></div>`;
        if (pendingContainer) pendingContainer.innerHTML = errHtml;
        if (postContainer) postContainer.innerHTML = errHtml;
        const regCont = document.getElementById("registered-container");
        if (regCont) regCont.innerHTML = errHtml;
        const payCont = document.getElementById("payments-list-container");
        if (payCont) payCont.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500 text-xs">Failed to load ledger</td></tr>`;
    }}

async function updateStatus(email, newStatus) {
    try {
        await fetch(`${API_BASE}/admin/status`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, status: newStatus })
        });
        loadApplication();
    } catch(e) { showToast('Action failed'); }
}

async function removeInstitute(email) {
    if(await confirmAction("Are you sure you want to remove this institute from the hub?")) {
        try {
            await fetch(`${API_BASE}/admin/remove?email=${email}`, { method: 'DELETE' });
            loadApplication();
        } catch(e) { showToast('Action failed'); }
    }
}

async function markTaskDone(email) {
    try {
        await fetch(`${API_BASE}/admin/mark-task-done`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email })
        });
        showToast("Task marked as completed! The client can now submit new results.");
        loadApplication();
    } catch(e) { showToast('Action failed'); }
}

async function approveFormat(email) {
    await fetch(`${API_BASE}/admin/approve-format`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email})
    });
    loadApplication();
}

async function addPhase(email) {
    const name = document.getElementById(`phase-name-${email}`).value || 'New Phase';
    const amount = parseInt(document.getElementById(`phase-amt-${email}`).value) || 0;
    if (amount <= 0) return showToast("Enter valid billed amount");
    
    await fetch(`${API_BASE}/admin/add-phase`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, name, amount})
    });
    await loadApplication();
    openPaymentModal(email);
}

async function creditPhase(email) {
    const phase_id = document.getElementById(`sel-phase-${email}`).value;
    const amount = parseInt(document.getElementById(`credit-amt-${email}`).value) || 0;
    if (amount <= 0) return showToast("Enter valid paid amount");
    
    await fetch(`${API_BASE}/admin/credit-phase`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, phase_id, amount})
    });
    await loadApplication();
    openPaymentModal(email);
}

async function sendVerification(email) {
    await fetch(`${API_BASE}/admin/send-verification`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email})
    });
    showToast('Verification requested');
    loadApplication();
}

let currentFormats = [];

window.addNewFormat = function() {
    const nameInput = document.getElementById('new-format-name');
    const rateInput = document.getElementById('new-format-rate');
    const name = nameInput ? nameInput.value.trim() : '';
    const rateVal = rateInput ? rateInput.value.trim() : '';
    
    if (!name) {
        showToast('Please enter a format name');
        if (nameInput) nameInput.focus();
        return;
    }
    const rate = Number(rateVal);
    if (isNaN(rate) || rate < 0 || rateVal === '') {
        showToast('Please enter a valid rate');
        if (rateInput) rateInput.focus();
        return;
    }
    
    currentFormats.push({ name: name, rate: rate });
    if (nameInput) nameInput.value = '';
    if (rateInput) rateInput.value = '';
    renderAdminFormatsList();
    showToast(`Added "${name}". Click "Save Changes" to apply.`);
};

window.removeFormat = function(index) {
    if (index >= 0 && index < currentFormats.length) {
        const removed = currentFormats.splice(index, 1);
        renderAdminFormatsList();
        showToast(`Removed "${removed[0]?.name}". Click "Save Changes" to apply.`);
    }
};

window.updateFormatName = function(index, val) {
    if (currentFormats[index]) {
        currentFormats[index].name = val.trim();
    }
};

window.updateFormatRate = function(index, val) {
    if (currentFormats[index]) {
        currentFormats[index].rate = Number(val) || 0;
    }
};

function renderAdminFormatsList() {
    const container = document.getElementById('formats-list-container');
    if (!container) return;
    
    if (!currentFormats || currentFormats.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                <i class="fa-solid fa-layer-group text-2xl mb-2 text-gray-300"></i>
                <p>No custom formats added yet. Add your first format above!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentFormats.map((fmt, idx) => `
        <div class="flex items-center justify-between gap-3 bg-white border border-gray-200 hover:border-gray-300 p-3 rounded-xl shadow-sm transition-all">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    ${idx + 1}
                </div>
                <div class="flex-1 min-w-0">
                    <input type="text" value="${fmt.name}" onchange="updateFormatName(${idx}, this.value)" class="w-full font-bold text-gray-800 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white px-2 py-1 rounded outline-none transition-all" placeholder="Format Name" />
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <div class="relative w-28">
                    <span class="absolute left-3 top-2 text-gray-400 font-bold text-xs">₹</span>
                    <input type="number" min="0" value="${fmt.rate}" onchange="updateFormatRate(${idx}, this.value)" class="w-full pl-7 pr-2 py-1.5 text-sm font-bold text-green-700 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-blue-500 rounded-lg outline-none transition-all" placeholder="Rate" />
                </div>
                <span class="text-xs text-gray-400 font-medium">/stu</span>
                <button type="button" onclick="removeFormat(${idx})" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors ml-1" title="Delete format">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function loadPricing() {
    try {
        const res = await fetch(`${API_BASE}/pricing?t=${Date.now()}`);
        if (!res.ok) return;
        const p = await res.json();
        
        currentFormats = (p.formats && p.formats.length > 0) ? p.formats : [
            { name: "Normal Tabulation", rate: p.normal || 50 },
            { name: "Excel Sheet", rate: p.excel || 100 },
            { name: "Admit card + Any type of Tabulation", rate: p.both || 150 }
        ];
        renderAdminFormatsList();
        
        if (document.getElementById('price-subject')) document.getElementById('price-subject').value = p.subject_rate || 0;
        if (document.getElementById('bank-account')) document.getElementById('bank-account').value = p.bank_account || '';
        if (document.getElementById('bank-ifsc')) document.getElementById('bank-ifsc').value = p.ifsc || '';
        if (document.getElementById('bank-phone')) document.getElementById('bank-phone').value = p.phone || '';
        if (document.getElementById('config-message')) document.getElementById('config-message').value = p.message || '';
    } catch(e) {
        console.error("loadPricing error:", e);
    }
}

function initPricingForm() {
    const pricingForm = document.getElementById('pricing-form');
    if (pricingForm && !pricingForm.dataset.initialized) {
        pricingForm.dataset.initialized = 'true';
        pricingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const p = {
                formats: currentFormats,
                subject_rate: document.getElementById('price-subject') ? document.getElementById('price-subject').value : 0,
                bank_account: document.getElementById('bank-account') ? document.getElementById('bank-account').value : '',
                ifsc: document.getElementById('bank-ifsc') ? document.getElementById('bank-ifsc').value : '',
                phone: document.getElementById('bank-phone') ? document.getElementById('bank-phone').value : '',
                message: document.getElementById('config-message') ? document.getElementById('config-message').value : ''
            };
            try {
                const res = await fetch(`${API_BASE}/admin/pricing`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(p)
                });
                if (res.ok) {
                    showToast('Rate Card & Custom Formats Updated!');
                } else {
                    showToast('Failed to update pricing');
                }
            } catch(e) { showToast('Failed to update'); }
        });
    }
}

async function sendVerificationWithFile(email) {
    const fileInput = document.getElementById(`file-${email}`);
    if (!fileInput.files.length) {
        showToast("Please select a file to send for verification!");
        return;
    }
    const formData = new FormData();
    formData.append('email', email);
    formData.append('file', fileInput.files[0]);
    
    try {
        const btn = fileInput.nextElementSibling;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        const res = await fetch(`${API_BASE}/admin/upload-tabulation`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            showToast('Tabulation sent to client for verification!');
            loadApplication();
        } else {
            showToast('Failed to send tabulation');
            btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i> Send';
        }
    } catch(e) { showToast('Upload error'); }
}

async function rejectOrder(email) {
    const reason = prompt("Enter reason for rejecting this order (this will be emailed to the client):");
    if (!reason) return;
    
    try {
        await fetch(`${API_BASE}/admin/reject-order`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, reason})
        });
        showToast('Order rejected and email sent.');
        loadApplication();
    } catch(e) { showToast('Action failed'); }
}

function showInstituteDetails(email) {
    console.log("showInstituteDetails called with:", email);
    const inst = window.allInstitutesData.find(i => i.email === email);
    if(!inst) {
        console.error("Institute not found in window.allInstitutesData:", email);
        return;
    }
    
    const profile = inst.institute || {};
    const totalPublished = (inst.history || []).length;
    
    document.getElementById('institute-modal-content').innerHTML = `
        <div class="flex justify-between items-start mb-6">
            <div>
                <h2 class="text-2xl font-black text-gray-800">${profile.name || 'Unknown'}</h2>
                <p class="text-sm text-gray-500 mt-1 font-mono">${inst.igyr_id || 'ID Pending'}</p>
            </div>
            <span class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">${inst.status}</span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 p-4 rounded-xl border">
                <span class="text-xs text-gray-500 uppercase font-bold block mb-1">Contact Info</span>
                <p class="text-sm font-medium"><i class="fa-solid fa-envelope mr-2 text-gray-400"></i> ${inst.email}</p>
                <p class="text-sm font-medium mt-1"><i class="fa-solid fa-phone mr-2 text-gray-400"></i> ${profile.mobile || 'N/A'}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl border">
                <span class="text-xs text-gray-500 uppercase font-bold block mb-1">Location</span>
                <p class="text-sm font-medium"><i class="fa-solid fa-location-dot mr-2 text-gray-400"></i> ${profile.district || 'N/A'}, ${profile.state || 'N/A'}</p>
                <p class="text-sm font-medium mt-1"><i class="fa-solid fa-building mr-2 text-gray-400"></i> ${profile.type || 'Institute'}</p>
            </div>
        </div>
        
        <div class="mb-6">
            <h4 class="font-bold text-gray-700 mb-2 border-b pb-1">Activity Overview</h4>
            <div class="flex items-center gap-4 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div class="flex-1 text-center">
                    <span class="block text-2xl font-black text-blue-600">${totalPublished}</span>
                    <span class="text-xs text-blue-800 uppercase font-bold">Results Published</span>
                </div>
                <div class="w-px h-10 bg-blue-200"></div>
                <div class="flex-1 text-center">
                    <span class="block text-2xl font-black text-blue-600">${(inst.history || []).reduce((acc, h) => acc + parseInt(h.details?.totalStudents || 0), 0)}</span>
                    <span class="text-xs text-blue-800 uppercase font-bold">Total Students Processed</span>
                </div>
            </div>
        </div>
        
        <div class="border-t pt-4 flex justify-end">
            <button onclick="removeInstitute('${inst.email}')" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-4 py-2 rounded font-bold text-sm transition-colors">
                <i class="fa-solid fa-trash-can mr-2"></i> Delete / Remove Institute
            </button>
        </div>
    `;
    
    document.getElementById('institute-modal').classList.replace('hidden', 'flex');
}

function filterPaymentsList() {
    const q = document.getElementById('payment-search').value.toLowerCase();
    const rows = document.querySelectorAll('.payment-row');
    rows.forEach(row => {
        const text = row.querySelector('.payment-id').innerText.toLowerCase() + " " + row.querySelector('.payment-name').innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
}

function openPaymentModal(email) {
    const inst = window.allInstitutesData.find(i => i.email === email);
    if(!inst) return;
    
    let phaseOptions = (inst.payments?.phases || []).map(p => `<option value="${p.id}">${p.name} (Due: ₹${p.debited - p.credited})</option>`).join('');
    
    document.getElementById('payment-modal-content').innerHTML = `
        <div class="mb-4 text-center">
            <h4 class="font-black text-gray-800 text-xl">${inst.institute?.name || 'Unknown'}</h4>
            <p class="text-sm font-mono text-gray-500">${inst.igyr_id || 'ID Pending'}</p>
        </div>
        
        <div class="bg-white p-4 rounded-xl border shadow-sm mb-4">
            <strong class="block mb-2 text-gray-700 text-sm border-b pb-2"><i class="fa-solid fa-book-open text-blue-500 mr-1"></i> Current Phase Ledger:</strong>
            <div class="max-h-40 overflow-y-auto pr-2">
                ${(inst.payments?.phases || []).map(p => `
                    <div class="flex flex-col mb-2 bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                        <span class="font-bold text-gray-800 mb-1 border-b pb-1">${p.name}</span>
                        <div class="flex justify-between mt-1">
                            <span class="text-red-600 font-bold">Billed: ₹${p.debited}</span>
                            <span class="text-green-600 font-bold">Paid: ₹${p.credited}</span>
                        </div>
                    </div>
                `).join('')}
                ${!(inst.payments?.phases || []).length ? '<span class="italic text-gray-500 block text-center py-2 text-sm">No billing phases created yet.</span>' : ''}
            </div>
        </div>
        
        <div class="border border-gray-200 bg-white rounded-xl p-4">
            <p class="text-xs font-bold mb-2 text-red-700"><i class="fa-solid fa-file-invoice"></i> 1. Create New Bill Phase</p>
            <div class="flex flex-col md:flex-row gap-2 mb-3">
                <input type="text" id="phase-name-${inst.email}" placeholder="Phase Name" class="border p-2 text-sm flex-1 rounded bg-gray-50 w-full">
                <div class="flex gap-2 w-full md:w-auto">
                    <input type="number" id="phase-amt-${inst.email}" placeholder="Billed Amt" class="border p-2 text-sm flex-1 md:w-24 rounded bg-gray-50">
                    <button onclick="addPhase('${inst.email}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 md:px-3 md:py-1 rounded text-sm font-bold shadow-sm transition-colors whitespace-nowrap">Create</button>
                </div>
            </div>
            
            ${phaseOptions ? `
            <div class="border-t pt-3 mt-1 border-gray-200">
                <p class="text-xs font-bold mb-2 text-green-700"><i class="fa-solid fa-money-bill-wave"></i> 2. Log Payment for a Phase</p>
                <div class="flex flex-col md:flex-row gap-2">
                    <select id="sel-phase-${inst.email}" class="border p-2 text-sm flex-1 rounded bg-gray-50 w-full">${phaseOptions}</select>
                    <div class="flex gap-2 w-full md:w-auto">
                        <input type="number" id="credit-amt-${inst.email}" placeholder="Paid Amt" class="border p-2 text-sm flex-1 md:w-24 rounded bg-gray-50">
                        <button onclick="creditPhase('${inst.email}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 md:px-3 md:py-1 rounded text-sm font-bold shadow-sm transition-colors whitespace-nowrap">Credit</button>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
        
        ${inst.status === 'published' ? `
        <div class="mt-4 border-t pt-4 text-center">
            <p class="text-xs text-gray-500 mb-2">Once all payments are collected and cleared, click below to close the order.</p>
            <button onclick="clearOrder('${inst.email}')" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-colors w-full"><i class="fa-solid fa-box-archive mr-2"></i> Mark Payments Cleared & Archive Order</button>
        </div>
        ` : ''}
    `;
    
    document.getElementById('payment-modal').classList.replace('hidden', 'flex');
}

async function clearOrder(email) {
    if(!(await confirmAction("This will archive the order and reset the client's dashboard. Do you want to continue?"))) return;
    try {
        await fetch(`${API_BASE}/admin/mark-task-done`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email})
        });
        showToast('Order archived and cleared successfully!');
        document.getElementById('payment-modal').classList.replace('flex', 'hidden');
        loadApplication();
    } catch(e) { showToast('Failed'); }
}


function renderPublishList(institutes) {
    const container = document.getElementById('publish-list');
    if (institutes.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fa-solid fa-check-circle text-4xl mb-3 text-gray-300"></i><p>No institutes are currently waiting for publication.</p></div>';
        return;
    }
    
    let html = '<div class="grid grid-cols-1 gap-4">';
    institutes.forEach(inst => {
        html += `
            <div class="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 hover:bg-pink-50 transition-colors">
                <div>
                    <h4 class="font-bold text-gray-800 text-lg">${inst.institute?.name || inst.name || 'Unknown Institute'}</h4>
                    <p class="text-sm text-gray-600"><i class="fa-solid fa-envelope mr-1"></i> ${inst.email}</p>
                    <p class="text-xs font-semibold text-emerald-600 mt-1"><i class="fa-solid fa-circle-check mr-1"></i> Tabulation Register Approved by Institute</p>
                </div>
                <button onclick="publishResults('${inst.email}')" class="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg font-bold transition-all transform hover:-translate-y-0.5 whitespace-nowrap">
                    <i class="fa-solid fa-cloud-arrow-up mr-2"></i> Publish Results
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

async function publishResults(email) {
    if (!(await confirmAction('Are you sure you want to officially PUBLISH the results for this institute? This will immediately send an email notification to them with their final data.'))) return;
    
    try {
        const res = await fetch(`${API_BASE}/admin/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        if (res.ok) {
            showToast('Results published successfully! Email notification sent.');
            loadApplication();
        } else {
            showToast(data.error || 'Failed to publish results');
        }
    } catch (err) {
        console.error(err);
        showToast('Server connection failed');
    }
}


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


window.confirmAction = function(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center fade-in backdrop-blur-sm p-4';
        
        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all';
        
        modal.innerHTML = `
            <div class="p-6">
                <div class="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                    <i class="fa-solid fa-circle-question animate-pulse"></i>
                </div>
                <h3 class="text-xl font-bold text-center text-gray-800 mb-2">Are you sure?</h3>
                <p class="text-gray-600 text-center mb-6 leading-relaxed">${message}</p>
                <div class="flex gap-3">
                    <button id="btn-confirm-no" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl transition-colors">Cancel</button>
                    <button id="btn-confirm-yes" class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-transform transform hover:-translate-y-0.5">Yes, Proceed</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        document.getElementById('btn-confirm-no').onclick = () => {
            overlay.remove();
            resolve(false);
        };
        
        document.getElementById('btn-confirm-yes').onclick = () => {
            overlay.remove();
            resolve(true);
        };
    });
}

// Unified initialization for all admin modules
function initAdmin() {
    loadApplication();
    loadPricing();
    if (typeof initPricingForm === 'function') initPricingForm();
    if (typeof refreshEmailCentre === 'function') refreshEmailCentre();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}

// Auto-poll for live real-time updates across multiple devices
setInterval(loadApplication, 3000);

window.rejectRegistration = async function(email) {
    if (!(await confirmAction('Are you sure you want to REJECT this registration? They will receive a rejection email.'))) return;
    updateStatus(email, 'rejected');
};

// ==========================================
// EMAIL CENTRE MODULE - JAVASCRIPT LOGIC
// ==========================================

let emailCentreInstitutes = [];
let cachedEmailLogs = [];
let cachedOfferLetters = [];

window.switchEmailMode = function(modeId) {
    document.querySelectorAll('.ec-mode-tab').forEach(b => {
        b.classList.remove('active', 'bg-white', 'shadow-sm', 'text-gray-900');
        b.classList.add('text-gray-600');
    });
    
    const activeBtn = document.getElementById('btn-' + modeId);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-white', 'shadow-sm', 'text-gray-900');
        activeBtn.classList.remove('text-gray-600');
    }
    
    document.querySelectorAll('.ec-panel').forEach(p => p.classList.add('hidden'));
    const activePanel = document.getElementById('panel-' + modeId);
    if (activePanel) activePanel.classList.remove('hidden');
    
    if (modeId === 'history') {
        if (typeof loadEmailHistory === 'function') loadEmailHistory();
        if (typeof loadOfferLettersArchive === 'function') loadOfferLettersArchive();
    }
};

function formatPlainTextForDisplay(text) {
    if (!text) return "";
    if (text.includes("<p") || text.includes("<div") || text.includes("<br")) return text;
    const paras = text.trim().split("\n\n");
    return paras.map(p => `<p style="margin: 0 0 14px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`).join('');
}

window.refreshEmailCentre = async function() {
    try {
        // 1. Fetch live stats
        const resStats = await fetch(`${API_BASE}/admin/email-centre/stats?t=${Date.now()}`);
        if (resStats.ok) {
            const stats = await resStats.json();
            const elInst = document.getElementById('ec-stat-institutes');
            const elSent = document.getElementById('ec-stat-sent');
            const elDel = document.getElementById('ec-stat-delivered');
            const elFail = document.getElementById('ec-stat-failed');
            
            if (elInst) elInst.textContent = stats.total_institutes || 0;
            if (elSent) elSent.textContent = stats.total_sent || 0;
            if (elDel) elDel.textContent = stats.delivered || 0;
            if (elFail) elFail.textContent = stats.failed || 0;
        }

        // 2. Fetch all registered institutes directly from the database
        const resInst = await fetch(`${API_BASE}/admin/institutes?t=${Date.now()}`);
        if (resInst.ok) {
            const allInst = await resInst.json();
            window.allInstitutesData = allInst;
            emailCentreInstitutes = allInst.filter(i => i.status !== 'removed' && i.email);
        }
    } catch(e) {
        console.error("refreshEmailCentre error:", e);
    }
    
    const countAllEl = document.getElementById('m1-count-all');
    if (countAllEl) countAllEl.textContent = emailCentreInstitutes.length;
    
    renderM1InstitutesList();
    renderM3InstitutesList();
    if (typeof loadEmailHistory === 'function') loadEmailHistory();
    if (typeof loadOfferLettersArchive === 'function') loadOfferLettersArchive();
    
    // Set today as default issue date for offer letter
    const issueDateInput = document.getElementById('ol-emp-issue-date');
    if (issueDateInput && !issueDateInput.value) {
        issueDateInput.value = new Date().toISOString().split('T')[0];
    }
};

// ------------------------------------------
// MODE 1: SEND TO INSTITUTES
// ------------------------------------------
window.toggleM1RecipientPicker = function() {
    const isAll = document.querySelector('input[name="m1-target-type"]:checked')?.value === 'all';
    selectAllM1(isAll);
    updateM1Summary();
};

window.renderM1InstitutesList = function() {
    const list = document.getElementById('m1-institutes-list');
    if (!list) return;
    
    if (!emailCentreInstitutes || emailCentreInstitutes.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-gray-400 text-xs">No registered institutes found in database</div>`;
        return;
    }

    const isAll = document.querySelector('input[name="m1-target-type"]:checked')?.value === 'all';
    
    list.innerHTML = emailCentreInstitutes.map((inst, idx) => `
        <label class="m1-inst-item flex items-center justify-between p-2.5 hover:bg-blue-50/50 rounded-lg cursor-pointer transition-colors text-xs" data-search="${(inst.institute?.name || '').toLowerCase()} ${inst.email.toLowerCase()} ${(inst.institute?.district || '').toLowerCase()} ${(inst.institute?.state || '').toLowerCase()}">
            <div class="flex items-center gap-3 min-w-0">
                <input type="checkbox" value="${inst.email}" ${isAll ? 'checked' : ''} onchange="updateM1Summary()" class="m1-inst-cb w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
                <div class="truncate">
                    <span class="font-bold text-gray-800 block text-sm truncate">${inst.institute?.name || 'Unknown Institute'}</span>
                    <span class="text-gray-500 text-[11px] font-mono">${inst.email}</span>
                    <span class="text-gray-400 text-[11px] ml-2">• ${inst.institute?.mobile || 'No phone'} • ${inst.institute?.district || 'N/A'}, ${inst.institute?.state || 'N/A'}</span>
                </div>
            </div>
            <span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold whitespace-nowrap ml-2">${inst.institute?.type || 'Institute'}</span>
        </label>
    `).join('');
    
    updateM1Summary();
};

window.filterM1Institutes = function() {
    const q = (document.getElementById('m1-search-input')?.value || '').toLowerCase().trim();
    document.querySelectorAll('.m1-inst-item').forEach(el => {
        const text = el.getAttribute('data-search') || '';
        el.style.display = text.includes(q) ? 'flex' : 'none';
    });
};

window.selectAllM1 = function(check) {
    document.querySelectorAll('.m1-inst-cb').forEach(cb => {
        if (cb.closest('.m1-inst-item').style.display !== 'none') {
            cb.checked = check;
        }
    });
    updateM1Summary();
};

window.updateM1Summary = function() {
    const isSelected = document.querySelector('input[name="m1-target-type"]:checked')?.value === 'selected';
    const checkedCount = document.querySelectorAll('.m1-inst-cb:checked').length;
    
    const badge = document.getElementById('m1-selected-badge');
    if (badge) badge.textContent = `${checkedCount} Selected`;
    
    const summary = document.getElementById('m1-summary-text');
    if (summary) {
        if (isSelected) {
            summary.textContent = `Target: ${checkedCount} selected institute(s)`;
        } else {
            summary.textContent = `Target: All ${emailCentreInstitutes.length} registered institute(s)`;
        }
    }
};

window.previewM1Email = function() {
    const subject = document.getElementById('m1-subject')?.value.trim() || 'Official Announcement';
    const message = document.getElementById('m1-message')?.value.trim() || '<p>Type your message...</p>';
    const showLogo = document.getElementById('m1-logo-toggle')?.checked;
    const showSig = document.getElementById('m1-sig-toggle')?.checked;
    
    const sampleInstitute = emailCentreInstitutes[0] || { name: "Sample University", email: "registrar@university.ac.in" };
    const sampleName = sampleInstitute.institute?.name || sampleInstitute.name || "Sample University";
    const sampleEmail = sampleInstitute.email;
    
    const renderedBody = formatPlainTextForDisplay(message.replace(/{{institute_name}}/g, sampleName).replace(/{{email}}/g, sampleEmail));
    
    openEmailPreview(
        sampleEmail,
        subject.replace(/{{institute_name}}/g, sampleName),
        renderedBody,
        showLogo,
        showSig ? '<strong>IGYR Super Admin Team</strong><br>Academic Verification & Processing Hub' : null
    );
};

window.sendM1Email = async function() {
    const isSelected = document.querySelector('input[name="m1-target-type"]:checked')?.value === 'selected';
    const subject = document.getElementById('m1-subject')?.value.trim();
    const message = document.getElementById('m1-message')?.value.trim();
    const showLogo = document.getElementById('m1-logo-toggle')?.checked;
    const showSig = document.getElementById('m1-sig-toggle')?.checked;
    const attachmentInput = document.getElementById('m1-attachment');
    
    if (!subject) {
        showToast("Please enter an email subject");
        document.getElementById('m1-subject')?.focus();
        return;
    }
    if (!message) {
        showToast("Please enter the email message body");
        document.getElementById('m1-message')?.focus();
        return;
    }
    
    let selectedEmails = [];
    if (isSelected) {
        document.querySelectorAll('.m1-inst-cb:checked').forEach(cb => selectedEmails.push(cb.value));
        if (selectedEmails.length === 0) {
            showToast("Please select at least one recipient institute");
            return;
        }
    }
    
    const count = isSelected ? selectedEmails.length : emailCentreInstitutes.length;
    const confirmMsg = `Are you sure you want to dispatch this email announcement to ${count} institute(s)?`;
    if (!(await confirmAction(confirmMsg))) return;
    
    const btn = document.getElementById('btn-send-m1');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Sending to ${count} institutes...`;
    
    try {
        const formData = new FormData();
        formData.append('recipients_type', isSelected ? 'selected' : 'all');
        if (isSelected) formData.append('selected_emails', selectedEmails.join(','));
        formData.append('subject', subject);
        formData.append('message', message);
        formData.append('show_logo', showLogo ? 'true' : 'false');
        if (showSig) formData.append('signature', '<strong>IGYR Super Admin Team</strong><br>Academic Result Processing & Publication Hub');
        
        if (attachmentInput && attachmentInput.files.length > 0) {
            formData.append('attachment', attachmentInput.files[0]);
        }
        
        const res = await fetch(`${API_BASE}/admin/email-centre/send-institutes`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast(`Success! ${data.sent} sent, ${data.failed} failed`);
            document.getElementById('m1-subject').value = '';
            document.getElementById('m1-message').value = '';
            if (attachmentInput) attachmentInput.value = '';
            refreshEmailCentre();
        } else {
            showToast(data.error || "Failed to dispatch emails");
        }
    } catch(err) {
        console.error("sendM1Email error:", err);
        showToast("Network error during email dispatch");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// ------------------------------------------
// MODE 2: EMPLOYEE OFFER LETTER
// ------------------------------------------
window.updateTemplateSelection = function() {
    const val = document.querySelector('input[name="ol-template"]:checked')?.value || 'corporate';
    ['corporate', 'modern', 'technical'].forEach(t => {
        const card = document.getElementById('tpl-card-' + t);
        if (card) {
            if (t === val) {
                card.classList.remove('border-gray-200', 'bg-white');
                card.classList.add('border-indigo-600', 'bg-indigo-50/50', 'shadow-sm');
            } else {
                card.classList.remove('border-indigo-600', 'bg-indigo-50/50', 'shadow-sm');
                card.classList.add('border-gray-200', 'bg-white');
            }
        }
    });
};

function getOfferLetterFormData() {
    return {
        employee_name: document.getElementById('ol-emp-name')?.value.trim() || '',
        employee_email: document.getElementById('ol-emp-email')?.value.trim() || '',
        employee_phone: document.getElementById('ol-emp-phone')?.value.trim() || '',
        position: document.getElementById('ol-emp-position')?.value.trim() || '',
        department: document.getElementById('ol-emp-dept')?.value.trim() || 'Operations & Verification',
        company_name: document.getElementById('ol-company-name')?.value.trim() || 'IGYR - India Get Your Result',
        location: document.getElementById('ol-emp-location')?.value.trim() || 'Remote / Head Office',
        joining_date: document.getElementById('ol-emp-joining')?.value || '',
        issue_date: document.getElementById('ol-emp-issue-date')?.value || new Date().toISOString().split('T')[0],
        salary: document.getElementById('ol-emp-salary')?.value.trim() || '',
        employment_type: document.getElementById('ol-emp-type')?.value || 'Full-time',
        reporting_manager: document.getElementById('ol-emp-manager')?.value.trim() || '',
        deadline: document.getElementById('ol-emp-deadline')?.value || '',
        signatory_name: document.getElementById('ol-sig-name')?.value.trim() || 'Arnav Panda',
        signatory_designation: document.getElementById('ol-sig-desig')?.value.trim() || 'Director of Operations',
        terms: document.getElementById('ol-emp-terms')?.value.trim() || '',
        template: document.querySelector('input[name="ol-template"]:checked')?.value || 'corporate',
        custom_email_body: document.getElementById('ol-custom-email')?.value.trim() || ''
    };
}

window.previewOfferLetterPDF = async function() {
    const details = getOfferLetterFormData();
    if (!details.employee_name) {
        showToast("Please enter Employee Full Name");
        document.getElementById('ol-emp-name')?.focus();
        return;
    }
    if (!details.position) {
        showToast("Please enter Offered Job Position");
        document.getElementById('ol-emp-position')?.focus();
        return;
    }
    
    showToast("Generating PDF Preview...");
    try {
        const res = await fetch(`${API_BASE}/admin/email-centre/preview-offer-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details)
        });
        
        if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        } else {
            const err = await res.json();
            showToast(err.error || "Failed to generate PDF preview");
        }
    } catch(e) {
        console.error("previewOfferLetterPDF error:", e);
        showToast("Failed to preview PDF");
    }
};

window.sendOfferLetter = async function() {
    const details = getOfferLetterFormData();
    
    if (!details.employee_name) {
        showToast("Employee Full Name is required");
        document.getElementById('ol-emp-name')?.focus();
        return;
    }
    if (!details.employee_email) {
        showToast("Employee Email Address is required");
        document.getElementById('ol-emp-email')?.focus();
        return;
    }
    if (!details.position) {
        showToast("Offered Job Position is required");
        document.getElementById('ol-emp-position')?.focus();
        return;
    }
    
    const confirmMsg = `Send official Offer Letter for "${details.position}" to ${details.employee_name} (${details.employee_email})? A customized PDF will be automatically attached.`;
    if (!(await confirmAction(confirmMsg))) return;
    
    const btn = document.getElementById('btn-send-offer');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Generating PDF & Sending Email...`;
    
    try {
        const res = await fetch(`${API_BASE}/admin/email-centre/send-offer-letter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details)
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast(`Offer letter sent to ${details.employee_email}!`);
            refreshEmailCentre();
        } else {
            showToast(data.error || "Failed to send offer letter");
        }
    } catch(err) {
        console.error("sendOfferLetter error:", err);
        showToast("Network error while sending offer letter");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// ------------------------------------------
// MODE 3: SEPARATE MESSAGE TO INSTITUTES
// ------------------------------------------
window.renderM3InstitutesList = function() {
    const list = document.getElementById('m3-institutes-list');
    if (!list) return;
    
    if (!emailCentreInstitutes || emailCentreInstitutes.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-gray-400 text-xs">No registered institutes found in database</div>`;
        return;
    }
    
    list.innerHTML = emailCentreInstitutes.map((inst, idx) => `
        <label class="m3-inst-item flex items-center justify-between p-2.5 hover:bg-teal-50/50 rounded-lg cursor-pointer transition-colors text-xs" data-search="${(inst.institute?.name || '').toLowerCase()} ${inst.email.toLowerCase()} ${(inst.institute?.district || '').toLowerCase()} ${(inst.institute?.state || '').toLowerCase()}">
            <div class="flex items-center gap-3 min-w-0">
                <input type="checkbox" value="${inst.email}" data-name="${inst.institute?.name || 'Institute Partner'}" data-state="${inst.institute?.state || ''}" data-district="${inst.institute?.district || ''}" onchange="updateM3Summary()" class="m3-inst-cb w-4 h-4 text-teal-600 rounded focus:ring-teal-500">
                <div class="truncate">
                    <span class="font-bold text-gray-800 block text-sm truncate">${inst.institute?.name || 'Unknown Institute'}</span>
                    <span class="text-gray-500 text-[11px] font-mono">${inst.email}</span>
                    <span class="text-gray-400 text-[11px] ml-2">• ${inst.institute?.mobile || 'No phone'} • ${inst.institute?.district || 'N/A'}, ${inst.institute?.state || 'N/A'}</span>
                </div>
            </div>
            <span class="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold whitespace-nowrap ml-2">${inst.institute?.type || 'Institute'}</span>
        </label>
    `).join('');
    
    updateM3Summary();
};

window.filterM3Institutes = function() {
    const q = (document.getElementById('m3-search-input')?.value || '').toLowerCase().trim();
    document.querySelectorAll('.m3-inst-item').forEach(el => {
        const text = el.getAttribute('data-search') || '';
        el.style.display = text.includes(q) ? 'flex' : 'none';
    });
};

window.selectAllM3 = function(check) {
    document.querySelectorAll('.m3-inst-cb').forEach(cb => {
        if (cb.closest('.m3-inst-item').style.display !== 'none') {
            cb.checked = check;
        }
    });
    updateM3Summary();
};

window.updateM3Summary = function() {
    const checkedCount = document.querySelectorAll('.m3-inst-cb:checked').length;
    const badge = document.getElementById('m3-selected-badge');
    if (badge) badge.textContent = `${checkedCount} Selected`;
};

window.previewM3Email = function() {
    const checked = document.querySelectorAll('.m3-inst-cb:checked');
    let sample = { name: "Sample College", email: "contact@college.edu", state: "Maharashtra", district: "Pune" };
    if (checked.length > 0) {
        sample.email = checked[0].value;
        sample.name = checked[0].getAttribute('data-name') || sample.name;
        sample.state = checked[0].getAttribute('data-state') || sample.state;
        sample.district = checked[0].getAttribute('data-district') || sample.district;
    }
    
    let subject = document.getElementById('m3-subject')?.value.trim() || 'Notice for {{institute_name}}';
    let message = document.getElementById('m3-message')?.value.trim() || 'Dear {{institute_name}},\n\nThis is a customized message.';
    
    subject = subject.replace(/{{institute_name}}/g, sample.name).replace(/{{email}}/g, sample.email).replace(/{{state}}/g, sample.state).replace(/{{district}}/g, sample.district);
    message = message.replace(/{{institute_name}}/g, sample.name).replace(/{{email}}/g, sample.email).replace(/{{state}}/g, sample.state).replace(/{{district}}/g, sample.district);
    
    const showLogo = document.getElementById('m3-logo-toggle')?.checked;
    const showSig = document.getElementById('m3-sig-toggle')?.checked;
    
    openEmailPreview(
        sample.email,
        subject,
        formatPlainTextForDisplay(message),
        showLogo,
        showSig ? '<strong>IGYR Super Admin Team</strong><br>Direct Educational Liaison' : null
    );
};

window.sendM3Email = async function() {
    const checkedCbs = document.querySelectorAll('.m3-inst-cb:checked');
    if (checkedCbs.length === 0) {
        showToast("Please select at least one recipient institute");
        return;
    }
    
    const subject = document.getElementById('m3-subject')?.value.trim();
    const message = document.getElementById('m3-message')?.value.trim();
    const showLogo = document.getElementById('m3-logo-toggle')?.checked;
    const showSig = document.getElementById('m3-sig-toggle')?.checked;
    const attachmentInput = document.getElementById('m3-attachment');
    
    if (!subject) {
        showToast("Please enter an email subject");
        document.getElementById('m3-subject')?.focus();
        return;
    }
    if (!message) {
        showToast("Please enter the customized message body");
        document.getElementById('m3-message')?.focus();
        return;
    }
    
    const recipients = [];
    checkedCbs.forEach(cb => {
        recipients.push({
            email: cb.value,
            name: cb.getAttribute('data-name') || 'Institute Partner',
            state: cb.getAttribute('data-state') || '',
            district: cb.getAttribute('data-district') || ''
        });
    });
    
    const confirmMsg = `Send customized separate messages to ${recipients.length} institute(s)? Each institute will receive their personalized copy.`;
    if (!(await confirmAction(confirmMsg))) return;
    
    const btn = document.getElementById('btn-send-m3');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Sending to ${recipients.length} institutes...`;
    
    try {
        const formData = new FormData();
        formData.append('type', 'template');
        formData.append('recipients', JSON.stringify(recipients));
        formData.append('subject', subject);
        formData.append('message', message);
        formData.append('show_logo', showLogo ? 'true' : 'false');
        if (showSig) formData.append('signature', '<strong>IGYR Super Admin Team</strong><br>Educational Liaison Division');
        
        if (attachmentInput && attachmentInput.files.length > 0) {
            formData.append('attachment', attachmentInput.files[0]);
        }
        
        const res = await fetch(`${API_BASE}/admin/email-centre/send-custom-institutes`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast(`Custom emails sent: ${data.sent} delivered, ${data.failed} failed`);
            document.getElementById('m3-subject').value = '';
            document.getElementById('m3-message').value = '';
            if (attachmentInput) attachmentInput.value = '';
            refreshEmailCentre();
        } else {
            showToast(data.error || "Failed to dispatch custom emails");
        }
    } catch(err) {
        console.error("sendM3Email error:", err);
        showToast("Network error during custom dispatch");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// ------------------------------------------
// MODE 4: HISTORY & AUDIT LOGS
// ------------------------------------------
window.switchHistorySubTab = function(subTab) {
    const btnLogs = document.getElementById('btn-hist-logs');
    const btnOffers = document.getElementById('btn-hist-offers');
    const viewLogs = document.getElementById('subview-all-logs');
    const viewOffers = document.getElementById('subview-offer-archive');
    
    if (subTab === 'all-logs') {
        btnLogs.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white";
        btnOffers.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200";
        viewLogs.classList.remove('hidden');
        viewOffers.classList.add('hidden');
        loadEmailHistory();
    } else {
        btnOffers.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white";
        btnLogs.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200";
        viewOffers.classList.remove('hidden');
        viewLogs.classList.add('hidden');
        loadOfferLettersArchive();
    }
};

window.loadEmailHistory = async function() {
    const tbody = document.getElementById('ec-history-tbody');
    if (!tbody) return;
    
    const mode = document.getElementById('hist-mode-filter')?.value || 'all';
    const status = document.getElementById('hist-status-filter')?.value || 'all';
    const search = document.getElementById('hist-search')?.value.trim() || '';
    
    try {
        const queryParams = new URLSearchParams({ mode, status, search, limit: '100', t: Date.now() });
        const res = await fetch(`${API_BASE}/admin/email-centre/history?${queryParams}`);
        if (res.ok) {
            const data = await res.json();
            cachedEmailLogs = data.logs || [];
            renderHistoryTable(cachedEmailLogs);
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-500">Failed to load dispatch history</td></tr>`;
        }
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-500">Error connecting to history server</td></tr>`;
    }
};

function renderHistoryTable(logs) {
    const tbody = document.getElementById('ec-history-tbody');
    if (!tbody) return;
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">No email records match the selected criteria</td></tr>`;
        return;
    }
    
    tbody.innerHTML = logs.map(log => {
        const isDelivered = log.status === 'Delivered';
        const statusBadge = isDelivered 
            ? `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center"><i class="fa-solid fa-check mr-1"></i> Delivered</span>`
            : `<span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center" title="${log.failure_reason || 'Delivery failed'}"><i class="fa-solid fa-xmark mr-1"></i> Failed</span>`;
            
        let modeColor = 'bg-blue-50 text-blue-700';
        if (log.mode === 'Employee Offer Letter') modeColor = 'bg-indigo-50 text-indigo-700';
        else if (log.mode === 'Custom Institute Message') modeColor = 'bg-teal-50 text-teal-700';
        
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="p-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">${log.timestamp || 'N/A'}</td>
                <td class="p-3"><span class="${modeColor} px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">${log.mode}</span></td>
                <td class="p-3">
                    <span class="font-bold text-gray-800 block">${log.recipient_name}</span>
                    <span class="text-gray-400 text-[11px] font-mono">${log.recipient_email}</span>
                </td>
                <td class="p-3 font-medium text-gray-700 max-w-xs truncate">${log.subject}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right">
                    ${log.offer_letter_id ? `
                        <a href="${API_BASE}/admin/email-centre/download-offer-pdf/${log.offer_letter_id}" target="_blank" class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded text-[11px] font-bold inline-flex items-center">
                            <i class="fa-solid fa-download mr-1"></i> PDF
                        </a>
                    ` : `
                        <button onclick="viewHistoryDetails('${log.id}')" class="text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded text-[11px] font-bold">
                            View
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

window.filterHistoryLogs = function() {
    const q = (document.getElementById('hist-search')?.value || '').toLowerCase().trim();
    if (!q) {
        renderHistoryTable(cachedEmailLogs);
        return;
    }
    const filtered = cachedEmailLogs.filter(l => 
        (l.recipient_name || '').toLowerCase().includes(q) ||
        (l.recipient_email || '').toLowerCase().includes(q) ||
        (l.subject || '').toLowerCase().includes(q)
    );
    renderHistoryTable(filtered);
};

window.loadOfferLettersArchive = async function() {
    const tbody = document.getElementById('ec-offers-tbody');
    if (!tbody) return;
    
    try {
        const res = await fetch(`${API_BASE}/admin/email-centre/offer-letters?t=${Date.now()}`);
        if (res.ok) {
            const data = await res.json();
            cachedOfferLetters = data.offers || [];
            if (cachedOfferLetters.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-400">No generated offer letters found</td></tr>`;
                return;
            }
            tbody.innerHTML = cachedOfferLetters.map(o => `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">${o.created_at || 'N/A'}</td>
                    <td class="p-3 font-bold text-gray-900">${o.employee_name}</td>
                    <td class="p-3 text-indigo-700 font-semibold">${o.position}</td>
                    <td class="p-3 text-gray-500 font-mono text-[11px]">${o.employee_email}</td>
                    <td class="p-3"><span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">${o.template}</span></td>
                    <td class="p-3">
                        <span class="${o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} px-2 py-0.5 rounded-full text-[10px] font-bold">
                            ${o.status}
                        </span>
                    </td>
                    <td class="p-3 text-right">
                        <a href="${API_BASE}${o.download_url}" target="_blank" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center shadow-sm">
                            <i class="fa-solid fa-file-arrow-down mr-1.5"></i> Download PDF
                        </a>
                    </td>
                </tr>
            `).join('');
        }
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-red-500">Failed to load offer letters archive</td></tr>`;
    }
};

window.viewHistoryDetails = function(logId) {
    const log = cachedEmailLogs.find(l => l.id === logId);
    if (!log) return;
    openEmailPreview(log.recipient_email, log.subject, `<p><strong>Mode:</strong> ${log.mode}</p><p><strong>Status:</strong> ${log.status} ${log.failure_reason ? '(' + log.failure_reason + ')' : ''}</p><p><strong>Recipient Name:</strong> ${log.recipient_name}</p><p><strong>Sent At:</strong> ${log.timestamp}</p>`, true, null);
};

// ------------------------------------------
// MODAL & FORMATTING HELPERS
// ------------------------------------------
window.openEmailPreview = function(to, subject, bodyHtml, showLogo=true, signature=null) {
    const modal = document.getElementById('email-preview-modal');
    if (!modal) return;
    
    document.getElementById('prev-modal-to').textContent = to;
    document.getElementById('prev-modal-sub').textContent = subject;
    
    let html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            ${showLogo ? `
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 25px 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">IGYR</h1>
                    <p style="margin: 5px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #bfdbfe;">India Get Your Result</p>
                </div>
            ` : `
                <div style="background-color: #1e3a8a; padding: 15px 20px; text-align: center; color: white;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 700;">IGYR Notification</h2>
                </div>
            `}
            <div style="padding: 25px 35px 10px 35px; border-bottom: 2px solid #e5e7eb;">
                <h2 style="margin: 0; font-size: 18px; color: #1f2937;">${subject}</h2>
            </div>
            <div style="padding: 20px 35px 30px 35px; color: #374151; font-size: 15px; line-height: 1.6;">
                ${bodyHtml}
                ${signature ? `<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #4b5563;">${signature}</div>` : ''}
            </div>
            <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px;">
                © 2026 India Get Your Result (IGYR). All rights reserved.
            </div>
        </div>
    `;
    
    document.getElementById('prev-modal-body').innerHTML = html;
    modal.classList.replace('hidden', 'flex');
};

window.closeEmailPreview = function() {
    const modal = document.getElementById('email-preview-modal');
    if (modal) modal.classList.replace('flex', 'hidden');
};

window.insertFormatting = function(textareaId, tag) {
    const el = document.getElementById(textareaId);
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end) || "text";
    let formatted = "";
    if (tag === 'p') formatted = `<p>${selected}</p>`;
    else if (tag === 'b') formatted = `<strong>${selected}</strong>`;
    else if (tag === 'i') formatted = `<em>${selected}</em>`;
    else if (tag === 'ul') formatted = `<ul>\n  <li>${selected}</li>\n</ul>`;
    
    el.value = el.value.substring(0, start) + formatted + el.value.substring(end);
    el.focus();
};

window.insertPlaceholder = function(textareaId, ph) {
    const el = document.getElementById(textareaId);
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = el.value.substring(0, start) + ph + el.value.substring(end);
    el.focus();
};
