$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_practice_starting_aid_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_practice_starting_aid_cache_enabled';

    let appState = {
        phases: [],
        rates: {
            indiv60: 150,
            indiv75: 185,
            indiv90: 225,
            couples: 180,
            child: 165,
            sliding: '$85 – $110 (3 slots)'
        },
        subletScript: ''
    };

    // --- 1. Load Default Launch Roadmap JSON & Check Local Cache ---
    $.getJSON('launch-roadmap-data.json', function(data) {
        if (data && Array.isArray(data.phases)) {
            appState.phases = data.phases;
        }
        appState.subletScript = $('#subletEmailScript').val();
        checkLocalCacheOnLoad();
        populatePhaseDropdowns();
        renderAll();
    });

    function populatePhaseDropdowns() {
        const filterSelect = $('#filterPhaseSelect');
        const newTaskPhase = $('#newTaskPhase');
        filterSelect.empty();
        newTaskPhase.empty();

        filterSelect.append(new Option('All 8 Launch Phases', 'ALL'));
        (appState.phases || []).forEach(p => {
            filterSelect.append(new Option(p.title, p.id));
            newTaskPhase.append(new Option(p.title, p.id));
        });
    }

    // --- 2. Render Metrics, Progress Bar & Phase Cards ---
    function calculateStats() {
        let totalActive = 0;
        let doneCount = 0;
        let inWorkCount = 0;
        let totalCost = 0;

        (appState.phases || []).forEach(phase => {
            (phase.tasks || []).forEach(t => {
                if (t.status !== 'SKIPPED') {
                    totalActive++;
                    totalCost += parseFloat(t.cost) || 0;
                    if (t.status === 'DONE') doneCount++;
                    if (t.status === 'IN_WORK') inWorkCount++;
                }
            });
        });

        const pct = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 0;
        return { totalActive, doneCount, inWorkCount, totalCost, pct };
    }

    function renderAll() {
        const stats = calculateStats();
        $('#statTasksDone').text(`${stats.doneCount} / ${stats.totalActive} (${stats.pct}%)`);
        $('#statTasksInWork').text(`${stats.inWorkCount} Active`);
        $('#statStartupCost').text(`$${stats.totalCost.toFixed(2)}`);
        $('#overallProgressBar').css('width', `${stats.pct}%`);

        // Sync Rate Helper Inputs
        if (appState.rates) {
            $('#rateIndiv60').val(appState.rates.indiv60);
            $('#rateIndiv75').val(appState.rates.indiv75);
            $('#rateIndiv90').val(appState.rates.indiv90);
            $('#rateCouples').val(appState.rates.couples);
            $('#rateChild').val(appState.rates.child);
            $('#rateSliding').val(appState.rates.sliding);
        }
        if (appState.subletScript) {
            $('#subletEmailScript').val(appState.subletScript);
        }

        renderPhasesChecklist();
        saveToLocalCacheIfEnabled();
    }

    function renderPhasesChecklist() {
        const container = $('#phasesChecklistContainer');
        container.empty();

        const phaseFilter = $('#filterPhaseSelect').val() || 'ALL';
        const statusFilter = $('#filterStatusSelect').val() || 'ALL';
        const kw = ($('#searchTasksInput').val() || '').toLowerCase().trim();

        (appState.phases || []).forEach(phase => {
            if (phaseFilter !== 'ALL' && phase.id !== phaseFilter) return;

            const filteredTasks = (phase.tasks || []).filter(t => {
                if (statusFilter === 'ALL' && t.status === 'SKIPPED') return false;
                if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
                if (kw) {
                    const hay = `${t.title} ${t.guide} ${t.notes || ''}`.toLowerCase();
                    if (!hay.includes(kw)) return false;
                }
                return true;
            });

            if (filteredTasks.length === 0) return;

            // Calculate Phase Completion
            const nonSkipped = (phase.tasks || []).filter(t => t.status !== 'SKIPPED');
            const phaseDone = nonSkipped.filter(t => t.status === 'DONE').length;

            const tasksHtml = filteredTasks.map(task => {
                const statusBadgeClass = getStatusBadgeClass(task.status);
                const linkHtml = task.url
                    ? `<a href="${escapeAttr(task.url)}" target="_blank" rel="noopener" class="btn-link text-xs font-semibold">Open Official Portal / Tool &rarr;</a>`
                    : '';

                return `
                    <div class="task-card p-4 border rounded-md space-y-2 ${task.status === 'DONE' ? 'task-done-card' : ''}" data-phase-id="${phase.id}" data-task-id="${task.id}">
                        <div class="flex flex-wrap justify-between items-start gap-2">
                            <div class="flex items-start gap-2 flex-1">
                                <input type="checkbox" class="quick-done-cb mt-1 cursor-pointer" ${task.status === 'DONE' ? 'checked' : ''} title="Quick toggle Done">
                                <div>
                                    <h4 class="text-sm font-bold ${task.status === 'DONE' ? 'line-through muted' : ''}">${escapeHtml(task.title)}</h4>
                                    ${linkHtml}
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center gap-2 text-xs">
                                <select class="task-status-select p-1.5 border rounded-md font-semibold ${statusBadgeClass}">
                                    <option value="TODO" ${task.status === 'TODO' ? 'selected' : ''}>⬜ To Do</option>
                                    <option value="IN_WORK" ${task.status === 'IN_WORK' ? 'selected' : ''}>🟡 In Work</option>
                                    <option value="DONE" ${task.status === 'DONE' ? 'selected' : ''}>✅ Done</option>
                                    <option value="SKIPPED" ${task.status === 'SKIPPED' ? 'selected' : ''}>⏭️ Skip / N/A</option>
                                </select>
                                <div class="flex items-center gap-1">
                                    <span class="muted">Cost $:</span>
                                    <input type="number" step="1" min="0" class="task-cost-input w-20 p-1 border rounded-md" value="${task.cost || 0}">
                                </div>
                                <button type="button" class="delete-task-btn btn-link text-xs ml-1" title="Remove task">✕</button>
                            </div>
                        </div>

                        <div class="task-guide-box p-2.5 rounded-md text-xs whitespace-pre-wrap">${escapeHtml(task.guide)}</div>

                        <div>
                            <input type="text" class="task-notes-input w-full p-1.5 border rounded-md text-xs" placeholder="Your Tracking # / Date Completed / Next Steps (e.g., Registered 3/2, Tracking #0302..., Expected in mail by 3/17)..." value="${escapeAttr(task.notes || '')}">
                        </div>
                    </div>
                `;
            }).join('');

            container.append(`
                <div class="subpanel p-5 rounded-md border space-y-4">
                    <div class="flex flex-wrap justify-between items-center border-b pb-2">
                        <div>
                            <h3 class="text-lg font-bold">${escapeHtml(phase.title)}</h3>
                            <p class="muted text-xs">${escapeHtml(phase.subtitle || '')}</p>
                        </div>
                        <span class="text-xs font-bold px-3 py-1 border rounded-md">
                            ${phaseDone} / ${nonSkipped.length} Completed
                        </span>
                    </div>
                    <div class="space-y-3">${tasksHtml}</div>
                </div>
            `);
        });
    }

    function getStatusBadgeClass(status) {
        if (status === 'DONE') return 'status-done';
        if (status === 'IN_WORK') return 'status-inwork';
        if (status === 'SKIPPED') return 'status-skipped';
        return 'status-todo';
    }

    // --- 3. Interactive Event Handlers ---
    function findTask(phaseId, taskId) {
        const phase = (appState.phases || []).find(p => p.id === phaseId);
        if (!phase) return null;
        return (phase.tasks || []).find(t => t.id === taskId);
    }

    $(document).on('change', '.quick-done-cb', function() {
        const card = $(this).closest('.task-card');
        const task = findTask(card.data('phase-id'), card.data('task-id'));
        if (!task) return;
        task.status = $(this).is(':checked') ? 'DONE' : 'TODO';
        renderAll();
    });

    $(document).on('change', '.task-status-select', function() {
        const card = $(this).closest('.task-card');
        const task = findTask(card.data('phase-id'), card.data('task-id'));
        if (!task) return;
        task.status = $(this).val();
        renderAll();
    });

    $(document).on('input change', '.task-cost-input, .task-notes-input', function() {
        const card = $(this).closest('.task-card');
        const task = findTask(card.data('phase-id'), card.data('task-id'));
        if (!task) return;
        task.cost = parseFloat(card.find('.task-cost-input').val()) || 0;
        task.notes = card.find('.task-notes-input').val();

        const stats = calculateStats();
        $('#statStartupCost').text(`$${stats.totalCost.toFixed(2)}`);
        saveToLocalCacheIfEnabled();
    });

    $(document).on('click', '.delete-task-btn', function() {
        const card = $(this).closest('.task-card');
        const phaseId = card.data('phase-id');
        const taskId = card.data('task-id');
        if (!confirm('Remove this step from your checklist?')) return;

        const phase = appState.phases.find(p => p.id === phaseId);
        if (phase) {
            phase.tasks = phase.tasks.filter(t => t.id !== taskId);
        }
        renderAll();
    });

    $('#filterPhaseSelect, #filterStatusSelect, #searchTasksInput').on('input change', renderPhasesChecklist);

    // Add Custom Step Modal Toggle
    $('#openAddTaskModalBtn').on('click', function() {
        $('#addCustomTaskForm').toggleClass('hidden');
    });

    $('#cancelAddTaskBtn').on('click', function() {
        $('#addCustomTaskForm').addClass('hidden');
    });

    $('#addCustomTaskForm').on('submit', function(e) {
        e.preventDefault();
        const phaseId = $('#newTaskPhase').val();
        const phase = appState.phases.find(p => p.id === phaseId);
        if (!phase) return;

        phase.tasks.push({
            id: 'cust_' + Date.now(),
            title: $('#newTaskTitle').val().trim(),
            status: 'TODO',
            cost: parseFloat($('#newTaskCost').val()) || 0,
            url: '',
            guide: $('#newTaskGuide').val().trim() || 'Custom launch task.',
            notes: ''
        });

        document.getElementById('addCustomTaskForm').reset();
        $('#addCustomTaskForm').addClass('hidden');
        renderAll();
    });

    // --- 4. Rate Calculator & Sublet Outreach Email Helpers ---
    $('#autoCalcRatesBtn').on('click', function() {
        const base60 = parseFloat($('#rateIndiv60').val()) || 150;
        const r75 = Math.round((base60 * 1.25) / 5) * 5;
        const r90 = Math.round((base60 * 1.5) / 5) * 5;
        const rCouples = Math.round((base60 * 1.2) / 5) * 5;
        const rChild = Math.round((base60 * 1.1) / 5) * 5;
        const slideMin = Math.round((base60 * 0.6) / 5) * 5;
        const slideMax = Math.round((base60 * 0.75) / 5) * 5;

        $('#rateIndiv75').val(r75);
        $('#rateIndiv90').val(r90);
        $('#rateCouples').val(rCouples);
        $('#rateChild').val(rChild);
        $('#rateSliding').val(`$${slideMin} – $${slideMax} (3 slots)`);

        appState.rates = {
            indiv60: base60,
            indiv75: r75,
            indiv90: r90,
            couples: rCouples,
            child: rChild,
            sliding: `$${slideMin} – $${slideMax} (3 slots)`
        };
        saveToLocalCacheIfEnabled();
    });

    $('#rateIndiv60, #rateIndiv75, #rateIndiv90, #rateCouples, #rateChild, #rateSliding').on('input change', function() {
        appState.rates = {
            indiv60: $('#rateIndiv60').val(),
            indiv75: $('#rateIndiv75').val(),
            indiv90: $('#rateIndiv90').val(),
            couples: $('#rateCouples').val(),
            child: $('#rateChild').val(),
            sliding: $('#rateSliding').val()
        };
        saveToLocalCacheIfEnabled();
    });

    $('#subletEmailScript').on('input change', function() {
        appState.subletScript = $(this).val();
        saveToLocalCacheIfEnabled();
    });

    $('#copySubletScriptBtn').on('click', function() {
        const text = $('#subletEmailScript').val();
        navigator.clipboard.writeText(text).then(() => {
            alert('Office Sublet Outreach Email copied to clipboard!');
        });
    });

    // --- 5. Local Cache & JSON / CSV / Print Exports ---
    function checkLocalCacheOnLoad() {
        const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
        $('#localCacheToggle').prop('checked', isEnabled);
        if (isEnabled) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed && Array.isArray(parsed.phases)) {
                        appState = parsed;
                    }
                } catch (e) {
                    console.error('Error loading cached launch roadmap:', e);
                }
            }
        }
    }

    $('#localCacheToggle').on('change', function() {
        if ($(this).is(':checked')) {
            localStorage.setItem(CACHE_ENABLED_KEY, 'true');
            saveToLocalCacheIfEnabled();
        } else {
            localStorage.removeItem(CACHE_ENABLED_KEY);
            localStorage.removeItem(STORAGE_KEY);
        }
    });

    function saveToLocalCacheIfEnabled() {
        if ($('#localCacheToggle').is(':checked')) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        }
    }

    $('#resetDefaultRoadmapBtn').on('click', function() {
        if (!confirm('Reset all checklist tasks back to default? Make sure you have exported your .json backup first.')) return;
        localStorage.removeItem(STORAGE_KEY);
        $.getJSON('launch-roadmap-data.json', function(data) {
            appState.phases = data.phases || [];
            renderAll();
        });
    });

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    $('#exportJsonButtonTop, #exportJsonButtonBottom').on('click', function() {
        downloadFile(JSON.stringify(appState, null, 2), `private_practice_launch_plan_${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', () => $('#importJsonFile').click());

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (parsed && Array.isArray(parsed.phases)) {
                    appState = parsed;
                    populatePhaseDropdowns();
                    renderAll();
                }
            } catch (err) {
                alert('Invalid JSON file. Please upload a valid Practice Starting Aid .json file.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#exportCsvButton').on('click', function() {
        const headers = ['Phase', 'Task', 'Status', 'Estimated Cost ($)', 'Official Portal URL', 'Guide & Instructions', 'Clinician Notes / Tracking #'];
        const rows = [];
        (appState.phases || []).forEach(p => {
            (p.tasks || []).forEach(t => {
                rows.push([p.title, t.title, t.status, t.cost || 0, t.url || '', t.guide || '', t.notes || '']);
            });
        });

        const csvContent = [headers, ...rows]
            .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        downloadFile(csvContent, 'private_practice_launch_checklist.csv', 'text/csv;charset=utf-8');
    });

    $('#printLaunchPlanBtn, #printLaunchPlanBottomBtn').on('click', function() {
        const stats = calculateStats();
        let phasesHtml = '';

        (appState.phases || []).forEach(p => {
            const rows = (p.tasks || []).filter(t => t.status !== 'SKIPPED').map(t => `
                <tr>
                    <td><strong>${escapeHtml(t.status)}</strong></td>
                    <td><strong>${escapeHtml(t.title)}</strong><br><small>${escapeHtml(t.guide)}</small></td>
                    <td>$${(parseFloat(t.cost) || 0).toFixed(2)}</td>
                    <td>${escapeHtml(t.notes || '—')}</td>
                </tr>
            `).join('');

            phasesHtml += `
                <h3>${escapeHtml(p.title)}</h3>
                <table>
                    <thead><tr><th style="width:80px;">Status</th><th>Task &amp; Insider Instructions</th><th style="width:70px;">Est. Cost</th><th style="width:180px;">Tracking # / Notes</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        });

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Private Practice Launch Roadmap &amp; Checklist</title>
                <style>
                    @page { margin: 0.5in; }
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; font-size: 9.5pt; line-height: 1.35; margin: 0; }
                    h1 { font-size: 16pt; margin: 0 0 4px 0; }
                    h3 { font-size: 11pt; margin: 14px 0 4px 0; }
                    .top-summary { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8.5pt; }
                    th, td { border: 1px solid #444; padding: 4px 6px; text-align: left; vertical-align: top; }
                    th { background: #eee; }
                </style>
            </head>
            <body>
                <div class="top-summary">
                    <div>
                        <h1>Private Practice Starting Aid &amp; Launch Checklist</h1>
                        <div>Progress: <strong>${stats.doneCount} / ${stats.totalActive} (${stats.pct}%)</strong> &nbsp;|&nbsp; Est. Startup Cost: <strong>$${stats.totalCost.toFixed(2)}</strong></div>
                    </div>
                    <div><strong>Printed:</strong> ${new Date().toISOString().split('T')[0]}</div>
                </div>
                ${phasesHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 250);
    });

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttr(str) {
        return escapeHtml(str);
    }
});