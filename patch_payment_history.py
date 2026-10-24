import re

with open('app.js', 'r') as f:
    content = f.read()

old_logic = """    let paymentTrackerHtml = '';
    const activeOrderStates = ['order_placed', 'documents_required', 'processing', 'verification_pending', 'ready_to_publish', 'published'];
    if (activeOrderStates.includes(appStatus) || (state.payments && state.payments.phases && state.payments.phases.length > 0)) {"""

new_logic = """    let paymentTrackerHtml = '';
    const activeOrderStates = ['order_placed', 'documents_required', 'processing', 'verification_pending', 'ready_to_publish', 'published'];
    const historyPayments = (state.instituteData?.history || []).filter(h => h.payments && h.payments.phases && h.payments.phases.length > 0).reverse();
    
    if (activeOrderStates.includes(appStatus) || (state.payments && state.payments.phases && state.payments.phases.length > 0) || historyPayments.length > 0) {"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    
    old_end = """                ${totalBilled === 0 ? '<div class="text-center p-4 bg-gray-50 rounded border border-dashed"><p class="text-sm text-gray-500 italic">No active payment request yet.</p></div>' : ''}
                
                
            </div>
        `;
    }"""
    
    new_end = """                ${totalBilled === 0 && (state.payments?.phases || []).length === 0 ? '<div class="text-center p-4 bg-gray-50 rounded border border-dashed"><p class="text-sm text-gray-500 italic">No active payment request for the current order.</p></div>' : ''}
                
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
    }"""
    
    if old_end in content:
        content = content.replace(old_end, new_end)
        with open('app.js', 'w') as f:
            f.write(content)
        print("Patched payment history!")
    else:
        print("Could not find old_end block!")
else:
    print("Could not find old_logic block!")
