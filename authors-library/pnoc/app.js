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

init();