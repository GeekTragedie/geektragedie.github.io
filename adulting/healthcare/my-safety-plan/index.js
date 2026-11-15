// My Safety Plan (client version). Suggestions and crisis lines are shared with the
// therapist Safety / Crisis Plan Builder, so they live in one place.
(function () {
    'use strict';
    const SUGGESTIONS_URL = '../../../therapist-tools/crisisplangenerator/crisis-plan-data.json';
    const defaults = {
        warningSigns: '', coping: '', distractions: [], helpers: [],
        pros: { therapist: '', therapistPhone: '', doctor: '', doctorPhone: '', er: '' },
        state: '', lineTags: [], safer: '', reasons: ''
    };
    const lines = (text) => String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
    let crisis = { national: [], state: [], stateName: '' };

    function list(items) {
        return items.length ? `<ul>${items.map((i) => `<li>${CT.esc(i)}</li>`).join('')}</ul>` : '<p class="ct-empty">Not filled in yet.</p>';
    }
    function people(rows, a, b) {
        return list(rows.map((r) => [r[a], r[b]].filter(Boolean).join(': ')));
    }
    function render(s) {
        const p = s.pros;
        const pros = [
            p.therapist || p.therapistPhone ? `My therapist: ${[p.therapist, p.therapistPhone].filter(Boolean).join(', ')}` : '',
            p.doctor || p.doctorPhone ? `My doctor: ${[p.doctor, p.doctorPhone].filter(Boolean).join(', ')}` : '',
            p.er ? `Emergency room or urgent care: ${p.er}` : ''
        ].filter(Boolean);
        const crisisItems = [...crisis.national, ...crisis.state].map((l) => `${l.name}: ${l.contact}`);
        document.getElementById('ctOutput').innerHTML = `
            <h2>My Safety Plan</h2>
            <p class="ct-empty">Made ${CT.esc(CT.prettyDate(CT.localDate()))}. If I’m in danger right now, I call 911.</p>
            <h3>Warning signs that a hard time is starting</h3>${list(lines(s.warningSigns))}
            <h3>Things I can do on my own</h3>${list(lines(s.coping))}
            <h3>People and places that take my mind off things</h3>${people(s.distractions, 'name', 'contact')}
            <h3>People I can ask for help</h3>${people(s.helpers, 'name', 'phone')}
            <h3>Professionals and crisis lines</h3>${list([...pros, ...crisisItems])}
            <h3>Making my space safer</h3>${list(lines(s.safer))}
            <h3>What matters to me</h3>${list(lines(s.reasons))}`;
    }
    function toText(s) {
        return document.getElementById('ctOutput').innerText;
    }

    const app = CT.init({
        key: 'safety_plan', fileName: 'my_safety_plan', defaults, render, toText,
        resetMessage: 'Clear your whole safety plan? Save a .json copy first if you want to keep it.'
    });

    // Crisis lines follow the chosen state and the "also show" boxes
    function refreshLines() {
        CT.linesFor(app.state.state, app.state.lineTags).then((c) => { crisis = c; app.render(); });
    }
    document.addEventListener('change', (e) => {
        if (e.target.id === 'spState' || e.target.dataset.list === 'lineTags') refreshLines();
    });
    CT.fillStateSelect(document.getElementById('spState')).then(() => {
        document.getElementById('spState').value = app.state.state || '';
        refreshLines();
    });

    // Tap a suggestion to add it as a new line
    fetch(SUGGESTIONS_URL).then((r) => r.json()).then((data) => {
        document.querySelectorAll('[data-chips]').forEach((box) => {
            (data[box.dataset.source] || []).forEach((text) => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'ct-chip'; b.textContent = `+ ${text}`;
                b.addEventListener('click', () => {
                    const field = box.dataset.chips;
                    const cur = lines(app.state[field]);
                    if (!cur.includes(text)) app.set(field, [...cur, text].join('\n'));
                });
                box.appendChild(b);
            });
        });
    }).catch(() => {});
})();
