with open('admin.js', 'r') as f:
    content = f.read()

old_catch = """    } catch (e) {
        console.error(e); pendingContainer.innerHTML = `Error: ` + e.message;
    }"""

new_catch = """    } catch (e) {
        console.error(e);
        const errHtml = `<div class="col-span-full text-center text-red-500 py-4"><i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i><p>Error: ${e.message}</p></div>`;
        if (pendingContainer) pendingContainer.innerHTML = errHtml;
        if (postContainer) postContainer.innerHTML = errHtml;
        const regCont = document.getElementById('registered-container');
        if (regCont) regCont.innerHTML = errHtml;
        const payCont = document.getElementById('payments-list-container');
        if (payCont) payCont.innerHTML = errHtml;
    }"""

if old_catch in content:
    content = content.replace(old_catch, new_catch)
    with open('admin.js', 'w') as f:
        f.write(content)
    print("Patched catch block")
else:
    print("Could not find old catch block")
