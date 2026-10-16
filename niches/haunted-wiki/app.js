// Function to load and render a markdown file
async function loadMarkdown(filename, elementId) {
    try {
        const response = await fetch(`${filename}.md`);
        if (!response.ok) throw new Error('Page not found');
        const text = await response.text();
        document.getElementById(elementId).innerHTML = marked.parse(text);
    } catch (error) {
        document.getElementById(elementId).innerHTML = `<h1>404</h1><p>Sorry, the page <b>${filename}</b> could not be found.</p>`;
    }
}

// Function to handle routing based on the URL hash
function handleRoute() {
    let page = window.location.hash.substring(1) || 'home';
    loadMarkdown(page, 'content');
}

// Initialize the wiki app
function init() {
    loadMarkdown('sidebar', 'sidebar');
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
}

// Start the app
init();