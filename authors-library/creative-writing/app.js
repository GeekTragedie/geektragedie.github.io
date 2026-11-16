// Escape text from the URL hash before it goes into HTML
function escapeHtml(text) {
    return text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// Function to load and render a markdown file or PDF
async function loadContent(route, elementId) {
    const container = document.getElementById(elementId);
    const section = route.split('/')[0];
    if (elementId === 'content') container.dataset.section = section;

    // 1. Handle direct PDF routes (e.g., #pdfs/paper-name.pdf)
    if (route.endsWith('.pdf')) {
        const safeRoute = escapeHtml(route);
        container.innerHTML = `
            <div class="blog-meta-bar">
                <a href="#home">&larr; Back to Library Feed</a>
                <a href="${safeRoute}" download class="pdf-download-btn">📄 Download PDF</a>
            </div>
            <iframe src="${safeRoute}" class="pdf-viewer" title="PDF Document Viewer">
                <p>Your browser does not support embedded PDFs. <a href="${safeRoute}">Click here to download the PDF.</a></p>
            </iframe>
        `;
        window.scrollTo(0, 0);
        return;
    }

    // 2. Handle standard Markdown routes
    try {
        const response = await fetch(`${route}.md`);
        if (!response.ok) throw new Error('Page not found');
        const text = await response.text();
        // Plays and poems keep their line breaks as typed
        const keepLineBreaks = section === 'plays' || section === 'poetry';
        const htmlContent = marked.parse(text, { breaks: keepLineBreaks });

        // Add Blog Meta Header (Back button + Estimated Reading Time) on individual posts
        if (elementId === 'content' && route !== 'home' && route !== 'master-index') {
            const words = text.trim().split(/\s+/).length;
            const readTime = Math.max(1, Math.ceil(words / 200));
            const blogHeader = `
                <div class="blog-meta-bar">
                    <a href="#home">&larr; Back to Feed</a>
                    <span>⏱️ ${readTime} min read (${words.toLocaleString()} words)</span>
                </div>
            `;
            container.innerHTML = blogHeader + htmlContent;
            window.scrollTo(0, 0);
        } else {
            container.innerHTML = htmlContent;
        }
        enhanceLibrary(container);
    } catch (error) {
        container.innerHTML = `<h1>Entry In Progress</h1><p>This entry (<b>${escapeHtml(route)}</b>) is currently in draft or being updated as time and interest allow. <a href="#home">Return to the main feed</a>.</p>`;
    }
}

// Handle routing based on the URL hash
function handleRoute() {
    let page = window.location.hash.substring(1) || 'home';
    loadContent(page, 'content');
}

// Initialize the blog/library app
function init() {
    loadContent('sidebar', 'sidebar');
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
}

// ---------- Findability: collapsible groups, search, current-page highlight ----------
// Groups are <details class="lib-group"> in home.md and sidebar.md. The feed search box
// is a <div data-lib-search> placeholder in home.md.
function enhanceLibrary(container) {
    const box = container.querySelector('[data-lib-search]');
    if (box) buildSearch(box, container);
    if (container.id === 'sidebar') markCurrent();
}

function buildSearch(box, container) {
    const groups = [...container.querySelectorAll('details.lib-group')];
    const items = groups.flatMap(g => [...g.querySelectorAll('li')]);
    box.innerHTML = `
        <label class="lib-search-label" for="lib-search-input">Search this section</label>
        <div class="lib-search-row">
            <input type="search" id="lib-search-input" class="lib-search-input" placeholder="Title, course, professor, topic…" autocomplete="off">
            <button type="button" class="lib-toggle-all" aria-pressed="false">Open all groups</button>
        </div>
        <p class="lib-search-status" role="status" aria-live="polite"></p>`;
    const input = box.querySelector('input');
    const status = box.querySelector('.lib-search-status');
    const toggle = box.querySelector('.lib-toggle-all');
    const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    items.forEach(li => { li.dataset.search = norm(li.textContent); });

    function run() {
        const words = norm(input.value.trim()).split(/\s+/).filter(Boolean);
        if (!words.length) {
            items.forEach(li => { li.hidden = false; });
            groups.forEach(g => { g.hidden = false; g.open = toggle.getAttribute('aria-pressed') === 'true'; });
            status.textContent = '';
            return;
        }
        let shown = 0;
        groups.forEach(g => {
            let n = 0;
            g.querySelectorAll('li').forEach(li => {
                const hit = words.every(w => li.dataset.search.includes(w));
                li.hidden = !hit; if (hit) n++;
            });
            g.hidden = n === 0; g.open = n > 0; shown += n;
        });
        status.textContent = shown ? `${shown} of ${items.length} match.` : `Nothing matches “${input.value.trim()}”. Try fewer words.`;
    }
    input.addEventListener('input', run);
    toggle.addEventListener('click', () => {
        const on = toggle.getAttribute('aria-pressed') !== 'true';
        toggle.setAttribute('aria-pressed', String(on));
        toggle.textContent = on ? 'Close all groups' : 'Open all groups';
        if (!input.value.trim()) groups.forEach(g => { g.open = on; });
    });
}

// Highlight the open piece in the sidebar and open its group
function markCurrent() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const here = '#' + (window.location.hash.substring(1) || 'home');
    sidebar.querySelectorAll('a[aria-current]').forEach(a => a.removeAttribute('aria-current'));
    const link = [...sidebar.querySelectorAll('a[href^="#"]')].find(a => a.getAttribute('href') === here);
    if (!link) return;
    link.setAttribute('aria-current', 'page');
    const group = link.closest('details.lib-group');
    if (group) group.open = true;
}
window.addEventListener('hashchange', markCurrent);

init();