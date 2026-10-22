// Paranormal Investigation Note Generator
// Runs entirely in the browser. Nothing here fetches or writes wiki files;
// saving only happens through the JSON / .md downloads the user clicks.

// Checklist items, in the left/right reading order of the paper worksheet
const LORE_ITEMS = [
    'Portals / Hellmouths', 'Past Rituals',
    'EVPs / Disembodied Voices', 'Physical Mark',
    'Shadow Figures / Apparitions', 'Possessions / Trances',
    'Noises', 'Mimics / Doppelgangers',
    'Temperature Spots', 'Physiological Symptom',
    'Moving Objects', 'Electronic Interference',
    'Orbs', 'Felt Touch',
    'Motion Detection', 'Other'
];
const EQUIPMENT_ITEMS = [
    'Flashlights / String Lights', 'Dowsing Rods',
    'Cat Balls', 'SLS / Kinect Camera',
    'Alice Box / PS Device', 'Thermal Gun / Camera',
    'Spirit Box', 'Ovilus',
    'EMF / Rem Pod / Bell', 'Digital Recorder (EVP)',
    'Motion Detector', 'Other'
];
const METHOD_ITEMS = [
    'Estes Method', 'Solo lockdown',
    'Provocation / Taunting', 'Flashlight Session',
    'Card Reading', 'Automatic Writer',
    { key: 'other-1', label: 'Other' }, { key: 'other-2', label: 'Other' }
];
const OBSERVED_ITEMS = [
    'EVPs / Disembodied Voice', 'Physical Mark',
    'Shadow Figure / Apparition', 'Possessions / Trance',
    'Noise', 'Mimic / Doppelganger',
    'Temperature Spots', 'Physiological Symptom',
    'Moving Objects', 'Electronic Interference',
    'Orb', 'Felt Touch',
    'Motion Detection', 'Other'
];

const CHECKLISTS = {
    lore: { containerId: 'list-lore', items: LORE_ITEMS },
    equipment: { containerId: 'list-equipment', items: EQUIPMENT_ITEMS },
    methods: { containerId: 'list-methods', items: METHOD_ITEMS },
    observed: { containerId: 'list-observed', items: OBSERVED_ITEMS }
};

const form = document.getElementById('note-form');
const mdOutput = document.getElementById('md-output');
const notePrint = document.getElementById('note-print');

// Same filename style as the existing location pages, e.g. "bobby-mackeys-music-world"
function slugify(text) {
    return text.toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/['’"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeItems(items) {
    return items.map(item => typeof item === 'string' ? { key: slugify(item), label: item } : item);
}

function renderChecklist(groupKey) {
    const { containerId, items } = CHECKLISTS[groupKey];
    const container = document.getElementById(containerId);
    CHECKLISTS[groupKey].items = normalizeItems(items);
    CHECKLISTS[groupKey].items.forEach(({ key, label }) => {
        const id = `chk-${groupKey}-${key}`;
        const cell = document.createElement('div');
        cell.className = 'check-cell';
        cell.innerHTML = `
            <label for="${id}"><input type="checkbox" id="${id}" data-group="${groupKey}" data-key="${key}" data-role="checked"> ${label}:</label>
            <input type="text" class="check-note" data-group="${groupKey}" data-key="${key}" data-role="note" aria-label="${label} location notes">`;
        container.appendChild(cell);
    });
}

// --- State (shared by JSON save/load and the Markdown builder) ---
function collectState() {
    const fields = {};
    form.querySelectorAll('[name]').forEach(el => {
        if (el.type === 'radio') {
            if (!(el.name in fields)) fields[el.name] = '';
            if (el.checked) fields[el.name] = el.value;
        } else if (el.type === 'checkbox') {
            fields[el.name] = el.checked;
        } else {
            fields[el.name] = el.value;
        }
    });

    const checklists = {};
    Object.entries(CHECKLISTS).forEach(([groupKey, { items }]) => {
        checklists[groupKey] = items.map(({ key, label }) => ({
            key,
            label,
            checked: form.querySelector(`[data-group="${groupKey}"][data-key="${key}"][data-role="checked"]`).checked,
            note: form.querySelector(`[data-group="${groupKey}"][data-key="${key}"][data-role="note"]`).value
        }));
    });

    return { version: 1, fields, checklists };
}

function applyState(state) {
    form.reset();
    const fields = state.fields || {};
    form.querySelectorAll('[name]').forEach(el => {
        if (!(el.name in fields)) return;
        const value = fields[el.name];
        if (el.type === 'radio') el.checked = el.value === value;
        else if (el.type === 'checkbox') el.checked = Boolean(value);
        else el.value = value ?? '';
    });

    // Matched by key so older saves still load if the item lists change
    Object.entries(state.checklists || {}).forEach(([groupKey, entries]) => {
        if (!CHECKLISTS[groupKey] || !Array.isArray(entries)) return;
        entries.forEach(({ key, checked, note }) => {
            const box = form.querySelector(`[data-group="${groupKey}"][data-key="${key}"][data-role="checked"]`);
            const input = form.querySelector(`[data-group="${groupKey}"][data-key="${key}"][data-role="note"]`);
            if (box) box.checked = Boolean(checked);
            if (input) input.value = note ?? '';
        });
    });
    rememberRadioState();
}

// --- Markdown builder ---
function formatDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00Z`);
    if (isNaN(date)) return value;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// `forHtml` escapes the user's text so a loaded JSON file can't inject markup
// into the note PDF; the copied/downloaded Markdown keeps the raw text.
function buildMarkdown(forHtml = false) {
    const { fields, checklists } = collectState();
    const clean = value => {
        const text = String(value ?? '').replace(/\s*\n\s*/g, ' ').trim();
        return forHtml ? escapeHtml(text) : text;
    };
    const f = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === 'string' ? clean(v) : v]));

    const hasCitation = Boolean(f.creator || f.videoTitle);
    const sup = hasCitation ? ' <sup>1</sup>' : '';
    const checkedItems = group => checklists[group].filter(item => item.checked);
    const itemList = group => checkedItems(group)
        .map(item => clean(item.note) ? `${item.label} (${clean(item.note)})` : item.label)
        .join('; ');

    const lines = [];
    const section = (title, bullets) => {
        const filled = bullets.filter(Boolean);
        if (!filled.length) return;
        lines.push('---', '', `### ${title}`, '', ...filled, '');
    };
    const bullet = (label, value, withSup = true) => value ? `*   **${label}:** ${value}${withSup ? sup : ''}` : '';

    // Header
    lines.push(`# ${f.name || 'Untitled Location'}`, '');
    if (f.type) lines.push(`**Type:** ${f.type}${sup}  `);
    if (f.location) lines.push(`**Location:** ${f.location}${sup}  `);
    const status = [
        f.demolished && `Demolished: ${f.demolished}`,
        f.openToPublic && `Open to Public: ${f.openToPublic}`
    ].filter(Boolean).join(' · ');
    if (status) lines.push(`**Status:** ${status}  `);
    lines.push('');

    section('Overview & Historical Lore', [
        bullet('Estimated Death Toll', f.deathCount),
        bullet('Layout & Hotspots', f.layout),
        bullet('Historical Background', f.history),
        bullet('Reported Lore', itemList('lore')),
        bullet('Known Entities', f.entities)
    ]);

    // Investigation log
    const logBullets = [
        bullet('Collaborators', f.collaborator, false),
        bullet('Tour Guide', f.tourGuide, false),
        bullet('Weather', f.weather, false),
        bullet('Date Watched', formatDate(f.watchDate), false),
        bullet('Equipment Used', itemList('equipment')),
        bullet('Methods Used', itemList('methods'))
    ].filter(Boolean);
    const observedBullets = [
        ...checkedItems('observed').map(item => bullet(item.label, clean(item.note) || 'Observed')),
        bullet('Evidence Findings', f.evidence),
        bullet('Names Received', f.names),
        bullet('Notes', f.notes),
        bullet('Debunked / Environmental Notes', f.debunked)
    ].filter(Boolean);
    if (hasCitation || logBullets.length || observedBullets.length) {
        lines.push('---', '', '### Investigation Log', '');
        if (hasCitation) {
            const heading = [f.creator && `**${f.creator}**`, f.videoTitle && `*"${f.videoTitle}"*`].filter(Boolean).join(' - ');
            lines.push(heading, '');
        }
        if (logBullets.length) lines.push(...logBullets, '');
        if (observedBullets.length) lines.push('#### Observed Evidence & Phenomena', '', ...observedBullets, '');
    }

    lines.push('---', '', '### Worksheet Status', '',
        `- [${f.addedToWiki ? 'x' : ' '}] Added to Wiki`,
        `- [${f.updatedMasterIndex ? 'x' : ' '}] Updated Master Index`, '');

    // Chicago-style note and bibliography entry, matching the existing location pages
    if (hasCitation) {
        const date = formatDate(f.releaseDate);
        const platform = f.platform && `${f.platform} video`;
        const title = f.videoTitle && `"${f.videoTitle}"`;
        const finish = text => text.endsWith('"') ? `${text.slice(0, -1)}."` : `${text}.`;
        const note = finish([f.creator, title, platform, date].filter(Boolean).join(', ').replace(/", /g, ',\" '));
        const bib = finish([f.creator, title, platform, date].filter(Boolean).join('. ').replace(/"\. /g, '." ').replace(/\.\./g, '.'));
        lines.push('---', '', '### Notes', '', `1. ${note}`, '', '### Bibliography', '', bib, '');
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function updateMarkdown() {
    mdOutput.value = buildMarkdown();
}

// --- Downloads ---
function fileBase() {
    return slugify(form.elements.name.value) || 'investigation-note';
}

function downloadFile(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function exportJSON() {
    downloadFile(`${fileBase()}-investigation.json`, JSON.stringify(collectState(), null, 2), 'application/json');
}

function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const state = JSON.parse(reader.result);
            if (!state || typeof state !== 'object' || (!state.fields && !state.checklists)) {
                throw new Error('Not a worksheet file');
            }
            applyState(state);
            updateMarkdown();
        } catch (error) {
            alert('That file could not be loaded. Please choose a JSON file saved from this worksheet.');
        }
    };
    reader.readAsText(file);
}

async function copyMarkdown(button) {
    try {
        await navigator.clipboard.writeText(mdOutput.value);
    } catch (error) {
        mdOutput.select();
        document.execCommand('copy');
    }
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => { button.textContent = original; }, 1500);
}

// --- Printing ---
// Inputs and textareas clip long text when printed, so each one gets a
// mirror element that is shown in place of the control on paper.
function setupPrintMirrors() {
    form.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => {
        const mirror = document.createElement(el.tagName === 'TEXTAREA' ? 'div' : 'span');
        mirror.className = 'print-mirror';
        mirror.setAttribute('aria-hidden', 'true');
        if (el.dataset.printHeight) mirror.style.minHeight = el.dataset.printHeight;
        el.after(mirror);
    });
}

function syncPrintMirrors() {
    form.querySelectorAll('.print-mirror').forEach(mirror => {
        const el = mirror.previousElementSibling;
        mirror.textContent = el.type === 'date' ? formatDate(el.value) : el.value;
    });
}

function printWorksheet() {
    document.body.classList.remove('print-note');
    window.print();
}

function printNote() {
    const markdown = buildMarkdown(true);
    notePrint.innerHTML = window.marked
        ? marked.parse(markdown)
        : `<pre>${markdown}</pre>`;
    document.body.classList.add('print-note');
    window.print();
}

window.addEventListener('beforeprint', syncPrintMirrors);
window.addEventListener('afterprint', () => document.body.classList.remove('print-note'));

// Radios can't normally be unchecked; clicking the selected Yes/No again clears it
function rememberRadioState() {
    form.querySelectorAll('input[type="radio"]').forEach(radio => { radio.dataset.wasChecked = radio.checked; });
}
form.addEventListener('click', event => {
    const radio = event.target.closest('input[type="radio"]');
    if (!radio) return;
    if (radio.dataset.wasChecked === 'true') radio.checked = false;
    rememberRadioState();
    updateMarkdown();
});

// --- Wiring ---
Object.keys(CHECKLISTS).forEach(renderChecklist);
setupPrintMirrors();
rememberRadioState();

form.addEventListener('input', event => {
    // Typing a location note marks that item as checked
    if (event.target.dataset.role === 'note' && event.target.value.trim()) {
        event.target.closest('.check-cell').querySelector('[data-role="checked"]').checked = true;
    }
    updateMarkdown();
});
form.addEventListener('change', () => {
    rememberRadioState();
    updateMarkdown();
});
form.addEventListener('submit', event => event.preventDefault());

document.getElementById('btn-save-json').addEventListener('click', exportJSON);
const fileInput = document.getElementById('json-file');
document.getElementById('btn-load-json').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) importJSON(fileInput.files[0]);
    fileInput.value = '';
});
document.getElementById('btn-print').addEventListener('click', printWorksheet);
document.getElementById('btn-clear').addEventListener('click', () => {
    if (!confirm('Clear the whole worksheet? Anything you have not saved as JSON will be lost.')) return;
    form.reset();
    rememberRadioState();
    updateMarkdown();
});
document.getElementById('btn-copy-md').addEventListener('click', event => copyMarkdown(event.currentTarget));
document.getElementById('btn-download-md').addEventListener('click', () => downloadFile(`${fileBase()}.md`, mdOutput.value, 'text/markdown'));
document.getElementById('btn-note-pdf').addEventListener('click', printNote);

updateMarkdown();
