// Shared APA reference list for the Therapist Toolkit.
// Each page includes <details class="collapsible references" data-tool="<folder>" data-src="../references.json">
// and this script fills it with the references tagged for that tool, grouped and sorted.
(function () {
    const section = document.querySelector('details.collapsible.references[data-tool]');
    if (!section) return;

    const tool = section.dataset.tool;
    const body = section.querySelector('.collapsible-body');
    const count = section.querySelector('.ref-count');

    // Sort key: drop tags and a leading "The" so the list reads alphabetically
    const sortKey = (html) => html.replace(/<[^>]+>/g, '').replace(/^the\s+/i, '').toLowerCase();

    // Turn bare URLs/DOIs inside a reference into links
    const linkify = (html) => html.replace(/(https?:\/\/[^\s<]+[^\s<.,;)])/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

    fetch(section.dataset.src || '../references.json')
        .then((res) => {
            if (!res.ok) throw new Error(res.status);
            return res.json();
        })
        .then((data) => {
            const refs = data.references.filter((ref) => ref.usedBy.includes(tool));
            count.textContent = `${refs.length} sources`;

            const groups = data.groups.filter((g) => refs.some((ref) => ref.group === g.id));
            body.innerHTML = groups.map((g) => {
                const items = refs
                    .filter((ref) => ref.group === g.id)
                    .sort((a, b) => sortKey(a.html).localeCompare(sortKey(b.html)));
                return `
                    <details class="collapsible ref-group">
                        <summary>
                            <span>${g.label}</span>
                            <span class="ref-count">${items.length}</span>
                            <span class="chevron" aria-hidden="true">▾</span>
                        </summary>
                        <div class="collapsible-body reference-list">
                            ${items.map((ref) => `<p>${linkify(ref.html)}</p>`).join('')}
                        </div>
                    </details>`;
            }).join('');
        })
        .catch(() => {
            count.textContent = '';
            body.innerHTML = '<p class="muted">References couldn’t load. Try refreshing the page.</p>';
        });
})();
