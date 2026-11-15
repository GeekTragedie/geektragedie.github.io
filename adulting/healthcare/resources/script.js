// One resource list (data/resources.json), shown in two places:
//   Adulting → Healthcare → Mental Health Resources   <body data-collection="clients">
//   Therapist Tools → Resource Library                <body data-collection="therapists" data-resources-base="../../adulting/healthcare/resources/">
// Each entry lists its collections, so nothing is stored twice.
document.addEventListener('DOMContentLoaded', () => {
    const resourceList = document.getElementById('resource-list');
    const filterContainer = document.getElementById('filter-container');
    const searchBar = document.getElementById('search-bar');
    const sortBy = document.getElementById('sort-by');
    const activeFiltersDisplay = document.getElementById('active-filters-display');
    const countEl = document.getElementById('resource-count');

    const COLLECTION = document.body.dataset.collection || 'clients';
    const BASE = document.body.dataset.resourcesBase || './';

    const esc = (v) => String(v === undefined || v === null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    // Citations use *asterisks* for italics; escape first, then turn those into <em>
    const cite = (v) => esc(v).replace(/\*([^*]+)\*/g, '<em>$1</em>');
    const safeUrl = (u) => (/^(https?:|\.{0,2}\/|[\w-]+\/)/i.test(String(u || '')) && !/^javascript:/i.test(String(u)) ? u : '#');

    let allResources = [];
    let sortColumn = 'title';
    let sortAscending = true;

    const GROUPS = [
        { key: 'diagnosis', title: 'Diagnosis', topic: true },
        { key: 'symptom', title: 'Symptom', topic: true },
        { key: 'therapyStyle', title: 'Therapy Style', topic: true },
        { key: 'format', title: 'Format' },
        { key: 'audience', title: 'Audience' },
        { key: 'features', title: 'Features' },
        { key: 'language', title: 'Language' }
    ];
    const activeFilters = Object.fromEntries(GROUPS.map((g) => [g.key, new Set()]));
    const valuesOf = (res, g) => {
        const v = g.topic ? (res.topics || {})[g.key] : res[g.key];
        return Array.isArray(v) ? v : (v ? [v] : []);
    };

    fetch(`${BASE}data/resources.json`)
        .then((response) => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then((data) => {
            allResources = data.filter((r) => (r.collections || ['clients']).includes(COLLECTION));
            updateUI();
            searchBar.addEventListener('input', updateUI);
            sortBy.addEventListener('change', () => {
                sortColumn = 'title';
                sortAscending = sortBy.value === 'a-z';
                updateUI();
            });
        })
        .catch((error) => {
            console.error('Fetch error:', error);
            resourceList.innerHTML = '<tr><td colspan="5" style="color: #ef4444;">Error loading resources data. Check data file path.</td></tr>';
        });

    window.sortTable = function (columnKey) {
        if (sortColumn === columnKey) sortAscending = !sortAscending;
        else { sortColumn = columnKey; sortAscending = true; }
        updateUI();
    };

    function updateUI() {
        const filtered = getFilteredAndSortedResources();
        populateAllFilters(filtered);
        updateActiveFiltersDisplay();
        displayResourcesTable(filtered);
        if (countEl) countEl.textContent = `${filtered.length} of ${allResources.length} resources`;
    }

    function getFilteredAndSortedResources() {
        const q = searchBar.value.toLowerCase().trim();
        return allResources
            .filter((res) => GROUPS.every((g) => activeFilters[g.key].size === 0 || valuesOf(res, g).some((v) => activeFilters[g.key].has(v))))
            .filter((res) => !q || [res.title, res.description, ...GROUPS.flatMap((g) => valuesOf(res, g))].join(' ').toLowerCase().includes(q))
            .sort((a, b) => {
                const A = String(a[sortColumn] || '').toLowerCase();
                const B = String(b[sortColumn] || '').toLowerCase();
                return A < B ? (sortAscending ? -1 : 1) : A > B ? (sortAscending ? 1 : -1) : 0;
            });
    }

    function populateAllFilters(filtered) {
        const openGroups = new Set([...filterContainer.querySelectorAll('details[open]')].map((el) => el.dataset.group));
        filterContainer.innerHTML = GROUPS.map((g) => {
            const all = [...new Set(allResources.flatMap((r) => valuesOf(r, g)))].sort((a, b) => a.localeCompare(b));
            const counts = {};
            filtered.forEach((r) => valuesOf(r, g).forEach((v) => { counts[v] = (counts[v] || 0) + 1; }));
            const active = activeFilters[g.key].size;
            return `<details class="filter-accordion" data-group="${g.key}" ${openGroups.has(g.key) || active ? 'open' : ''}>
                <summary>${esc(g.title)}${active ? ` (${active})` : ''}</summary>
                <div class="filter-options">${all.map((opt) => {
                    const n = counts[opt] || 0;
                    const checked = activeFilters[g.key].has(opt);
                    return `<label class="filter-option" style="${!checked && !n ? 'opacity: 0.4;' : ''}"><span><input type="checkbox" data-group="${g.key}" data-value="${esc(opt)}" ${checked ? 'checked' : ''} ${!checked && !n ? 'disabled' : ''}>${esc(opt)}</span><span class="filter-count">(${n})</span></label>`;
                }).join('')}</div>
            </details>`;
        }).join('');
        filterContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            cb.addEventListener('change', (e) => {
                const set = activeFilters[e.target.dataset.group];
                if (e.target.checked) set.add(e.target.dataset.value); else set.delete(e.target.dataset.value);
                updateUI();
            });
        });
    }

    function updateActiveFiltersDisplay() {
        const tags = [];
        GROUPS.forEach((g) => activeFilters[g.key].forEach((v) => tags.push(`<div class="active-filter-tag">${esc(v)} <button class="remove-filter-btn" data-group="${g.key}" data-value="${esc(v)}" aria-label="Remove ${esc(v)}">&times;</button></div>`)));
        activeFiltersDisplay.innerHTML = tags.length ? `${tags.join('')}<button class="clear-all-btn" type="button">Clear All</button>` : '';
        activeFiltersDisplay.querySelectorAll('.remove-filter-btn').forEach((b) => b.addEventListener('click', () => { activeFilters[b.dataset.group].delete(b.dataset.value); updateUI(); }));
        const clear = activeFiltersDisplay.querySelector('.clear-all-btn');
        if (clear) clear.addEventListener('click', () => { GROUPS.forEach((g) => activeFilters[g.key].clear()); updateUI(); });
    }

    // Entries with a `view` open on this site (full page, hosted PDF, or summary); others go straight to the source.
    function viewHref(res) {
        return `${BASE}view.html?id=${encodeURIComponent(res.id)}${COLLECTION === 'therapists' ? '&from=therapists' : ''}`;
    }
    const VIEW_LABEL = { page: 'Read on this site', file: 'Open the PDF', summary: 'Read the overview' };

    function displayResourcesTable(list) {
        if (!list.length) {
            resourceList.innerHTML = '<tr><td colspan="5" style="color: #aaa;">No resources found matching current criteria.</td></tr>';
            return;
        }
        resourceList.innerHTML = list.map((res) => {
            const tags = [...res.audience, ...res.features, ...res.topics.diagnosis, ...res.topics.symptom].map((t) => `<span class="tag-item">${esc(t)}</span>`).join('');
            const onSite = res.view && res.view.type;
            const main = onSite ? viewHref(res) : safeUrl(res.url);
            const actions = [
                onSite ? `<a class="resource-action" href="${esc(viewHref(res))}">${esc(VIEW_LABEL[onSite] || 'View')}</a>` : '',
                res.url ? `<a class="resource-action" href="${esc(safeUrl(res.url))}" target="_blank" rel="noopener noreferrer">${onSite ? 'Original source ↗' : 'Open ↗'}</a>` : ''
            ].filter(Boolean).join('');
            return `<tr>
                <td><a href="${esc(main)}"${onSite ? '' : ' target="_blank" rel="noopener noreferrer"'}>${esc(res.title)}</a><div class="resource-actions">${actions}</div></td>
                <td><span class="resource-type-badge">${esc(res.format)}</span></td>
                <td>${esc(res.description)}</td>
                <td><div class="tag-list">${tags}</div></td>
                <td style="font-size: 0.8em; color: #888;">${cite(res.citation)}</td>
            </tr>`;
        }).join('');
    }
});
