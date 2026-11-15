// Shared helpers for the Healthcare client tools (no jQuery).
// Each tool calls CT.init({...}) with its own storage key, defaults, and render function.
//
//   <input data-field="since.mood">            -> state.since.mood (number inputs/ranges store numbers)
//   <input type="checkbox" data-field="x.y">   -> true/false
//   <input type="checkbox" data-list="basics" value="water"> -> state.basics = ['water', ...]
//   <div data-rows="people" data-row-fields="name,phone" data-row-labels="Name,Phone"></div>
//        -> state.people = [{ name, phone }, ...] with + Add / Remove buttons
//   [data-action="export" | "import" | "print" | "reset"] in the sidebar
//   #saveLocalToggle: opt-in browser saving (off by default)
//   CT.crisisBox(el, stateCode): national + state crisis lines from therapist-tools/shared
window.CT = window.CT || (function () {
    'use strict';

    const esc = (v) => String(v === undefined || v === null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    function setPath(obj, path, val) {
        const keys = path.split('.');
        let o = obj;
        keys.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
        o[keys[keys.length - 1]] = val;
    }
    const clone = (x) => JSON.parse(JSON.stringify(x));
    function deepMerge(base, extra) {
        if (Array.isArray(base) || typeof base !== 'object' || base === null) return extra === undefined ? base : extra;
        const out = { ...base };
        Object.keys(extra || {}).forEach((k) => { out[k] = k in base ? deepMerge(base[k], extra[k]) : extra[k]; });
        return out;
    }
    function localDate() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function prettyDate(v) {
        const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return '';
        return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    function listJoin(items) {
        const list = (items || []).filter((x) => x !== undefined && x !== null && String(x).trim() !== '');
        if (list.length <= 2) return list.join(' and ');
        return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
    }
    function download(text, name, type) {
        const url = URL.createObjectURL(new Blob([text], { type }));
        const a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    }
    function toast(msg) {
        let t = document.getElementById('ctToast');
        if (!t) { t = document.createElement('div'); t.id = 'ctToast'; t.className = 'ct-toast'; t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
        t.textContent = msg; t.classList.add('show');
        clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
    }

    // --- Repeatable rows ---
    function renderRows(box, rows) {
        const fields = box.dataset.rowFields.split(',');
        const labels = (box.dataset.rowLabels || box.dataset.rowFields).split(',');
        const placeholders = (box.dataset.rowPlaceholders || '').split('|');
        box.innerHTML = '';
        (rows.length ? rows : [{}]).forEach((row, i) => {
            const div = document.createElement('div');
            div.className = 'ct-row';
            div.innerHTML = fields.map((f, j) => `<label class="ct-row-field"><span>${esc(labels[j])}</span><input type="text" data-row-field="${esc(f)}" value="${esc(row[f] || '')}" placeholder="${esc(placeholders[j] || '')}"></label>`).join('')
                + `<button type="button" class="btn-link ct-row-remove" aria-label="Remove row ${i + 1}">Remove</button>`;
            box.appendChild(div);
        });
        const add = document.createElement('button');
        add.type = 'button'; add.className = 'btn btn-sm ct-row-add';
        add.textContent = box.dataset.addLabel || '+ Add another';
        box.appendChild(add);
    }
    function readRows(box) {
        const fields = box.dataset.rowFields.split(',');
        return Array.from(box.querySelectorAll('.ct-row')).map((r) => {
            const o = {};
            fields.forEach((f) => { o[f] = r.querySelector(`[data-row-field="${f}"]`).value; });
            return o;
        }).filter((o) => Object.values(o).some((v) => String(v).trim()));
    }

    function init(cfg) {
        const KEY = `geektragedie_client_${cfg.key}_v1`;
        const ON = `${KEY}_on`;
        let state = clone(cfg.defaults);
        const root = document.querySelector(cfg.root || '.tool-panel');
        const toggle = document.getElementById('saveLocalToggle');

        function normalize(s) {
            let out = deepMerge(clone(cfg.defaults), s || {});
            if (cfg.normalize) out = cfg.normalize(out) || out;
            return out;
        }
        function save() {
            if (toggle && toggle.checked) localStorage.setItem(KEY, JSON.stringify(state));
        }
        function fillForm() {
            root.querySelectorAll('[data-field]').forEach((el) => {
                const v = getPath(state, el.dataset.field);
                if (el.type === 'checkbox') el.checked = !!v;
                else if (el.type === 'radio') el.checked = String(v) === el.value;
                else el.value = v === undefined || v === null ? '' : v;
            });
            root.querySelectorAll('[data-list]').forEach((el) => {
                el.checked = (getPath(state, el.dataset.list) || []).includes(el.value);
            });
            root.querySelectorAll('[data-rows]').forEach((box) => renderRows(box, getPath(state, box.dataset.rows) || []));
        }
        function readForm(target) {
            const el = target;
            if (el.dataset.field) {
                let v = el.type === 'checkbox' ? el.checked : el.value;
                if (el.type === 'number' || el.type === 'range') v = el.value === '' ? '' : Number(el.value);
                if (el.type === 'radio' && !el.checked) return;
                setPath(state, el.dataset.field, v);
            } else if (el.dataset.list) {
                const path = el.dataset.list;
                setPath(state, path, Array.from(root.querySelectorAll(`[data-list="${path}"]:checked`)).map((x) => x.value));
            } else {
                const box = el.closest('[data-rows]');
                if (box) setPath(state, box.dataset.rows, readRows(box));
            }
        }
        let raf = 0;
        function render() {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => { cfg.render(state, api); save(); });
        }

        root.addEventListener('input', (e) => { readForm(e.target); render(); });
        root.addEventListener('change', (e) => { readForm(e.target); render(); });
        root.addEventListener('click', (e) => {
            const add = e.target.closest('.ct-row-add');
            const rem = e.target.closest('.ct-row-remove');
            const box = e.target.closest('[data-rows]');
            if (!box || (!add && !rem)) return;
            const rows = readRows(box);
            if (add) {
                renderRows(box, [...rows, {}]);
                const last = box.querySelectorAll('.ct-row');
                const input = last[last.length - 1].querySelector('input');
                if (input) input.focus();
            }
            if (rem) { rem.closest('.ct-row').remove(); setPath(state, box.dataset.rows, readRows(box)); if (!box.querySelector('.ct-row')) renderRows(box, []); }
            render();
        });

        // Sidebar actions
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const act = btn.dataset.action;
            if (act === 'export') {
                download(JSON.stringify({ kind: `client-${cfg.key}`, version: 1, saved: localDate(), ...state }, null, 2), `${cfg.fileName || cfg.key}_${localDate()}.json`, 'application/json');
            } else if (act === 'import') {
                document.getElementById('importJsonFile').click();
            } else if (act === 'print') {
                cfg.render(state, api);
                setTimeout(() => window.print(), 30);
            } else if (act === 'copy') {
                const text = cfg.toText ? cfg.toText(state) : (document.getElementById('ctOutput') || {}).innerText || '';
                navigator.clipboard.writeText(text).then(() => toast('Copied.'), () => toast('Couldn’t copy. Select the text and copy it yourself.'));
            } else if (act === 'reset') {
                if (!confirm(cfg.resetMessage || 'Clear everything on this page and start over?')) return;
                state = normalize({});
                localStorage.removeItem(KEY);
                fillForm(); render();
            }
        });
        const file = document.getElementById('importJsonFile');
        if (file) file.addEventListener('change', () => {
            const f = file.files[0];
            if (!f) return;
            f.text().then((txt) => {
                let data;
                try { data = JSON.parse(txt); } catch (err) { data = null; }
                if (cfg.importOther && data && cfg.importOther(data, state)) { fillForm(); render(); file.value = ''; return; }
                if (!data || (data.kind && data.kind !== `client-${cfg.key}`)) { alert('That file wasn’t saved from this tool.'); file.value = ''; return; }
                ['kind', 'version', 'saved'].forEach((k) => delete data[k]);
                state = normalize(data);
                fillForm(); render();
                toast('Loaded.');
                file.value = '';
            });
        });
        if (toggle) {
            toggle.checked = localStorage.getItem(ON) === 'true';
            toggle.addEventListener('change', () => {
                if (toggle.checked) { localStorage.setItem(ON, 'true'); save(); toast('Saving in this browser.'); }
                else { localStorage.removeItem(ON); localStorage.removeItem(KEY); toast('Browser copy erased.'); }
            });
            if (toggle.checked) {
                try { state = normalize(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (err) { state = normalize({}); }
            } else {
                state = normalize({});
            }
        }

        const api = {
            get state() { return state; },
            set(path, val) { setPath(state, path, val); fillForm(); render(); },
            render, fillForm, toast
        };
        fillForm();
        render();
        return api;
    }

    // Crisis lines: national list plus the chosen state's lines, from therapist-tools/shared
    let linesPromise = null;
    function crisisLines() {
        if (!linesPromise) {
            linesPromise = window.TTShared
                ? Promise.all([TTShared.loadCrisisLines().catch(() => ({ national: [] })), TTShared.loadStates().catch(() => ({ list: [], states: {} }))])
                : Promise.resolve([{ national: [] }, { list: [], states: {} }]);
        }
        return linesPromise;
    }
    function fillStateSelect(select) {
        return crisisLines().then(([, states]) => {
            const cur = select.value;
            select.innerHTML = '<option value="">Choose your state…</option>' + (states.list || []).map(([c, n]) => `<option value="${esc(c)}">${esc(n)}</option>`).join('');
            select.value = cur;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
    function linesFor(stateCode, tags) {
        return crisisLines().then(([lines, states]) => {
            const want = new Set(['general', ...(tags || [])]);
            const pick = (arr) => (arr || []).filter((l) => (l.tags || ['general']).some((t) => want.has(t)));
            const st = (states.states || {})[stateCode];
            return { national: pick(lines.national), state: st ? pick(st.resources) : [], stateName: st ? st.name : '' };
        });
    }

    return { init, esc, getPath, listJoin, localDate, prettyDate, download, toast, crisisLines, linesFor, fillStateSelect };
})();
