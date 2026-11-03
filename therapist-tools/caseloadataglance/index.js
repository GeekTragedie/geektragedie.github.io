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
        { key: 'diagnosis', label: 'Specific Diagnosis Code(s)', defaultEnabled: true },
        { key: 'dxCategory', label: 'Diagnostic Family / Category', defaultEnabled: true },
        { key: 'phase', label: 'Phase of Therapy', defaultEnabled: true },
        { key: 'timeInTherapy', label: 'Time in Therapy', defaultEnabled: true },
        { key: 'ageGroup', label: 'Age / Age Group', defaultEnabled: true },
        { key: 'gender', label: 'Gender Identity', defaultEnabled: true },
        { key: 'frequency', label: 'Session Frequency', defaultEnabled: true },
        { key: 'acuity', label: 'Clinical Acuity Level', defaultEnabled: true },
        { key: 'payType', label: 'Payment / Insurance Type', defaultEnabled: false },
        { key: 'notes', label: 'Brief Notes', defaultEnabled: false }
    ];

    const FALLBACK_DIAGNOSES = {
        ICD: [
            { code: 'F43.10', name: 'F43.10 - Post-Traumatic Stress Disorder (PTSD)' },
            { code: 'F41.1', name: 'F41.1 - Generalized Anxiety Disorder' },
            { code: 'F33.1', name: 'F33.1 - Major Depressive Disorder, Recurrent, Moderate' },
            { code: 'F90.2', name: 'F90.2 - ADHD, Combined Presentation' },
            { code: 'F90.0', name: 'F90.0 - ADHD, Predominantly Inattentive' },
            { code: 'F84.0', name: 'F84.0 - Autism Spectrum Disorder' },
            { code: 'F43.23', name: 'F43.23 - Adjustment Disorder with Mixed Anxiety & Depressed Mood' },
            { code: 'F42.2', name: 'F42.2 - Obsessive-Compulsive Disorder (OCD)' },
            { code: 'F40.10', name: 'F40.10 - Social Anxiety Disorder' },
            { code: 'F60.3', name: 'F60.3 - Borderline Personality Disorder' },
            { code: 'F34.1', name: 'F34.1 - Persistent Depressive Disorder (Dysthymia)' },
            { code: 'F50.82', name: 'F50.82 - Avoidant/Restrictive Food Intake Disorder (ARFID)' }
        ],
        DSM: [
            { code: '309.81 (F43.10)', name: 'Posttraumatic Stress Disorder (F43.10)' },
            { code: '300.02 (F41.1)', name: 'Generalized Anxiety Disorder (F41.1)' },
            { code: '296.32 (F33.1)', name: 'Major Depressive Disorder, Recurrent (F33.1)' },
            { code: '314.01 (F90.2)', name: 'ADHD, Combined Presentation (F90.2)' },
            { code: '314.00 (F90.0)', name: 'ADHD, Predominantly Inattentive (F90.0)' },
            { code: '299.00 (F84.0)', name: 'Autism Spectrum Disorder (F84.0)' },
            { code: '309.28 (F43.23)', name: 'Adjustment Disorder with Mixed Anxiety & Depressed Mood' },
            { code: '300.3 (F42.2)', name: 'Obsessive-Compulsive Disorder (F42.2)' },
            { code: '300.23 (F40.10)', name: 'Social Anxiety Disorder (F40.10)' },
            { code: '301.83 (F60.3)', name: 'Borderline Personality Disorder (F60.3)' }
        ]
    };

    let allDiagnosesData = FALLBACK_DIAGNOSES;
    let currentDxSystem = 'ICD';

    let appState = {
        enabledFields: STANDARD_FIELDS.filter(f => f.defaultEnabled).map(f => f.key),
        customFields: [], // e.g., [{ id: 'cf_1', name: 'Neurodivergent Status' }]
        selectedChartDimension: 'dxCategory',
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

    // Try loading shared diagnoses from ../notegenerator/diagnoses.json
    $.getJSON('../notegenerator/diagnoses.json', function(sharedDx) {
        if (sharedDx && (sharedDx.ICD || sharedDx.DSM)) {
            allDiagnosesData = sharedDx;
        }
    }).always(function() {
        populateDiagnosisDropdown(currentDxSystem);
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

    // Auto-suggest Diagnostic Family when a specific diagnosis is picked
    $('#clDiagnosesSelect').on('change', function() {
        const vals = ($(this).val() || []).join(' ').toLowerCase();
        if (!vals) return;
        if (/f43|309\.|ptsd|trauma|adjustment|grief/.test(vals)) {
            $('#clDxCategory').val('Trauma & Stressor-Related (PTSD / Adjustment)');
        } else if (/f90|f84|314\.|299\.|adhd|autis|neuro/.test(vals)) {
            $('#clDxCategory').val('Neurodevelopmental (ADHD / Autism)');
        } else if (/f41|f40|f42|300\.0|300\.2|300\.3|anxiety|panic|ocd|obsess/.test(vals)) {
            $('#clDxCategory').val('Anxiety & OCD Spectrum');
        } else if (/f32|f33|f34|296\.|depress|dysthym|mood/.test(vals)) {
            $('#clDxCategory').val('Depressive & Mood Disorders');
        } else if (/f60|301\.|borderline|personality/.test(vals)) {
            $('#clDxCategory').val('Personality & Complex Relational');
        } else if (/f50|307\.|eating|arfid|binge/.test(vals)) {
            $('#clDxCategory').val('Disordered Eating / Feeding (ARFID / BED)');
        }
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
    function computeDimensionCounts(dimensionKey) {
        const counts = {};
        let total = 0;

        appState.clients.forEach(client => {
            if (dimensionKey === 'diagnosis') {
                const dxs = Array.isArray(client.diagnoses) && client.diagnoses.length > 0
                    ? client.diagnoses
                    : ['Unspecified'];
                dxs.forEach(d => {
                    counts[d] = (counts[d] || 0) + 1;
                    total++;
                });
            } else if (dimensionKey.startsWith('cf_')) {
                const val = (client.customValues && client.customValues[dimensionKey]) || 'Unspecified';
                counts[val] = (counts[val] || 0) + 1;
                total++;
            } else {
                const val = client[dimensionKey] || 'Unspecified';
                counts[val] = (counts[val] || 0) + 1;
                total++;
            }
        });

        const sorted = Object.entries(counts)
            .map(([label, count]) => ({
                label,
                count,
                pct: total > 0 ? ((count / total) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        return { items: sorted, total };
    }

    function buildSvgPieChart(items, total) {
        if (total === 0 || items.length === 0) {
            return `
                <div class="empty-pie-placeholder flex items-center justify-center text-center muted text-xs p-6">
                    Add clients below or click "Load Sample Caseload" to see your chart.
                </div>
            `;
        }

        // If 1 single slice is 100%, draw a full circle
        if (items.length === 1) {
            return `
                <svg viewBox="-1.1 -1.1 2.2 2.2" width="250" height="250" aria-label="Caseload Pie Chart">
                    <circle cx="0" cy="0" r="1" fill="${PIE_COLORS[0]}" />
                    <circle cx="0" cy="0" r="0.45" style="fill: var(--bg-main, #ffffff)" />
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
            <svg viewBox="-1.05 -1.05 2.1 2.1" width="250" height="250" aria-label="Caseload Pie Chart">
                ${paths}
            </svg>
        `;
    }

    function renderPieChartAndLegend() {
        const dimKey = appState.selectedChartDimension || 'dxCategory';
        const { items, total } = computeDimensionCounts(dimKey);

        $('#svgPieChartContainer').html(buildSvgPieChart(items, total));
        const dimLabel = $('#chartDimensionSelect option:selected').text() || 'Selected Dimension';
        $('#chartTotalCaption').text(`Slicing by: ${dimLabel} (${appState.clients.length} Total Clients | ${total} Data Points)`);

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

    function renderIntakeAdvisor(items, total) {
        const box = $('#intakeAdvisorBox');
        if (appState.clients.length === 0) {
            box.html(`<strong>Intake Fit &amp; Caseload Balance Advisor:</strong><p class="muted">Log your current caseload below to see automatic insights on diagnosis concentration, phase-of-therapy bottlenecks, and what types of new intakes will best balance your energy.</p>`);
            return;
        }

        const topSlice = items[0];
        const phaseStats = computeDimensionCounts('phase');
        const acuityStats = computeDimensionCounts('acuity');

        const activeProcessingCount = (phaseStats.items.find(i => i.label.includes('Active Core') || i.label.includes('Intake'))?.count) || 0;
        const highAcuityCount = (acuityStats.items.find(i => i.label.includes('High'))?.count) || 0;

        const insights = [];
        if (topSlice && topSlice.pct >= 50) {
            insights.push(`<strong>Primary Concentration (${topSlice.pct.toFixed(0)}%):</strong> Over half of this view is <em>${escapeHtml(topSlice.label)}</em>. When screening new inquiries, ask yourself whether you want more of this presentation or if a different diagnostic/clinical presentation would feel refreshing.`);
        } else if (topSlice) {
            insights.push(`<strong>Balanced Distribution:</strong> Your largest slice is <em>${escapeHtml(topSlice.label)}</em> at ${topSlice.pct.toFixed(0)}%, showing a healthy variety across your caseload.`);
        }

        if (highAcuityCount >= 4) {
            insights.push(`<strong>⚠️ Acuity Alert (${highAcuityCount} High-Acuity Clients):</strong> You currently have ${highAcuityCount} high-acuity/crisis-risk clients. Consider prioritizing lower-acuity or maintenance-level clients for your next open intake slot.`);
        } else {
            insights.push(`<strong>🟢 Acuity Headroom:</strong> You have ${highAcuityCount} high-acuity clients logged, leaving sustainable emotional bandwidth if a complex intake inquiry arrives.`);
        }

        const graduationCount = (phaseStats.items.find(i => i.label.includes('Termination') || i.label.includes('Maintenance'))?.count) || 0;
        insights.push(`<strong>Pipeline Flow:</strong> ${graduationCount} client(s) are currently in Maintenance or Graduation Prep (likely to open up biweekly/full slots soon), while ${activeProcessingCount} are in Intensive Intake/Core Processing.`);

        box.html(`
            <div class="font-bold text-sm mb-1">Intake Fit &amp; Caseload Balance Insights</div>
            <ul class="list-disc ml-4 space-y-1">${insights.map(i => `<li>${i}</li>`).join('')}</ul>
        `);
    }

    // --- 3. Render Caseload Table ---
    function renderCaseloadTable() {
        $('#totalClientsCount').text(appState.clients.length);
        const thead = $('#caseloadTableHead');
        const tbody = $('#caseloadTableBody');
        thead.empty();
        tbody.empty();

        // Build Dynamic Headers based on Enabled Fields
        let headerHtml = `<tr class="border-b"><th class="p-2">Client Code</th>`;
        STANDARD_FIELDS.forEach(f => {
            if (appState.enabledFields.includes(f.key)) {
                headerHtml += `<th class="p-2">${escapeHtml(f.label)}</th>`;
            }
        });
        (appState.customFields || []).forEach(cf => {
            headerHtml += `<th class="p-2">${escapeHtml(cf.name)}</th>`;
        });
        headerHtml += `<th class="p-2 text-right">Actions</th></tr>`;
        thead.html(headerHtml);

        const kw = ($('#tableSearchInput').val() || '').toLowerCase().trim();
        const filtered = appState.clients.filter(c => {
            if (!kw) return true;
            const hay = JSON.stringify(c).toLowerCase();
            return hay.includes(kw);
        });

        const totalCols = 2 + appState.enabledFields.length + (appState.customFields || []).length;

        if (filtered.length === 0) {
            tbody.append(`<tr><td colspan="${totalCols}" class="p-4 text-center muted">No clients in table. Add a client above or load the sample caseload.</td></tr>`);
            return;
        }

        filtered.forEach(c => {
            let rowHtml = `<tr class="border-b"><td class="p-2 font-bold whitespace-nowrap">${escapeHtml(c.code)}</td>`;

            STANDARD_FIELDS.forEach(f => {
                if (!appState.enabledFields.includes(f.key)) return;
                if (f.key === 'diagnosis') {
                    const badges = (c.diagnoses || []).map(d => `<span class="dx-tag">${escapeHtml(d)}</span>`).join(' ');
                    rowHtml += `<td class="p-2">${badges || '—'}</td>`;
                } else {
                    rowHtml += `<td class="p-2">${escapeHtml(c[f.key] || '—')}</td>`;
                }
            });

            (appState.customFields || []).forEach(cf => {
                const v = (c.customValues && c.customValues[cf.id]) || '—';
                rowHtml += `<td class="p-2">${escapeHtml(v)}</td>`;
            });

            rowHtml += `
                <td class="p-2 text-right whitespace-nowrap">
                    <button type="button" class="btn-link text-xs edit-client-btn mr-2" data-id="${c.id}">Edit</button>
                    <button type="button" class="btn-link text-xs delete-client-btn" data-id="${c.id}">Remove</button>
                </td>
            </tr>`;
            tbody.append(rowHtml);
        });
    }

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
            dxCategory: $('#clDxCategory').val(),
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
        $('#clDiagnosesSelect').val(null).trigger('change');
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
        populateDiagnosisDropdown(currentDxSystem, c.diagnoses || []);
        $('#clDxCategory').val(c.dxCategory);
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

    // Load Sample Caseload Button (Helpful for testing the pie chart right away!)
    $('#loadSampleCaseloadBtn').on('click', function() {
        if (appState.clients.length > 0 && !confirm('Replace current list with a 10-client sample caseload to test the chart?')) return;
        appState.clients = [
            { id: 's1', code: 'Client #01', diagnoses: ['F43.10 - Post-Traumatic Stress Disorder (PTSD)'], dxCategory: 'Trauma & Stressor-Related (PTSD / Adjustment)', phase: '3. Active Core / Trauma Processing', timeInTherapy: '6 to 12 Months', ageGroup: 'Adult (25–34)', gender: 'Non-Binary / Genderqueer', frequency: 'Weekly', acuity: 'Moderate / Active Work', payType: 'Commercial Insurance (Headway/Direct)', notes: '' },
            { id: 's2', code: 'Client #02', diagnoses: ['F90.2 - ADHD, Combined Presentation', 'F41.1 - Generalized Anxiety Disorder'], dxCategory: 'Neurodevelopmental (ADHD / Autism)', phase: '2. Stabilization & Resourcing', timeInTherapy: '3 to 6 Months', ageGroup: 'Young Adult (18–24)', gender: 'Woman (Cis or Trans)', frequency: 'Weekly', acuity: 'Moderate / Active Work', payType: 'Commercial Insurance (Headway/Direct)', notes: '' },
            { id: 's3', code: 'Client #03', diagnoses: ['F84.0 - Autism Spectrum Disorder'], dxCategory: 'Neurodevelopmental (ADHD / Autism)', phase: '4. Integration & Maintenance', timeInTherapy: '1 to 2 Years', ageGroup: 'Adult (25–34)', gender: 'Transgender / Gender Expansive', frequency: 'Biweekly (Every 2 Weeks)', acuity: 'Low / Stable Maintenance', payType: 'Medicaid / ProviderOne', notes: '' },
            { id: 's4', code: 'Client #04', diagnoses: ['F43.10 - Post-Traumatic Stress Disorder (PTSD)', 'F33.1 - Major Depressive Disorder, Recurrent, Moderate'], dxCategory: 'Trauma & Stressor-Related (PTSD / Adjustment)', phase: '2. Stabilization & Resourcing', timeInTherapy: 'Under 3 Months', ageGroup: 'Adult (35–49)', gender: 'Woman (Cis or Trans)', frequency: 'Weekly', acuity: 'High / Complex / Crisis Risk', payType: 'Commercial Insurance (Headway/Direct)', notes: '' },
            { id: 's5', code: 'Client #05', diagnoses: ['F41.1 - Generalized Anxiety Disorder'], dxCategory: 'Anxiety & OCD Spectrum', phase: '5. Termination / Graduation Prep', timeInTherapy: '1 to 2 Years', ageGroup: 'Adult (25–34)', gender: 'Man (Cis or Trans)', frequency: 'Monthly / Check-In', acuity: 'Low / Stable Maintenance', payType: 'Private Pay (Full Fee)', notes: '' },
            { id: 's6', code: 'Client #06', diagnoses: ['F90.0 - ADHD, Predominantly Inattentive'], dxCategory: 'Neurodevelopmental (ADHD / Autism)', phase: '3. Active Core / Trauma Processing', timeInTherapy: '6 to 12 Months', ageGroup: 'Adolescent (13–17)', gender: 'Non-Binary / Genderqueer', frequency: 'Weekly', acuity: 'Moderate / Active Work', payType: 'Medicaid / ProviderOne', notes: '' },
            { id: 's7', code: 'Client #07', diagnoses: ['F43.23 - Adjustment Disorder with Mixed Anxiety & Depressed Mood'], dxCategory: 'Trauma & Stressor-Related (PTSD / Adjustment)', phase: '1. Intake & Assessment', timeInTherapy: 'Under 3 Months', ageGroup: 'Young Adult (18–24)', gender: 'Woman (Cis or Trans)', frequency: 'Weekly', acuity: 'Moderate / Active Work', payType: 'Commercial Insurance (Headway/Direct)', notes: '' },
            { id: 's8', code: 'Client #08', diagnoses: ['F42.2 - Obsessive-Compulsive Disorder (OCD)'], dxCategory: 'Anxiety & OCD Spectrum', phase: '3. Active Core / Trauma Processing', timeInTherapy: '3 to 6 Months', ageGroup: 'Adult (35–49)', gender: 'Man (Cis or Trans)', frequency: 'Weekly', acuity: 'Moderate / Active Work', payType: 'Commercial Insurance (Headway/Direct)', notes: '' }
        ];
        renderAll();
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
                    Object.assign(appState, parsed);
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
        downloadFile(JSON.stringify(appState, null, 2), `caseload_demographics_${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', () => $('#importJsonFile').click());

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                Object.assign(appState, parsed);
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
            alert('No clients logged yet to export.');
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
        const { items, total } = computeDimensionCounts(dimKey);
        const svgMarkup = buildSvgPieChart(items, total);
        const dimLabel = $('#chartDimensionSelect option:selected').text();

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
                        <div>Sliced By: <strong>${escapeHtml(dimLabel)}</strong> (${appState.clients.length} Active Clients)</div>
                    </div>
                    <div><strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</div>
                </div>

                <div class="chart-grid">
                    <div style="text-align:center;">${svgMarkup}</div>
                    <div>
                        <table>
                            <thead><tr><th>Category / Slice</th><th>Count</th><th>Percentage</th></tr></thead>
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