import re

with open('app.js', 'r') as f:
    content = f.read()

old_logic = """            indiaData.states.forEach(stateObj => {
                const opt = document.createElement('option');
                opt.value = stateObj.state;
                opt.textContent = stateObj.state;
                stateSelect.appendChild(opt);
            });"""

new_logic = """            const selState = stateSelect.getAttribute('data-selected');
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
            }"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Patched state dropdown pre-filling!")
else:
    print("Could not find old dropdown logic block!")
