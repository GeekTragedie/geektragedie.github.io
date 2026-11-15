$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_caseload_glance_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_caseload_glance_cache_enabled';

    // Accessible, high-contrast color palette for Pie Chart slices
    const PIE_COLORS = [
        '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
        '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#f97316',
        '#06b6d4', '#a855f7'
    ];

    const STANDARD_FIELDS = [
        { key: 'diagnosis', label: 'Diagnoses', defaultEnabled: true },
        { key: 'dxCategory', label: 'Diagnosis Family', defaultEnabled: true },
        { key: 'phase', label: 'Phase of Therapy', defaultEnabled: true },
        { key: 'timeInTherapy', label: 'Time in Therapy', defaultEnabled: true },
        { key: 'ageGroup', label: 'Age / Age Group', defaultEnabled: true },
        { key: 'gender', label: 'Gender Identity', defaultEnabled: true },
        { key: 'frequency', label: 'Session Frequency', defaultEnabled: true },
        { key: 'acuity', label: 'Clinical Acuity Level', defaultEnabled: true },
        { key: 'payType', label: 'Payment / Insurance Type', defaultEnabled: false },
        { key: 'notes', label: 'Brief Notes', defaultEnabled: false }
    ];

    let allDiagnosesData = { ICD: [], DSM: [], byCode: {}, families: [] };

    // Sessions per week for each frequency (PRN isn't predictable, so it counts as 0)
    const FREQUENCY_PER_WEEK = {
        'Weekly': 1,
        '2x Per Week': 2,
        'Biweekly (Every 2 Weeks)': 0.5,
        'Monthly / Check-In': 0.25,
        'As Needed / PRN': 0
    };
    // Older saves used these family labels; map them to DSM-5-TR chapters
    const OLD_FAMILY_MAP = {
        'Trauma & Stressor-Related (PTSD / Adjustment)': 'Trauma- & Stressor-Related Disorders',
        'Anxiety & OCD Spectrum': 'Anxiety Disorders',
        'Depressive & Mood Disorders': 'Depressive Disorders',
        'Neurodevelopmental (ADHD / Autism)': 'Neurodevelopmental Disorders',
        'Personality & Complex Relational': 'Personality Disorders',
        'Disordered Eating / Feeding (ARFID / BED)': 'Feeding & Eating Disorders',
        'Substance Use & Addictive Behaviors': 'Substance-Related & Addictive Disorders',
        'Other / V-Code / Z-Code': 'Other Conditions That May Be a Focus of Clinical Attention'
    };
    const MULTI_DIMENSIONS = ['diagnosis', 'dxCategory'];
    const columnFilters = {};

    function codeOf(label) {
        const m = String(label || '').match(/^\s*([A-TV-Z]\d{2}(?:\.[0-9A-Z]{1,4})?)\b/i);
        return m ? m[1].toUpperCase() : '';
    }
    function familiesFromDiagnoses(dxs) {
        const out = [];
        (dxs || []).forEach(d => {
            const entry = allDiagnosesData.byCode[codeOf(d)];
            if (entry && entry.family && !out.includes(entry.family)) out.push(entry.family);
        });
        return out;
    }
    function stripNumber(v) {
        return String(v || '').replace(/^\d+\.\s*/, '');
    }
    function normalizeClient(c) {
        const out = { ...c, customValues: c.customValues || {} };
        out.diagnoses = Array.isArray(out.diagnoses) ? out.diagnoses : [];
        if (!Array.isArray(out.dxFamilies)) {
            const fromCodes = familiesFromDiagnoses(out.diagnoses);
            const old = out.dxCategory ? (OLD_FAMILY_MAP[out.dxCategory] || out.dxCategory) : '';
            out.dxFamilies = fromCodes.length ? fromCodes : (old ? [old] : []);
        }
        out.dxCategory = out.dxFamilies[0] || '';
        out.phase = stripNumber(out.phase);
        return out;
    }
    function normalizeState() {
        appState.clients = (appState.clients || []).map(normalizeClient);
        if (!Array.isArray(appState.hiddenColumns)) appState.hiddenColumns = [];
        if (!['primary', 'all'].includes(appState.dxCountMode)) appState.dxCountMode = 'primary';
        appState.sessionMinutes = Number(appState.sessionMinutes) || 60;
    }
    function primaryOnly() {
        return appState.dxCountMode !== 'all';
    }
    // Largest-remainder rounding: one decimal place, always adds up to exactly 100.0
    function roundPercents(counts, total) {
        if (!total) return counts.map(() => 0);
        const raw = counts.map(c => (c / total) * 1000);
        const floors = raw.map(Math.floor);
        let left = 1000 - floors.reduce((a, b) => a + b, 0);
        raw.map((r, i) => ({ i, rem: r - floors[i] }))
            .sort((a, b) => b.rem - a.rem || a.i - b.i)
            .forEach(({ i }) => { if (left > 0) { floors[i] += 1; left -= 1; } });
        return floors.map(f => f / 10);
    }
    function fmtNumber(n) {
        return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
    }
    let currentDxSystem = 'ICD';

    let appState = {
        enabledFields: STANDARD_FIELDS.filter(f => f.defaultEnabled).map(f => f.key),
        customFields: [], // e.g., [{ id: 'cf_1', name: 'Neurodivergent Status' }]
        selectedChartDimension: 'dxCategory',
        dxCountMode: 'primary',
        sessionMinutes: 60,
        hiddenColumns: [],
        clients: []
    };

    // Initialize Select2 for Diagnoses (with custom tag entry enabled)
    $('#clDiagnosesSelect').select2({
        placeholder: 'Select or type diagnosis(es)...',
        allowClear: true,
        multiple: true,
        tags: true,
        width: '100%'
    });

    $('#clDxFamilies').select2({
        placeholder: 'Fills in from diagnoses',
        allowClear: true,
        multiple: true,
        tags: true,
        width: '100%'
    });
    let familyTouched = false;
    function populateFamilyOptions(selected = []) {
        const el = $('#clDxFamilies');
        el.empty();
        const all = [...(allDiagnosesData.families || [])];
        selected.forEach(f => { if (!all.includes(f)) all.push(f); });
        all.forEach(f => el.append(new Option(f, f)));
        el.val(selected).trigger('change.select2');
    }

    // Shared diagnosis list (therapist-tools/shared/diagnoses.json)
    TTShared.loadDiagnoses()
        .then(function(sharedDx) { allDiagnosesData = sharedDx; })
        .catch(function() { TTShared.showLoadError('#clDiagnosesSelect', 'diagnosis list'); })
        .finally(function() {
            populateDiagnosisDropdown(currentDxSystem);
            populateFamilyOptions();
            checkLocalCacheOnLoad();
        });

    function populateDiagnosisDropdown(system, selectedVals = []) {
        const el = $('#clDiagnosesSelect');
        el.empty();
        const list = allDiagnosesData[system] || [];
        list.forEach(d => {
            const label = d.name.includes(d.code) ? d.name : `${d.code} - ${d.name}`;
            el.append(new Option(label, label));
        });
        if (selectedVals.length > 0) {
            selectedVals.forEach(v => {
                if (el.find(`option[value="${escapeAttr(v)}"]`).length === 0) {
                    el.append(new Option(v, v, true, true));
                }
            });
            el.val(selectedVals);
        }
        el.trigger('change');
    }

    $('input[name="dxSystem"]').on('change', function() {
        currentDxSystem = $(this).val();
        const currentSelected = $('#clDiagnosesSelect').val() || [];
        populateDiagnosisDropdown(currentDxSystem, currentSelected);
    });

    // Diagnosis family follows the diagnoses (DSM-5-TR chapter from the shared list) until you change it yourself
    $('#clDiagnosesSelect').on('change', function() {
        if (familyTouched) return;
        const fams = familiesFromDiagnoses($(this).val() || []);
        populateFamilyOptions(fams);
        $('#familyAutoHint').text(fams.length ? 'Filled in from the diagnoses. Change it if you like.' : '');
    });
    $('#clDxFamilies').on('select2:select select2:unselect select2:clear', function() {
        familyTouched = true;
        $('#familyAutoHint').text('You changed this, so it won’t update from the diagnoses until you clear the form.');
    });

    // --- 1. Field Toggles & Custom Fields Management ---
    function renderFieldConfiguration() {
        const container = $('#fieldTogglesContainer');
        container.empty();

        STANDARD_FIELDS.forEach(f => {
            const isChecked = appState.enabledFields.includes(f.key);
            container.append(`
                <label class="inline-flex items-center cursor-pointer font-semibold">
                    <input type="checkbox" class="std-field-toggle-cb mr-1.5" value="${f.key}" ${isChecked ? 'checked' : ''}>
                    <span>${escapeHtml(f.label)}</span>
                </label>
            `);

            // Show or hide the corresponding form input wrapper
            if (isChecked) {
                $(`.field-wrap-${f.key}`).removeClass('hidden');
            } else {
                $(`.field-wrap-${f.key}`).addClass('hidden');
            }
        });

        // Render Custom Fields Manager & Form Inputs
        const cfManager = $('#customFieldsManagerContainer');
        const cfInputs = $('#customClientInputsGrid');
        cfManager.empty();
        cfInputs.empty();

        if (!appState.customFields || appState.customFields.length === 0) {
            cfManager.addClass('hidden');
            cfInputs.addClass('hidden');
        } else {
            cfManager.removeClass('hidden');
            cfInputs.removeClass('hidden');

            appState.customFields.forEach(cf => {
                cfManager.append(`
                    <div class="flex items-center gap-2 text-xs" data-cf-id="${cf.id}">
                        <span class="font-bold">Custom Field:</span>
                        <input type="text" class="cf-name-input p-1 border rounded-md flex-1" value="${escapeAttr(cf.name)}">
                        <button type="button" class="remove-cf-btn btn-link text-xs">Remove Field</button>
                    </div>
                `);

                cfInputs.append(`
                    <div>
                        <label class="block text-xs font-semibold mb-1">${escapeHtml(cf.name)}:</label>
                        <input type="text" class="custom-client-field-input w-full p-2 border rounded-md text-sm" data-cf-id="${cf.id}" placeholder="Enter ${escapeAttr(cf.name)}...">
                    </div>
                `);
            });
        }

        // Populate Chart Dimension Selector with only enabled & custom fields
        const dimSelect = $('#chartDimensionSelect');
        dimSelect.empty();
        STANDARD_FIELDS.forEach(f => {
            if (appState.enabledFields.includes(f.key) && f.key !== 'notes') {
                dimSelect.append(new Option(f.label, f.key));
            }
        });
        (appState.customFields || []).forEach(cf => {
            dimSelect.append(new Option(`Custom: ${cf.name}`, cf.id));
        });

        if (dimSelect.find(`option[value="${appState.selectedChartDimension}"]`).length > 0) {
            dimSelect.val(appState.selectedChartDimension);
        } else {
            appState.selectedChartDimension = dimSelect.val() || 'dxCategory';
        }
    }

    $(document).on('change', '.std-field-toggle-cb', function() {
        appState.enabledFields = $('.std-field-toggle-cb:checked').map(function() { return $(this).val(); }).get();
        renderAll();
    });

    $('#addCustomFieldBtn').on('click', function() {
        const name = prompt('Enter a name for your custom tracking field (e.g., Neurodivergent Identity, Modality, Referral Source):');
        if (!name || !name.trim()) return;
        appState.customFields.push({
            id: 'cf_' + Date.now(),
            name: name.trim()
        });
        renderAll();
    });

    $(document).on('input change', '.cf-name-input', function() {
        const id = $(this).closest('[data-cf-id]').data('cf-id');
        const cf = appState.customFields.find(c => c.id === id);
        if (cf) cf.name = $(this).val().trim();
        renderFieldConfiguration();
        renderPieChartAndLegend();
        renderCaseloadTable();
        saveToLocalCacheIfEnabled();
    });

    $(document).on('click', '.remove-cf-btn', function() {
        const id = $(this).closest('[data-cf-id]').data('cf-id');
        appState.customFields = appState.customFields.filter(c => c.id !== id);
        renderAll();
    });

    $('#chartDimensionSelect').on('change', function() {
        appState.selectedChartDimension = $(this).val();
        renderPieChartAndLegend();
        saveToLocalCacheIfEnabled();
    });

    // --- 2. SVG Pie Chart & Intake Fit Advisor ---
    function valuesFor(client, dimensionKey, primary) {
        let vals;
        if (dimensionKey === 'diagnosis') vals = client.diagnoses || [];
        else if (dimensionKey === 'dxCategory') vals = client.dxFamilies || [];
        else if (dimensionKey.startsWith('cf_')) vals = [(client.customValues && client.customValues[dimensionKey]) || ''];
        else vals = [client[dimensionKey] || ''];
        vals = vals.filter(v => String(v).trim());
        if (!vals.length) return ['Unspecified'];
        return primary ? [vals[0]] : vals;
    }

    // For diagnoses and families, "primary only" counts each client once (% of clients);
    // "all" counts every diagnosis or family (% of diagnoses). Every other field is one per client.
    function computeDimensionCounts(dimensionKey, primaryOverride) {
        const multi = MULTI_DIMENSIONS.includes(dimensionKey);
        const primary = multi ? (primaryOverride === undefined ? primaryOnly() : primaryOverride) : true;
        const counts = {};
        let total = 0;
        appState.clients.forEach(client => {
            valuesFor(client, dimensionKey, primary).forEach(v => {
                counts[v] = (counts[v] || 0) + 1;
                total++;
            });
        });
        const sorted = Object.entries(counts)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
        const pcts = roundPercents(sorted.map(i => i.count), total);
        sorted.forEach((item, i) => { item.pct = pcts[i]; });
        const unit = multi && !primary ? (dimensionKey === 'diagnosis' ? 'diagnoses' : 'family mentions') : 'clients';
        return { items: sorted, total, unit, multi };
    }

    function weeklyLoad() {
        let sessions = 0, prn = 0, unknown = 0;
        appState.clients.forEach(c => {
            const f = FREQUENCY_PER_WEEK[c.frequency];
            if (f === undefined) unknown++;
            else { sessions += f; if (f === 0) prn++; }
        });
        const hours = sessions * (appState.sessionMinutes || 60) / 60;
        return { headcount: appState.clients.length, sessions, hours, prn, unknown };
    }
    function renderStats() {
        const w = weeklyLoad();
        $('#statHeadcount').text(w.headcount);
        $('#statSessions').text(fmtNumber(Math.round(w.sessions * 100) / 100));
        $('#statHours').text(fmtNumber(Math.round(w.hours * 100) / 100));
        $('#sessionMinutesInput').val(appState.sessionMinutes);
        const notes = ['Weekly = 1, twice a week = 2, biweekly = 0.5, monthly = 0.25 sessions per week.'];
        if (w.prn) notes.push(`${w.prn} as-needed (PRN) client${w.prn === 1 ? ' is' : 's are'} counted as 0.`);
        if (w.unknown) notes.push(`${w.unknown} client${w.unknown === 1 ? ' has' : 's have'} no frequency and ${w.unknown === 1 ? 'isn’t' : 'aren’t'} counted.`);
        $('#statHoursNote').text(notes.join(' '));
        return w;
    }

    function buildSvgPieChart(items, total) {
        if (total === 0 || items.length === 0) {
            return `
                <div class="empty-pie-placeholder flex items-center justify-center text-center muted text-xs p-6">
                    Add clients below, or use Load sample in How to use this tool.
                </div>
            `;
        }

        // One slice is a full circle, drawn the same way as the other pies (no donut hole)
        if (items.length === 1) {
            return `
                <svg viewBox="-1.05 -1.05 2.1 2.1" width="250" height="250" role="img" aria-label="Caseload pie chart">
                    <circle cx="0" cy="0" r="1" fill="${PIE_COLORS[0]}"><title>${escapeHtml(items[0].label)}: ${items[0].count} (100%)</title></circle>
                </svg>
            `;
        }

        let cumulativePct = 0;
        const paths = items.map((slice, idx) => {
            const startAngle = cumulativePct * 2 * Math.PI;
            cumulativePct += (slice.count / total);
            const endAngle = cumulativePct * 2 * Math.PI;

            const x1 = Math.sin(startAngle);
            const y1 = -Math.cos(startAngle);
            const x2 = Math.sin(endAngle);
            const y2 = -Math.cos(endAngle);

            const largeArcFlag = (slice.count / total) > 0.5 ? 1 : 0;
            const color = PIE_COLORS[idx % PIE_COLORS.length];

            const d = `M 0 0 L ${x1.toFixed(4)} ${y1.toFixed(4)} A 1 1 0 ${largeArcFlag} 1 ${x2.toFixed(4)} ${y2.toFixed(4)} Z`;
            return `<path d="${d}" fill="${color}" style="stroke: var(--bg-main, #ffffff)" stroke-width="0.02"><title>${escapeHtml(slice.label)}: ${slice.count} (${slice.pct.toFixed(1)}%)</title></path>`;
        }).join('');

        return `
            <svg viewBox="-1.05 -1.05 2.1 2.1" width="250" height="250" role="img" aria-label="Caseload pie chart">
                ${paths}
            </svg>
        `;
    }

    function renderPieChartAndLegend() {
        const dimKey = appState.selectedChartDimension || 'dxCategory';
        const { items, total, unit, multi } = computeDimensionCounts(dimKey);
        renderStats();

        $('#dxCountModeWrap').toggleClass('hidden', !multi);
        $(`input[name="dxCountMode"][value="${primaryOnly() ? 'primary' : 'all'}"]`).prop('checked', true);
        $('#svgPieChartContainer').html(buildSvgPieChart(items, total));
        const dimLabel = $('#chartDimensionSelect option:selected').text() || 'this field';
        const countLabel = unit === 'clients' ? 'Clients' : (unit === 'diagnoses' ? 'Diagnoses' : 'Mentions');
        $('#legendCountHeading').text(countLabel);
        $('#legendPctHeading').text(`% of ${unit}`);
        const n = appState.clients.length;
        $('#chartTotalCaption').text(unit === 'clients'
            ? `${dimLabel}: ${n} client${n === 1 ? '' : 's'}${multi ? ', primary only' : ''}`
            : `${dimLabel}: ${total} ${unit} across ${n} client${n === 1 ? '' : 's'}`);

        const legendBody = $('#chartLegendTableBody');
        legendBody.empty();

        if (items.length === 0) {
            legendBody.append(`<tr><td colspan="3" class="p-3 text-center muted">No caseload data logged yet.</td></tr>`);
        } else {
            items.forEach((slice, idx) => {
                const color = PIE_COLORS[idx % PIE_COLORS.length];
                legendBody.append(`
                    <tr class="border-b">
                        <td class="p-2 flex items-center gap-2">
                            <span class="color-swatch" style="background-color: ${color};"></span>
                            <span class="font-semibold">${escapeHtml(slice.label)}</span>
                        </td>
                        <td class="p-2 font-bold">${slice.count}</td>
                        <td class="p-2">${slice.pct.toFixed(1)}%</td>
                    </tr>
                `);
            });
        }

        renderIntakeAdvisor(items, total);
    }

    $(document).on('change', 'input[name="dxCountMode"]', function() {
        appState.dxCountMode = this.value;
        renderPieChartAndLegend();
        saveToLocalCacheIfEnabled();
    });
    $('#sessionMinutesInput').on('input change', function() {
        const v = Number(this.value);
        if (v > 0) {
            appState.sessionMinutes = v;
            renderStats();
            saveToLocalCacheIfEnabled();
        }
    });

    function renderIntakeAdvisor(items, total) {
        const box = $('#intakeAdvisorBox');
        if (appState.clients.length === 0) {
            box.html(`<strong>Intake Fit &amp; Caseload Balance Advisor:</strong><p class="muted">Log your current caseload below to see automatic insights on diagnosis concentration, phase-of-therapy bottlenecks, and what types of new intakes will best balance your energy.</p>`);
            return;
        }

        const topSlice = items[0];
        const phaseStats = computeDimensionCounts('phase');
        const acuityStats = computeDimensionCounts('acuity');

        // Add up every matching slice (the old .find() only counted the first one)
        const sumWhere = (stats, test) => stats.items.filter(i => test(i.label)).reduce((n, i) => n + i.count, 0);
        const activeProcessingCount = sumWhere(phaseStats, l => l.includes('Active Core') || l.includes('Intake'));
        const highAcuityCount = sumWhere(acuityStats, l => l.includes('High'));

        const insights = [];
        if (topSlice && topSlice.pct >= 50) {
            insights.push(`<strong>Primary Concentration (${topSlice.pct.toFixed(0)}%):</strong> At least half of this view is <em>${escapeHtml(topSlice.label)}</em>. When screening new inquiries, ask yourself whether you want more of this presentation or if a different diagnostic/clinical presentation would feel refreshing.`);
        } else if (topSlice) {
            insights.push(`<strong>Balanced Distribution:</strong> Your largest slice is <em>${escapeHtml(topSlice.label)}</em> at ${topSlice.pct.toFixed(0)}%, showing a healthy variety across your caseload.`);
        }

        if (highAcuityCount >= 4) {
            insights.push(`<strong>⚠️ Acuity Alert (${highAcuityCount} High-Acuity Clients):</strong> You currently have ${highAcuityCount} high-acuity/crisis-risk clients. Consider prioritizing lower-acuity or maintenance-level clients for your next open intake slot.`);
        } else {
            insights.push(`<strong>🟢 Acuity Headroom:</strong> You have ${highAcuityCount} high-acuity clients logged, leaving sustainable emotional bandwidth if a complex intake inquiry arrives.`);
        }

        const graduationCount = sumWhere(phaseStats, l => l.includes('Termination') || l.includes('Maintenance'));
        insights.push(`<strong>Pipeline Flow:</strong> ${graduationCount} client(s) are currently in Maintenance or Graduation Prep (likely to open up biweekly/full slots soon), while ${activeProcessingCount} are in Intensive Intake/Core Processing.`);

        box.html(`
            <div class="font-bold text-sm mb-1">Intake Fit &amp; Caseload Balance Insights</div>
            <ul class="list-disc ml-4 space-y-1">${insights.map(i => `<li>${i}</li>`).join('')}</ul>
        `);
    }

    // --- 3. Render Caseload Table ---
    function tableColumns() {
        const cols = [{ key: 'code', label: 'Client Code', get: c => [c.code] }];
        STANDARD_FIELDS.forEach(f => {
            if (!appState.enabledFields.includes(f.key)) return;
            if (f.key === 'diagnosis') cols.push({ key: f.key, label: f.label, get: c => c.diagnoses || [], tags: true });
            else if (f.key === 'dxCategory') cols.push({ key: f.key, label: f.label, get: c => c.dxFamilies || [], tags: true });
            else cols.push({ key: f.key, label: f.label, get: c => [c[f.key] || ''] });
        });
        (appState.customFields || []).forEach(cf => cols.push({ key: cf.id, label: cf.name, get: c => [(c.customValues && c.customValues[cf.id]) || ''] }));
        return cols;
    }

    function renderColumnPicker(cols) {
        const body = $('#columnPickerBody');
        body.html(cols.map(col => `<label><input type="checkbox" class="column-toggle-cb" value="${escapeAttr(col.key)}" ${appState.hiddenColumns.includes(col.key) ? '' : 'checked'}> ${escapeHtml(col.label)}</label>`).join(''));
    }

    function renderCaseloadTable() {
        $('#totalClientsCount').text(appState.clients.length);
        const thead = $('#caseloadTableHead');
        const tbody = $('#caseloadTableBody');
        thead.empty();
        tbody.empty();

        const allCols = tableColumns();
        renderColumnPicker(allCols);
        const cols = allCols.filter(col => !appState.hiddenColumns.includes(col.key));
        Object.keys(columnFilters).forEach(k => { if (!cols.some(c => c.key === k)) delete columnFilters[k]; });

        let headerHtml = '<tr class="border-b">' + cols.map(col => `<th class="p-2">${escapeHtml(col.label)}</th>`).join('') + '<th class="p-2 text-right">Actions</th></tr>';
        headerHtml += '<tr class="filter-row">' + cols.map(col => {
            const vals = [...new Set(appState.clients.flatMap(c => col.get(c)).filter(v => String(v).trim()))].sort((a, b) => String(a).localeCompare(String(b)));
            if (col.key === 'code') return '<th class="p-1"></th>';
            const cur = columnFilters[col.key] || '';
            const opts = vals.map(v => `<option value="${escapeAttr(v)}" ${v === cur ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
            return `<th class="p-1"><select class="column-filter p-1 border rounded-md text-xs w-full" data-col="${escapeAttr(col.key)}" aria-label="Filter ${escapeAttr(col.label)}"><option value="">All</option>${opts}</select></th>`;
        }).join('') + '<th class="p-1"></th></tr>';
        thead.html(headerHtml);

        const kw = ($('#tableSearchInput').val() || '').toLowerCase().trim();
        const filtered = appState.clients.filter(c => {
            if (kw && !JSON.stringify(c).toLowerCase().includes(kw)) return false;
            return cols.every(col => !columnFilters[col.key] || col.get(c).includes(columnFilters[col.key]));
        });
        $('#shownClientsNote').text(filtered.length !== appState.clients.length ? `, ${filtered.length} shown` : '');

        const totalCols = cols.length + 1;
        if (filtered.length === 0) {
            tbody.append(`<tr><td colspan="${totalCols}" class="p-4 text-center muted">${appState.clients.length ? 'No clients match these filters.' : 'No clients yet. Add a client above, or use Load sample in How to use this tool.'}</td></tr>`);
            return;
        }

        filtered.forEach(c => {
            let rowHtml = '<tr class="border-b">';
            cols.forEach(col => {
                const vals = col.get(c).filter(v => String(v).trim());
                if (col.key === 'code') rowHtml += `<td class="p-2 font-bold whitespace-nowrap">${escapeHtml(c.code)}</td>`;
                else if (col.tags) rowHtml += `<td class="p-2">${vals.map(v => `<span class="dx-tag">${escapeHtml(v)}</span>`).join(' ') || '—'}</td>`;
                else rowHtml += `<td class="p-2">${escapeHtml(vals[0] || '—')}</td>`;
            });
            rowHtml += `
                <td class="p-2 text-right whitespace-nowrap">
                    <button type="button" class="btn-link text-xs edit-client-btn mr-2" data-id="${escapeAttr(c.id)}">Edit</button>
                    <button type="button" class="btn-link text-xs delete-client-btn" data-id="${escapeAttr(c.id)}">Remove</button>
                </td>
            </tr>`;
            tbody.append(rowHtml);
        });
    }

    $(document).on('change', '.column-toggle-cb', function() {
        const key = this.value;
        appState.hiddenColumns = appState.hiddenColumns.filter(k => k !== key);
        if (!this.checked) appState.hiddenColumns.push(key);
        renderCaseloadTable();
        saveToLocalCacheIfEnabled();
    });
    $(document).on('change', '.column-filter', function() {
        const key = $(this).data('col');
        if (this.value) columnFilters[key] = this.value; else delete columnFilters[key];
        renderCaseloadTable();
    });
    $('#clearColumnFiltersBtn').on('click', function() {
        Object.keys(columnFilters).forEach(k => delete columnFilters[k]);
        $('#tableSearchInput').val('');
        renderCaseloadTable();
    });

    function renderAll() {
        renderFieldConfiguration();
        renderPieChartAndLegend();
        renderCaseloadTable();
        saveToLocalCacheIfEnabled();
    }

    // --- 4. Add / Edit / Remove Client Handlers ---
    $('#caseloadClientForm').on('submit', function(e) {
        e.preventDefault();
        const editingId = $('#editingClientId').val();

        const customValues = {};
        $('.custom-client-field-input').each(function() {
            const cfId = $(this).data('cf-id');
            customValues[cfId] = $(this).val().trim();
        });

        const clientObj = {
            id: editingId || 'cl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            code: $('#clCode').val().trim(),
            diagnoses: $('#clDiagnosesSelect').val() || [],
            dxFamilies: $('#clDxFamilies').val() || [],
            phase: $('#clPhase').val(),
            timeInTherapy: $('#clTimeInTherapy').val(),
            ageGroup: $('#clAgeGroup').val().trim() || 'Adult (25–34)',
            gender: $('#clGender').val().trim() || 'Unspecified',
            frequency: $('#clFrequency').val(),
            acuity: $('#clAcuity').val(),
            payType: $('#clPayType').val().trim(),
            notes: $('#clNotes').val().trim(),
            customValues: customValues
        };
        clientObj.dxCategory = clientObj.dxFamilies[0] || '';

        if (editingId) {
            const idx = appState.clients.findIndex(c => c.id === editingId);
            if (idx > -1) appState.clients[idx] = clientObj;
        } else {
            appState.clients.push(clientObj);
        }

        resetClientForm();
        renderAll();
    });

    function resetClientForm() {
        document.getElementById('caseloadClientForm').reset();
        $('#editingClientId').val('');
        familyTouched = false;
        $('#clDiagnosesSelect').val(null).trigger('change');
        populateFamilyOptions();
        $('#familyAutoHint').text('');
        $('.custom-client-field-input').val('');
        $('#saveClientBtn').text('Add Client to Caseload');
        $('#cancelClientEditBtn').addClass('hidden');
        // Suggest next sequential Client # code
        $('#clCode').attr('placeholder', `e.g., Client #${appState.clients.length + 1}`);
    }

    $('#cancelClientEditBtn').on('click', resetClientForm);

    $(document).on('click', '.edit-client-btn', function() {
        const id = $(this).data('id');
        const c = appState.clients.find(item => item.id === id);
        if (!c) return;

        $('#editingClientId').val(c.id);
        $('#clCode').val(c.code);
        familyTouched = true;
        populateDiagnosisDropdown(currentDxSystem, c.diagnoses || []);
        populateFamilyOptions(c.dxFamilies || []);
        $('#familyAutoHint').text('');
        $('#clPhase').val(c.phase);
        $('#clTimeInTherapy').val(c.timeInTherapy);
        $('#clAgeGroup').val(c.ageGroup);
        $('#clGender').val(c.gender);
        $('#clFrequency').val(c.frequency);
        $('#clAcuity').val(c.acuity);
        $('#clPayType').val(c.payType);
        $('#clNotes').val(c.notes);

        $('.custom-client-field-input').each(function() {
            const cfId = $(this).data('cf-id');
            $(this).val((c.customValues && c.customValues[cfId]) || '');
        });

        $('#saveClientBtn').text('Update Client');
        $('#cancelClientEditBtn').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#caseloadClientForm').offset().top - 30 }, 400);
    });

    $(document).on('click', '.delete-client-btn', function() {
        const id = $(this).data('id');
        if (!confirm('Remove this client row from your caseload?')) return;
        appState.clients = appState.clients.filter(c => c.id !== id);
        renderAll();
    });

    $('#tableSearchInput').on('input', renderCaseloadTable);

    // --- 5. Local Cache & JSON / CSV / Print Exports ---
    function checkLocalCacheOnLoad() {
        const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
        $('#localCacheToggle').prop('checked', isEnabled);
        if (isEnabled) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    Object.assign(appState, parsed);
                    normalizeState();
                } catch (e) {
                    console.error('Error loading cached caseload visualizer:', e);
                }
            }
        }
        renderAll();
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

    $('#clearAllButton').on('click', function() {
        if (!confirm('Wipe all caseload data? Make sure you have exported your .json backup first.')) return;
        appState.clients = [];
        localStorage.removeItem(STORAGE_KEY);
        resetClientForm();
        renderAll();
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
        downloadFile(JSON.stringify(appState, null, 2), `caseload_demographics_${localDateISO()}.json`, 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', () => $('#importJsonFile').click());

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (!parsed || !Array.isArray(parsed.clients)) throw new Error('No clients list');
                Object.assign(appState, parsed);
                normalizeState();
                resetClientForm();
                renderAll();
            } catch (err) {
                alert('Invalid JSON file. Please upload a valid Caseload at a Glance .json backup.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#exportCsvButton').on('click', function() {
        if (appState.clients.length === 0) {
            alert('Add at least one client before exporting.');
            return;
        }
        const activeStdFields = STANDARD_FIELDS.filter(f => appState.enabledFields.includes(f.key));
        const headers = [
            'Client Code',
            ...activeStdFields.map(f => f.label),
            ...(appState.customFields || []).map(cf => cf.name)
        ];

        const rows = appState.clients.map(c => {
            const stdVals = activeStdFields.map(f => {
                if (f.key === 'diagnosis') return (c.diagnoses || []).join('; ');
                if (f.key === 'dxCategory') return (c.dxFamilies || []).join('; ');
                return c[f.key] || '';
            });
            const cfVals = (appState.customFields || []).map(cf => (c.customValues && c.customValues[cf.id]) || '');
            return [c.code, ...stdVals, ...cfVals];
        });

        const csvContent = [headers, ...rows]
            .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        downloadFile(csvContent, 'caseload_demographics_export.csv', 'text/csv;charset=utf-8');
    });

    $('#printCaseloadReportBtn').on('click', function() {
        const dimKey = appState.selectedChartDimension || 'dxCategory';
        const { items, total, unit } = computeDimensionCounts(dimKey);
        const svgMarkup = buildSvgPieChart(items, total);
        const dimLabel = $('#chartDimensionSelect option:selected').text();
        const w = weeklyLoad();

        const legendRows = items.map((slice, idx) => `
            <tr>
                <td><span style="display:inline-block;width:10px;height:10px;background:${PIE_COLORS[idx % PIE_COLORS.length]};margin-right:6px;"></span><strong>${escapeHtml(slice.label)}</strong></td>
                <td>${slice.count}</td>
                <td>${slice.pct.toFixed(1)}%</td>
            </tr>
        `).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Caseload at a Glance Report</title>
                <style>
                    @page { margin: 0.55in; }
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; font-size: 10pt; line-height: 1.4; margin: 0; }
                    h1, h2, h3 { margin: 0 0 6px 0; }
                    .header-bar { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; }
                    .chart-grid { display: grid; grid-template-columns: 260px 1fr; gap: 20px; align-items: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9pt; }
                    th, td { border: 1px solid #444; padding: 5px 7px; text-align: left; }
                    th { background: #eee; }
                    .insights-box { border: 1px solid #333; padding: 10px; border-radius: 4px; margin-bottom: 16px; background: #fafafa; }
                </style>
            </head>
            <body>
                <div class="header-bar">
                    <div>
                        <h1>Caseload at a Glance</h1>
                        <div>Sliced by <strong>${escapeHtml(dimLabel)}</strong> (${appState.clients.length} clients; ${fmtNumber(Math.round(w.sessions * 100) / 100)} sessions and about ${fmtNumber(Math.round(w.hours * 100) / 100)} hours per week at ${appState.sessionMinutes} minutes)</div>
                    </div>
                    <div><strong>Date:</strong> ${localDateISO()}</div>
                </div>

                <div class="chart-grid">
                    <div style="text-align:center;">${svgMarkup}</div>
                    <div>
                        <table>
                            <thead><tr><th>Slice</th><th>Count</th><th>% of ${escapeHtml(unit)}</th></tr></thead>
                            <tbody>${legendRows}</tbody>
                        </table>
                    </div>
                </div>

                <div class="insights-box">${$('#intakeAdvisorBox').html()}</div>
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

    function localDateISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

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