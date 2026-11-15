// Shared loader for the Therapist Toolkit's diagnosis list and therapy styles.
// Every tool reads the same files in therapist-tools/shared/, so codes stay in one place.
//
//   TTShared.loadDiagnoses().then((dx) => {
//       dx.ICD  -> [{ code, name, family }]   (ICD-10-CM titles)
//       dx.DSM  -> [{ code, name, family }]   (DSM-5-TR names, same ICD-10-CM codes)
//       dx.byCode['F41.1'] -> { code, icd, dsm, family }
//       dx.families -> DSM-5-TR chapter names, in order
//   });
//   TTShared.loadCrisisLines().then((c) => c.national);
//   TTShared.loadTherapyStyles().then((styles) => [{ name, skills: [...] }]);
//   TTShared.label(entry, system) -> "F41.1 - Generalized Anxiety Disorder"
//   TTShared.listJoin(['A', 'B', 'C']) -> "A, B, and C" (Oxford comma)
//   TTShared.showLoadError(element, what) -> adds a visible error under a field
window.TTShared = window.TTShared || (function () {
    'use strict';

    // Resolve the shared folder from this script's own URL, so it works from any tool folder.
    const script = document.currentScript;
    const base = script && script.src ? new URL('.', script.src).href : '../shared/';
    const cache = {};

    function getJson(file) {
        if (!cache[file]) {
            cache[file] = fetch(base + file, { cache: 'no-cache' }).then((res) => {
                if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
                return res.json();
            });
        }
        return cache[file];
    }

    function loadDiagnoses() {
        return getJson('diagnoses.json').then((raw) => {
            const list = raw.diagnoses || [];
            return {
                meta: raw.meta || {},
                families: raw.families || [],
                list,
                ICD: list.map((d) => ({ code: d.code, name: d.icd, family: d.family })),
                DSM: list.map((d) => ({ code: d.code, name: d.dsm, family: d.family })),
                byCode: Object.fromEntries(list.map((d) => [d.code, d]))
            };
        });
    }

    function loadTherapyStyles() {
        return getJson('therapy_styles.json');
    }

    function loadStates() {
        return getJson('states.json');
    }

    // CPT codes ({ codes: [{ code, desc, minutes?, addOn? }] })
    function loadCptCodes() {
        return getJson('cpt-codes.json');
    }

    // National crisis and support lines ({ national: [{ name, contact, tags }] })
    function loadCrisisLines() {
        return getJson('crisis-lines.json');
    }

    function label(entry, system) {
        const name = system === 'DSM' ? (entry.dsm || entry.name) : (entry.icd || entry.name);
        return `${entry.code} - ${name}`;
    }

    // Sentence-style list with the Oxford comma: "A", "A and B", "A, B, and C".
    function listJoin(items, conjunction = 'and') {
        const list = (items || []).filter((x) => x !== undefined && x !== null && String(x).trim() !== '');
        if (list.length <= 1) return list.join('');
        if (list.length === 2) return `${list[0]} ${conjunction} ${list[1]}`;
        return `${list.slice(0, -1).join(', ')}, ${conjunction} ${list[list.length - 1]}`;
    }

    function showLoadError(element, what) {
        const el = typeof element === 'string' ? document.querySelector(element) : (element && element.jquery ? element[0] : element);
        if (!el || !el.parentNode || el.parentNode.querySelector('.shared-load-error')) return;
        const note = document.createElement('p');
        note.className = 'shared-load-error danger-text text-sm mt-1';
        note.setAttribute('role', 'alert');
        note.textContent = `Couldn't load the ${what}. Check your connection and refresh the page.`;
        el.parentNode.appendChild(note);
    }

    return { base, getJson, loadDiagnoses, loadTherapyStyles, loadStates, loadCrisisLines, loadCptCodes, label, listJoin, showLoadError };
})();
