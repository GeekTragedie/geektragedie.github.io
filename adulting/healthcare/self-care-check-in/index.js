// Self-Care Check-In: a quick check of how you're doing, with cited ideas for the
// areas running lowest. Suggestions and sources live in self-care-data.json.
(function () {
    'use strict';
    const defaults = {
        now: { energy: 5, mood: 5, stress: 5, sensory: 5 },
        basics: [],
        week: { sleepHours: '', sleep: 5, connection: 5, joy: 5 },
        history: []
    };
    let data = null;

    // Every area scored 1–10 where higher means "doing okay"
    function scores(s) {
        const has = (k) => s.basics.includes(k);
        const hours = s.week.sleepHours === '' ? null : Number(s.week.sleepHours);
        let sleep = s.week.sleep;
        if (hours !== null && !Number.isNaN(hours)) sleep = Math.min(sleep, hours < 6 ? 3 : hours < 7 ? 5 : 10);
        return {
            energy: s.now.energy,
            mood: s.now.mood,
            stress: 11 - s.now.stress,
            sensory: 11 - s.now.sensory,
            sleep,
            connection: s.week.connection,
            joy: s.week.joy,
            food: has('water') && has('food') ? 8 : (has('water') || has('food') ? 5 : 3),
            movement: has('moved') ? 8 : 4
        };
    }
    const dayOfYear = () => { const d = new Date(); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000); };
    const srcLinks = (ids) => ids.map((id) => data.sources[id]).filter(Boolean).map((x) => `<a href="${CT.esc(x.url)}" target="_blank" rel="noopener">${CT.esc(x.org)}</a>`).join(', ');
    const tipHtml = (t) => `<li>${CT.esc(t.text)} <span class="ct-help">(${srcLinks(t.sources)})</span></li>`;

    function lowAreas(s) {
        return Object.entries(scores(s)).filter(([, v]) => v <= 5).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([k]) => k);
    }

    function renderIdeas(s) {
        const box = document.getElementById('scIdeas');
        if (!data) { box.innerHTML = '<p class="ct-help">Loading ideas…</p>'; return; }
        const low = lowAreas(s);
        const offset = dayOfYear();
        const urgent = s.now.mood <= 3 || s.now.stress >= 8;
        let html = '';
        if (!low.length) {
            html += '<p>Nothing is running low right now. Keep doing what’s working, and check in again when things change.</p>';
        } else {
            html += `<p class="ct-help">Your lowest ${low.length === 1 ? 'area is' : 'areas are'} ${CT.esc(CT.listJoin(low.map((k) => data.areas[k].name.toLowerCase())))}. Pick one idea that feels doable.</p>`;
            low.forEach((k) => {
                const area = data.areas[k];
                const tips = area.tips.map((_, i) => area.tips[(i + offset) % area.tips.length]);
                html += `<div class="ct-callout"><p><strong>${CT.esc(area.name)}</strong></p><ul>${tips.slice(0, 2).map(tipHtml).join('')}</ul>${tips.length > 2 ? `<details><summary class="ct-help">More ideas</summary><ul>${tips.slice(2).map(tipHtml).join('')}</ul></details>` : ''}</div>`;
            });
        }
        html += `<div class="ct-callout${urgent ? ' is-urgent' : ''}"><details${urgent ? ' open' : ''}><summary><strong>When to get more help</strong></summary><ul>${data.getHelp.map(tipHtml).join('')}</ul></details></div>`;
        box.innerHTML = html;
    }

    function renderHistory(s) {
        const box = document.getElementById('scHistory');
        const rows = s.history.slice(-14).reverse();
        if (!rows.length) { box.innerHTML = '<p class="ct-help" style="margin-top:.5rem">No check-ins saved yet.</p>'; return; }
        box.innerHTML = `<div class="ct-output" style="margin-top:.75rem;padding:.5rem"><table><thead><tr><th>Date</th><th>Energy</th><th>Mood</th><th>Stress</th><th>Sensory</th><th>Rested</th><th>Basics</th></tr></thead><tbody>
            ${rows.map((h) => `<tr><td>${CT.esc(CT.prettyDate(h.date))}</td><td>${h.energy}</td><td>${h.mood}</td><td>${h.stress}</td><td>${h.sensory}</td><td>${h.sleep}</td><td>${h.basics}/8</td></tr>`).join('')}
        </tbody></table></div>`;
    }

    function render(s) {
        const out = (id, v) => { const el = document.getElementById(`${id}Out`); if (el) el.textContent = `${v} / 10`; };
        out('scEnergy', s.now.energy); out('scMood', s.now.mood); out('scStress', s.now.stress); out('scSensory', s.now.sensory);
        out('scSleep', s.week.sleep); out('scConnection', s.week.connection); out('scJoy', s.week.joy);
        renderIdeas(s);
        renderHistory(s);
        const low = data ? lowAreas(s).map((k) => data.areas[k].name) : [];
        document.getElementById('ctOutput').innerHTML = `
            <h2>Self-Care Check-In</h2>
            <p>${CT.esc(CT.prettyDate(CT.localDate()))}</p>
            <p>Energy ${s.now.energy}/10 · Mood ${s.now.mood}/10 · Stress ${s.now.stress}/10 · Sensory load ${s.now.sensory}/10</p>
            <p>Rested ${s.week.sleep}/10${s.week.sleepHours !== '' ? ` (about ${CT.esc(s.week.sleepHours)} hours a night)` : ''} · Connected ${s.week.connection}/10 · Joy ${s.week.joy}/10</p>
            <p>Basics today: ${s.basics.length} of 8</p>
            ${low.length ? `<p>Running lowest: ${CT.esc(CT.listJoin(low))}</p>` : ''}`;
    }

    const app = CT.init({ key: 'self_care', fileName: 'self_care_check_in', defaults, render,
        toText: () => document.getElementById('ctOutput').innerText,
        resetMessage: 'Clear today’s check-in and your saved history?' });

    document.getElementById('scSaveToday').addEventListener('click', () => {
        const s = app.state;
        const entry = { date: CT.localDate(), energy: s.now.energy, mood: s.now.mood, stress: s.now.stress, sensory: s.now.sensory, sleep: s.week.sleep, basics: s.basics.length };
        const history = s.history.filter((h) => h.date !== entry.date).concat(entry).slice(-120);
        app.set('history', history);
        app.toast(document.getElementById('saveLocalToggle').checked ? 'Saved today’s check-in.' : 'Saved for now. Turn on “Save in this browser” to keep it.');
    });

    fetch('self-care-data.json').then((r) => r.json()).then((d) => {
        data = d;
        const used = Object.values(d.sources);
        document.getElementById('scSources').innerHTML = used
            .sort((a, b) => a.org.localeCompare(b.org))
            .map((x) => `<p>${CT.esc(x.org)}. (${CT.esc(x.date)}). <em>${CT.esc(x.title)}</em>. <a href="${CT.esc(x.url)}" target="_blank" rel="noopener">${CT.esc(x.url)}</a></p>`).join('');
        app.render();
    }).catch(() => { document.getElementById('scIdeas').innerHTML = '<p class="ct-help">The ideas couldn’t load. Refresh to try again.</p>'; });
})();
