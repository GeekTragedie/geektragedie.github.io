// Assignments Organizer: a week-by-week grid of readings and assignments for each course.
// Term and courses use the shared client-tool bindings; the grid is drawn here and stored as
// state.cells["<week>|<courseIndex>"] = { reading, assignment, due, status }.
(function () {
    'use strict';
    const STATUS = [
        { value: '', label: 'Status' },
        { value: 'done', label: 'Done' },
        { value: 'skimmed', label: 'Skimmed' },
        { value: 'notdone', label: 'Not finished' }
    ];
    const defaults = { term: { name: '', start: '', weeks: 10 }, courses: [], cells: {} };
    const grid = document.getElementById('aoGrid');
    let gridKey = '';

    const weeksOf = (s) => Math.max(1, Math.min(20, Math.round(Number(s.term.weeks) || 1)));
    const courseNames = (s) => s.courses.map((c, i) => c.name || `Course ${i + 1}`);
    function weekDates(s, w) {
        const m = String(s.term.start || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return '';
        const start = new Date(+m[1], +m[2] - 1, +m[3] + (w - 1) * 7);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
        const f = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `${f(start)} – ${f(end)}`;
    }
    const cell = (s, w, c) => s.cells[`${w}|${c}`] || {};

    function drawGrid(s) {
        const names = courseNames(s);
        if (!names.length) {
            grid.innerHTML = '<p class="ct-help">Add a course above to start the grid.</p>';
            return;
        }
        let html = '<table class="ao-grid"><thead><tr><th>Week</th>' + names.map((n) => `<th>${CT.esc(n)}</th>`).join('') + '</tr></thead><tbody>';
        for (let w = 1; w <= weeksOf(s); w++) {
            html += `<tr><th scope="row"><span class="ao-week">Week ${w}</span><span class="ao-dates" data-week-dates="${w}">${CT.esc(weekDates(s, w))}</span></th>`;
            names.forEach((n, c) => {
                const v = cell(s, w, c);
                html += `<td class="ao-cell ao-${CT.esc(v.status || 'none')}" data-cell="${w}|${c}">
                    <label class="sr-only" for="r${w}-${c}">${CT.esc(n)}, week ${w} readings</label>
                    <textarea id="r${w}-${c}" data-k="reading" rows="2" placeholder="Readings">${CT.esc(v.reading || '')}</textarea>
                    <label class="sr-only" for="a${w}-${c}">${CT.esc(n)}, week ${w} assignment</label>
                    <input id="a${w}-${c}" data-k="assignment" type="text" placeholder="Assignment" value="${CT.esc(v.assignment || '')}">
                    <div class="ao-cell-row">
                        <label class="sr-only" for="d${w}-${c}">Due date</label>
                        <input id="d${w}-${c}" data-k="due" type="date" value="${CT.esc(v.due || '')}">
                        <label class="sr-only" for="s${w}-${c}">Status</label>
                        <select id="s${w}-${c}" data-k="status">${STATUS.map((o) => `<option value="${o.value}" ${o.value === (v.status || '') ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
                    </div>
                </td>`;
            });
            html += '</tr>';
        }
        grid.innerHTML = html + '</tbody></table>';
    }

    function render(s) {
        const key = `${weeksOf(s)}|${courseNames(s).join('\u0001')}`;
        if (key !== gridKey) { gridKey = key; drawGrid(s); }
        else grid.querySelectorAll('[data-week-dates]').forEach((el) => { el.textContent = weekDates(s, Number(el.dataset.weekDates)); });
        // Printable plan: only weeks and cells with something in them
        const names = courseNames(s);
        const rows = [];
        for (let w = 1; w <= weeksOf(s); w++) {
            names.forEach((n, c) => {
                const v = cell(s, w, c);
                if (v.reading || v.assignment || v.due) rows.push({ w, n, v });
            });
        }
        const label = (st) => (STATUS.find((o) => o.value === st) || STATUS[0]).label.replace('Status', '');
        document.getElementById('ctOutput').innerHTML = `
            <h2>${CT.esc(s.term.name || 'Assignments')}</h2>
            ${s.courses.length ? `<p>${s.courses.map((c, i) => CT.esc([names[i], c.when].filter(Boolean).join(' · '))).join('<br>')}</p>` : ''}
            ${rows.length ? `<table><thead><tr><th>Week</th><th>Course</th><th>Readings</th><th>Assignment</th><th>Due</th><th>Status</th></tr></thead><tbody>
                ${rows.map(({ w, n, v }) => `<tr class="ao-${CT.esc(v.status || 'none')}"><td>${w}${weekDates(s, w) ? `<br><small>${CT.esc(weekDates(s, w))}</small>` : ''}</td><td>${CT.esc(n)}</td><td>${CT.esc(v.reading || '').replace(/\n/g, '<br>')}</td><td>${CT.esc(v.assignment || '')}</td><td>${CT.esc(CT.prettyDate(v.due))}</td><td>${CT.esc(label(v.status))}</td></tr>`).join('')}
            </tbody></table>` : '<p class="ct-empty">Fill in the grid to see your plan here.</p>'}`;
    }

    function toCsv(s) {
        const names = courseNames(s);
        const q = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
        const lines = [['Week', 'Dates', 'Course', 'Meets', 'Readings', 'Assignment', 'Due', 'Status'].join(',')];
        for (let w = 1; w <= weeksOf(s); w++) {
            names.forEach((n, c) => {
                const v = cell(s, w, c);
                lines.push([w, weekDates(s, w), n, (s.courses[c] || {}).when, v.reading, v.assignment, v.due, (STATUS.find((o) => o.value === v.status) || { label: '' }).label.replace('Status', '')].map(q).join(','));
            });
        }
        return lines.join('\n');
    }

    const app = CT.init({ key: 'assignments', fileName: 'assignments_organizer', defaults, render, toText: toCsv,
        resetMessage: 'Clear the whole organizer? Save a .json first if you want to keep it.' });

    function onCellEdit(e) {
        const td = e.target.closest('[data-cell]');
        if (!td || !e.target.dataset.k) return;
        const cells = app.state.cells;
        const cur = cells[td.dataset.cell] || {};
        cur[e.target.dataset.k] = e.target.value;
        cells[td.dataset.cell] = cur;
        if (e.target.dataset.k === 'status') td.className = `ao-cell ao-${e.target.value || 'none'}`;
        app.render();
    }
    grid.addEventListener('input', onCellEdit);
    grid.addEventListener('change', onCellEdit);
    document.getElementById('aoExportCsv').addEventListener('click', () => {
        CT.download(toCsv(app.state), `assignments_${CT.localDate()}.csv`, 'text/csv;charset=utf-8');
    });
})();
