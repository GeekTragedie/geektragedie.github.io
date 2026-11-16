// Shared sidebar behavior for the Therapist Toolkit pages.
// - The "Tool menu" stays open on wide screens and starts closed on narrow ones.
// - [data-open="#id"] opens a <details> (like "How to use this tool") and scrolls to it.
// - "On this page" links open any closed <details> they point into.
// - [data-click="selector"] clicks another control, so the sidebar can switch tabs.
// - [data-load-sample="sample.json"] loads a made-up example through the tool's own import.
// - The sidebar stays sticky only while it fits the window, so it never scrolls inside itself.
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

    // The sidebar never scrolls inside itself. While it fits the window it stays
    // sticky; when it's taller (e.g. How to use is open) it scrolls with the page.
    const sidebar = document.querySelector('.tool-sidebar');
    const fitSidebar = () => {
        if (!sidebar) return;
        sidebar.classList.remove('is-static');
        if (!wide.matches) return;
        const top = parseFloat(getComputedStyle(sidebar).top) || 78;
        if (sidebar.offsetHeight > window.innerHeight - top - 12) sidebar.classList.add('is-static');
    };
    if (sidebar) {
        fitSidebar();
        window.addEventListener('resize', fitSidebar);
        wide.addEventListener('change', fitSidebar);
        // <details> toggle events don't bubble, so listen in the capture phase.
        sidebar.addEventListener('toggle', fitSidebar, true);
    }

    // "Load sample": feed the tool's sample.json through its own JSON import,
    // so every tool reuses the import code it already has.
    const loadSample = (button) => {
        const input = document.querySelector(button.dataset.importInput || 'input[type="file"][id^="import"]');
        if (!input) return;
        if (!confirm('Load the sample? It replaces what’s on the page now with a made-up example. Save a .json first if you want to keep your entries.')) return;
        const url = new URL(button.dataset.loadSample, window.location.href);
        fetch(url, { cache: 'no-cache' })
            .then((res) => {
                if (!res.ok) throw new Error(res.status);
                return res.blob();
            })
            .then((blob) => {
                const transfer = new DataTransfer();
                transfer.items.add(new File([blob], 'sample.json', { type: 'application/json' }));
                input.files = transfer.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                closeMenuOnNarrow();
            })
            .catch(() => alert('The sample couldn’t be loaded. Check your connection and try again.'));
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
        const sample = event.target.closest('[data-load-sample]');
        if (sample) {
            loadSample(sample);
            return;
        }

        const opener = event.target.closest('[data-open]');
        if (opener) {
            const target = document.querySelector(opener.dataset.open);
            if (target) {
                if (target.tagName === 'DETAILS') target.open = true;
                // Collapse the narrow-screen menu first, so the scroll lands on the target
                closeMenuOnNarrow();
                reveal(target);
            }
            return;
        }

        const proxy = event.target.closest('[data-click]');
        if (proxy) {
            const control = document.querySelector(proxy.dataset.click);
            if (control) {
                control.click();
                closeMenuOnNarrow();
                reveal(control);
            }
            return;
        }

        const link = event.target.closest('.sidebar-toc a[href^="#"]');
        if (link) {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                event.preventDefault();
                closeMenuOnNarrow();
                reveal(target);
                history.replaceState(null, '', link.getAttribute('href'));
            }
        }
    });
})();
