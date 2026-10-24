import re
with open('app.js', 'r') as f:
    content = f.read()

old_logic = "const historyPayments = (state.instituteData?.history || []).filter(h => h.payments && h.payments.phases && h.payments.phases.length > 0).reverse();"
new_logic = "const historyPayments = (state.history || []).filter(h => h.payments && h.payments.phases && h.payments.phases.length > 0).reverse();"

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Fixed state.history bug!")
else:
    print("Could not find old_logic block!")
