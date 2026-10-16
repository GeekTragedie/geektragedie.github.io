// Shared dark/light theme toggle.
// Load this as the first thing inside <body> so the saved theme is applied
// before the page paints. The button label is swapped by CSS in site.css.
(function () {
    const applyTheme = (isLight) => {
        document.body.classList.toggle('light-mode', isLight);
    };

    applyTheme(localStorage.getItem('theme') === 'light');

    // Delegated so it keeps working if the button is re-rendered (React pages)
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#theme-toggle-btn')) return;
        const isLight = !document.body.classList.contains('light-mode');
        applyTheme(isLight);
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
})();
