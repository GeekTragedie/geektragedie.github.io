// Shared "Practice data" for the Therapist Toolkit.
// Upload the Practice Info Sheet's practice_master_info.json once, and every tool can
// pre-fill the clinician and business fields from it. It's kept in this browser only
// (localStorage) until the user clicks Forget.
//
// Fields opt in with data-practice="path.into.the.json", e.g.
//   <input data-practice="therapist.clinicianFullName">
//   <input data-practice="therapist.licenses.0.number">
//   <input data-practice="business.businessAddress" data-practice-join=", ">
// Empty fields are filled; anything the user already typed is left alone.
// Tools can also listen for:  document.addEventListener('practicedata:loaded', e => e.detail)
// and 'practicedata:forgotten' (fired after Forget).
window.TTPractice = window.TTPractice || (function () {
    'use strict';

    const KEY = 'geektragedie_practice_data_v1';
    const listeners = [];

    function read() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function isPracticeData(data) {
        return !!(data && typeof data === 'object' && (data.therapist || data.business) && !data.texts);
    }

    function getPath(obj, path) {
        return path.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
    }

    function fill(data, root) {
        if (!data) return 0;
        let count = 0;
        (root || document).querySelectorAll('[data-practice]').forEach((el) => {
            let val = getPath(data, el.dataset.practice);
            if (val === undefined || val === null || val === '') return;
            if (Array.isArray(val)) val = val.join(', ');
            val = String(val);
            if (el.dataset.practiceJoin !== undefined) val = val.replace(/\s*\n\s*/g, el.dataset.practiceJoin);
            if (el.type === 'checkbox' || el.type === 'radio') return;
            if (el.value && el.value.trim() !== '') return;
            if (el.tagName === 'SELECT') {
                const match = Array.from(el.options).find((o) => o.value === val || o.textContent.trim() === val);
                if (!match) return;
                el.value = match.value;
            } else {
                el.value = val;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            count += 1;
        });
        return count;
    }

    function announce(data) {
        document.dispatchEvent(new CustomEvent('practicedata:loaded', { detail: data }));
        listeners.forEach((fn) => { try { fn(data); } catch (e) { console.warn(e); } });
    }

    function set(data) {
        if (!isPracticeData(data)) throw new Error('Not a Practice Info Sheet file');
        localStorage.setItem(KEY, JSON.stringify(data));
        const filled = fill(data);
        announce(data);
        renderStatus();
        return filled;
    }

    function forget() {
        localStorage.removeItem(KEY);
        document.dispatchEvent(new CustomEvent('practicedata:forgotten'));
        renderStatus();
    }

    function summary(data) {
        if (!data) return '';
        const t = data.therapist || {};
        const b = data.business || {};
        return t.clinicianFullName || b.legalBusinessName || b.tradeDbaName || 'Practice data';
    }

    // --- Sidebar group (added automatically to the tool menu) ---
    let statusEl;
    let forgetBtn;
    function renderStatus() {
        if (!statusEl) return;
        const data = read();
        statusEl.textContent = data ? `Using ${summary(data)}, saved on this device.` : 'Upload your Practice Info Sheet .json to pre-fill your details on every tool.';
        forgetBtn.hidden = !data;
    }

    function buildSidebarGroup() {
        const body = document.querySelector('.tool-menu-body');
        if (!body || body.querySelector('.practice-data-group') || document.body.dataset.noPracticeData !== undefined) return;
        const group = document.createElement('div');
        group.className = 'sidebar-group practice-data-group';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', 'Practice data');
        group.innerHTML = `
            <span class="sidebar-label">Practice data</span>
            <button type="button" class="btn btn-sm sidebar-btn" data-practice-upload>Upload practice info</button>
            <input type="file" accept=".json,application/json" class="hidden" data-practice-file>
            <button type="button" class="btn btn-sm sidebar-btn" data-practice-forget hidden>Forget practice data</button>
            <span class="sidebar-hint muted" data-practice-status></span>`;
        const fileGroup = body.querySelector('.sidebar-group[aria-label="Your file"]');
        body.insertBefore(group, fileGroup || null);
        statusEl = group.querySelector('[data-practice-status]');
        forgetBtn = group.querySelector('[data-practice-forget]');
        const input = group.querySelector('[data-practice-file]');
        group.querySelector('[data-practice-upload]').addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            const file = input.files[0];
            input.value = '';
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const filled = set(JSON.parse(reader.result));
                    statusEl.textContent = `${statusEl.textContent} ${filled ? `Filled ${filled} field${filled === 1 ? '' : 's'}.` : ''}`.trim();
                } catch (err) {
                    alert('That file isn’t a Practice Info Sheet .json. On the Practice Info Sheet, use Save .json to make one.');
                }
            };
            reader.readAsText(file);
        });
        forgetBtn.addEventListener('click', () => {
            if (!confirm('Forget your practice data on this device? Fields already filled in stay as they are.')) return;
            forget();
        });
        renderStatus();
    }

    function init() {
        buildSidebarGroup();
        const data = read();
        if (data) {
            fill(data);
            announce(data);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    return {
        get: read,
        set,
        forget,
        fill: (root) => fill(read(), root),
        isPracticeData,
        onLoad: (fn) => { listeners.push(fn); const d = read(); if (d) fn(d); }
    };
})();
