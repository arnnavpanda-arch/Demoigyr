import re
with open('admin.js', 'r') as f:
    content = f.read()

old_morph = """        if (typeof morphdom !== 'undefined') {
            const wrap = (html, node) => `<${node.tagName.toLowerCase()} id="${node.id}" class="${node.className}">${html}</${node.tagName.toLowerCase()}>`;
            
            morphdom(pendingContainer, wrap(pendingHtml, pendingContainer));
            morphdom(postContainer, wrap(postHtml, postContainer));
            if (registeredContainer) morphdom(registeredContainer, wrap(registeredHtml, registeredContainer));
            if (paymentsListContainer) morphdom(paymentsListContainer, wrap(paymentsListHtml, paymentsListContainer));
        } else {
            pendingContainer.innerHTML = pendingHtml;
            postContainer.innerHTML = postHtml;
            if (registeredContainer) registeredContainer.innerHTML = registeredHtml;
            if (paymentsListContainer) paymentsListContainer.innerHTML = paymentsListHtml;
            if (publishContainer) publishContainer.innerHTML = publishHtml;
        }"""

new_morph = """        if (typeof morphdom !== 'undefined') {
            const wrap = (html, node) => `<${node.tagName.toLowerCase()} id="${node.id}" class="${node.className}">${html}</${node.tagName.toLowerCase()}>`;
            
            try {
                morphdom(pendingContainer, wrap(pendingHtml, pendingContainer));
                morphdom(postContainer, wrap(postHtml, postContainer));
                if (registeredContainer) morphdom(registeredContainer, wrap(registeredHtml, registeredContainer));
                // For tables (tbody), morphdom can fail to parse properly, so fallback to innerHTML for it
                if (paymentsListContainer) paymentsListContainer.innerHTML = paymentsListHtml;
                if (publishContainer) publishContainer.innerHTML = publishHtml;
            } catch(e) {
                console.error("Morphdom error:", e);
                pendingContainer.innerHTML = pendingHtml;
                postContainer.innerHTML = postHtml;
                if (registeredContainer) registeredContainer.innerHTML = registeredHtml;
                if (paymentsListContainer) paymentsListContainer.innerHTML = paymentsListHtml;
                if (publishContainer) publishContainer.innerHTML = publishHtml;
            }
        } else {
            pendingContainer.innerHTML = pendingHtml;
            postContainer.innerHTML = postHtml;
            if (registeredContainer) registeredContainer.innerHTML = registeredHtml;
            if (paymentsListContainer) paymentsListContainer.innerHTML = paymentsListHtml;
            if (publishContainer) publishContainer.innerHTML = publishHtml;
        }"""

content = content.replace(old_morph, new_morph)

with open('admin.js', 'w') as f:
    f.write(content)
print("Patched admin morphdom")
