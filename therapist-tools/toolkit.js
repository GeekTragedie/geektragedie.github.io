// Shared sidebar behavior for the Therapist Toolkit pages.
// - The "Tool menu" stays open on wide screens and starts closed on narrow ones.
// - [data-open="#id"] opens a <details> (like "How to use this tool") and scrolls to it.
// - "On this page" links open any closed <details> they point into.
// - [data-click="selector"] clicks another control, so the sidebar can switch tabs.
(function () {
    const menu = document.querySelector('.tool-menu');
    const wide = window.matchMedia('(min-width: 901px)');
    if (menu) {
        const sync = () => { menu.open = wide.matches; };
        sync();
        wide.addEventListener('change', sync);
    }

    const closeMenuOnNarrow = () => {
        if (menu && !wide.matches) menu.open = false;
    };

    const reveal = (target) => {
        let node = target;
        while (node) {
            if (node.tagName === 'DETAILS') node.open = true;
            node = node.parentElement;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    document.addEventListener('click', (event) => {
        const opener = event.target.closest('[data-open]');
        if (opener) {
            const target = document.querySelector(opener.dataset.open);
            if (target) {
                if (target.tagName === 'DETAILS') target.open = true;
                reveal(target);
                closeMenuOnNarrow();
            }
            return;
        }

        const proxy = event.target.closest('[data-click]');
        if (proxy) {
            const control = document.querySelector(proxy.dataset.click);
            if (control) {
                control.click();
                reveal(control);
                closeMenuOnNarrow();
            }
            return;
        }

        const link = event.target.closest('.sidebar-toc a[href^="#"]');
        if (link) {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                event.preventDefault();
                reveal(target);
                history.replaceState(null, '', link.getAttribute('href'));
                closeMenuOnNarrow();
            }
        }
    });
})();
