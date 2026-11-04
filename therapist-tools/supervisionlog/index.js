$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_supervision_log_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_supervision_cache_enabled';

    const SUPERVISION_TOPICS = [
        'Case Conceptualization & Theory',
        'Risk / Suicide / Safety Assessment',
        'Ethics, Law & Boundaries',
        'Diagnostic Impressions (DSM-5-TR / ICD-10)',
        'Treatment Planning & Interventions',
        'Countertransference & Self-of-the-Therapist',
        'Cultural Humility & Health Equity',
        'Group Therapy Dynamics',
        'Family / Couples Systems',
        'Documentation, Notes & Audit Readiness',
        'Termination & Continuity of Care',
        'Live Observation / Tape Review'
    ];

    let appState = {
        role: 'associate', // 'associate' | 'intern' | 'supervisor'
        userName: '',
        userLicenseNum: '',
        primaryPartnerName: '',
        primaryPartnerCreds: '',
        logStartDate: '',
        logEndDate: new Date().toISOString().split('T')[0],
        complianceDocs: [],
        complianceAgreementDateNote: '',
        targets: {
            totalWorked: 3000,
            directTotal: 1200,
            supTotal: 100,
            supIndiv: 50,
            priorCreditHours: 0
        },
        // Pre-loaded with Severe Mental Health (SMH / LIMHP) from your Excel template as an example custom bucket!
        customCategories: [
            {
                id: 'smh_limhp',
                name: 'SMH / LIMHP (Severe Mental Health)',
                target: 1500,
                countsToward: 'subgoal' // 'subgoal' | 'direct' | 'supervision' | 'indirect'
            }
        ],
        entries: []
    };

    // Initialize Select2 for Supervision Topics
    const topicsSelect = $('#supTopicsSelect');
    SUPERVISION_TOPICS.forEach(t => topicsSelect.append(new Option(t, t)));
    topicsSelect.select2({
        placeholder: 'Select clinical themes or type custom topic...',
        allowClear: true,
        multiple: true,
        tags: true,
        width: '100%'
    });

    // Default Entry Date to Today
    $('#entryDate').val(new Date().toISOString().split('T')[0]);

    // --- 1. Role Presets ---
    $('.role-tab-btn').on('click', function() {
        const role = $(this).data('role');
        appState.role = role;
        $('.role-tab-btn').removeClass('btn-primary');
        $(this).addClass('btn-primary');

        if (role === 'associate') {
            // LMHCA targets (WAC 246-809-230). LMFTA (246-809-130) and LSWAIC (246-809-330) differ, so users adjust them
            appState.targets.totalWorked = 3000;
            appState.targets.directTotal = 1200;
            appState.targets.supTotal = 100;
            appState.targets.supIndiv = 50;
        } else if (role === 'intern') {
            appState.targets.totalWorked = 600;
            appState.targets.directTotal = 240;
            appState.targets.supTotal = 60;
            appState.targets.supIndiv = 30;
        } else if (role === 'supervisor') {
            appState.targets.totalWorked = 0;
            appState.targets.directTotal = 0;
            appState.targets.supTotal = 100;
            appState.targets.supIndiv = 50;
        }
        renderAll();
    });

    // --- 2. Custom Hour Categories Management ---
    function renderCustomCategoriesSetup() {
        const container = $('#customCategoriesSetupContainer');
        container.empty();

        if (appState.customCategories.length === 0) {
            container.append(`<p class="muted text-xs">No custom hour categories added. Click "+ Add Custom Hour Type" above if you need to track a specialty requirement (e.g., Group Hours target, SMH/LIMHP, Drama Therapy).</p>`);
            $('#customHourInputsBlock').addClass('hidden');
            return;
        }

        appState.customCategories.forEach(cat => {
            const row = $(`
                <div class="custom-cat-row flex flex-wrap items-center gap-2 p-2 border rounded-md" data-id="${cat.id}">
                    <input type="text" class="custom-cat-name flex-1 p-2 border rounded-md text-xs font-semibold" placeholder="Category Name (e.g., SMH / LIMHP, Specialty Group)" value="${escapeAttr(cat.name)}">
                    <div class="flex items-center gap-1">
                        <label class="text-xs whitespace-nowrap">Target Hrs:</label>
                        <input type="number" class="custom-cat-target w-24 p-2 border rounded-md text-xs" step="1" min="0" value="${cat.target || 0}">
                    </div>
                    <select class="custom-cat-behavior p-2 border rounded-md text-xs">
                        <option value="subgoal" ${cat.countsToward === 'subgoal' ? 'selected' : ''}>Sub-Category Tracking Only (Already counted in Direct/Indirect above)</option>
                        <option value="direct" ${cat.countsToward === 'direct' ? 'selected' : ''}>Adds to Direct Client Hours &amp; Total Worked</option>
                        <option value="supervision" ${cat.countsToward === 'supervision' ? 'selected' : ''}>Adds to Supervision Hours &amp; Total Worked</option>
                        <option value="indirect" ${cat.countsToward === 'indirect' ? 'selected' : ''}>Adds to Indirect Hours &amp; Total Worked</option>
                    </select>
                    <button type="button" class="remove-custom-cat-btn btn-link text-xs px-2">Remove</button>
                </div>
            `);
            container.append(row);
        });

        renderCustomHourEntryInputs();
    }

    function renderCustomHourEntryInputs(entryCustomValues = {}) {
        const grid = $('#customHourFieldsGrid');
        grid.empty();

        if (appState.customCategories.length === 0) {
            $('#customHourInputsBlock').addClass('hidden');
            return;
        }

        $('#customHourInputsBlock').removeClass('hidden');
        appState.customCategories.forEach(cat => {
            const val = entryCustomValues[cat.id] !== undefined ? entryCustomValues[cat.id] : '';
            grid.append(`
                <div>
                    <label class="block text-xs font-semibold mb-1">${escapeHtml(cat.name || 'Custom Hours')}:</label>
                    <input type="number" step="0.25" min="0" placeholder="0" value="${val}" data-custom-id="${cat.id}" class="custom-hour-input hour-input w-full p-2 border rounded-md text-sm">
                </div>
            `);
        });
    }

    $('#addCustomCategoryBtn').on('click', function() {
        appState.customCategories.push({
            id: 'cust_' + Date.now(),
            name: 'New Custom Requirement',
            target: 100,
            countsToward: 'subgoal'
        });
        renderAll();
    });

    $(document).on('input change', '.custom-cat-row input, .custom-cat-row select', function() {
        const row = $(this).closest('.custom-cat-row');
        const id = row.data('id');
        const cat = appState.customCategories.find(c => c.id === id);
        if (!cat) return;

        cat.name = row.find('.custom-cat-name').val().trim();
        cat.target = parseFloat(row.find('.custom-cat-target').val()) || 0;
        cat.countsToward = row.find('.custom-cat-behavior').val();

        renderCustomHourEntryInputs();
        renderProgressDashboard();
        renderLogTable();
        saveToLocalCacheIfEnabled();
    });

    $(document).on('click', '.remove-custom-cat-btn', function() {
        const id = $(this).closest('.custom-cat-row').data('id');
        appState.customCategories = appState.customCategories.filter(c => c.id !== id);
        renderAll();
    });

    // --- 3. Calculate Entry & Aggregate Totals ---
    function computeEntryTotals(entry) {
        const supIndiv = (parseFloat(entry.supIndivInPerson) || 0) + (parseFloat(entry.supIndivTelehealth) || 0);
        const supGroup = (parseFloat(entry.supGroupInPerson) || 0) + (parseFloat(entry.supGroupTelehealth) || 0);
        let totalSup = supIndiv + supGroup;

        const dirIndiv = (parseFloat(entry.dirIndivInPerson) || 0) + (parseFloat(entry.dirIndivTelehealth) || 0);
        const dirGroup = (parseFloat(entry.dirGroupInPerson) || 0) + (parseFloat(entry.dirGroupTelehealth) || 0);
        const dirFamily = (parseFloat(entry.dirFamilyInPerson) || 0) + (parseFloat(entry.dirFamilyTelehealth) || 0);
        const dirOther = parseFloat(entry.dirOther) || 0;
        let totalDirect = dirIndiv + dirGroup + dirFamily + dirOther;

        let totalIndirect = parseFloat(entry.indirectHours) || 0;

        // Check if any custom categories add to direct, supervision, or indirect
        (appState.customCategories || []).forEach(cat => {
            const v = entry.customHours && parseFloat(entry.customHours[cat.id]) ? parseFloat(entry.customHours[cat.id]) : 0;
            if (cat.countsToward === 'direct') totalDirect += v;
            if (cat.countsToward === 'supervision') totalSup += v;
            if (cat.countsToward === 'indirect') totalIndirect += v;
        });

        const totalWorked = totalSup + totalDirect + totalIndirect;
        return {
            supIndiv,
            supGroup,
            totalSup,
            dirIndiv,
            dirGroup,
            dirFamily,
            dirOther,
            totalDirect,
            totalIndirect,
            totalWorked
        };
    }

    function getFilteredEntries() {
        const filterVal = $('#filterPartnerSiteSelect').val() || 'ALL';
        if (filterVal === 'ALL') return appState.entries;
        return appState.entries.filter(e => {
            const label = `${e.jobSite || 'Unspecified Site'} — ${e.partnerName || appState.primaryPartnerName || 'Unspecified Supervisor'}`;
            return label === filterVal;
        });
    }

    function calculateAggregates(entries) {
        const agg = {
            supIndivInPerson: 0,
            supIndivTelehealth: 0,
            supGroupInPerson: 0,
            supGroupTelehealth: 0,
            supIndiv: 0,
            supGroup: 0,
            totalSup: 0,
            dirIndivInPerson: 0,
            dirIndivTelehealth: 0,
            dirGroupInPerson: 0,
            dirGroupTelehealth: 0,
            dirFamilyInPerson: 0,
            dirFamilyTelehealth: 0,
            dirOther: 0,
            totalDirect: 0,
            totalIndirect: 0,
            totalWorked: parseFloat(appState.targets.priorCreditHours) || 0,
            customTotals: {}
        };

        (appState.customCategories || []).forEach(c => { agg.customTotals[c.id] = 0; });

        entries.forEach(e => {
            const rowCalc = computeEntryTotals(e);
            agg.supIndivInPerson += parseFloat(e.supIndivInPerson) || 0;
            agg.supIndivTelehealth += parseFloat(e.supIndivTelehealth) || 0;
            agg.supGroupInPerson += parseFloat(e.supGroupInPerson) || 0;
            agg.supGroupTelehealth += parseFloat(e.supGroupTelehealth) || 0;
            agg.supIndiv += rowCalc.supIndiv;
            agg.supGroup += rowCalc.supGroup;
            agg.totalSup += rowCalc.totalSup;

            agg.dirIndivInPerson += parseFloat(e.dirIndivInPerson) || 0;
            agg.dirIndivTelehealth += parseFloat(e.dirIndivTelehealth) || 0;
            agg.dirGroupInPerson += parseFloat(e.dirGroupInPerson) || 0;
            agg.dirGroupTelehealth += parseFloat(e.dirGroupTelehealth) || 0;
            agg.dirFamilyInPerson += parseFloat(e.dirFamilyInPerson) || 0;
            agg.dirFamilyTelehealth += parseFloat(e.dirFamilyTelehealth) || 0;
            agg.dirOther += parseFloat(e.dirOther) || 0;

            agg.totalDirect += rowCalc.totalDirect;
            agg.totalIndirect += rowCalc.totalIndirect;
            agg.totalWorked += rowCalc.totalWorked;

            (appState.customCategories || []).forEach(c => {
                const v = e.customHours && parseFloat(e.customHours[c.id]) ? parseFloat(e.customHours[c.id]) : 0;
                agg.customTotals[c.id] = (agg.customTotals[c.id] || 0) + v;
            });
        });

        return agg;
    }

    // --- 4. Render UI ---
    function renderAll() {
        syncHeaderInputs();
        updateElapsedDaysMonths();
        renderCustomCategoriesSetup();
        populateSiteFilterDropdown();
        renderProgressDashboard();
        renderLogTable();
        saveToLocalCacheIfEnabled();
    }

    function syncHeaderInputs() {
        $('.role-tab-btn').removeClass('btn-primary');
        $(`.role-tab-btn[data-role="${appState.role}"]`).addClass('btn-primary');

        $('#userName').val(appState.userName);
        $('#userLicenseNum').val(appState.userLicenseNum);
        $('#primaryPartnerName').val(appState.primaryPartnerName);
        $('#primaryPartnerCreds').val(appState.primaryPartnerCreds);
        $('#logStartDate').val(appState.logStartDate);
        $('#logEndDate').val(appState.logEndDate);
        $('#complianceAgreementDateNote').val(appState.complianceAgreementDateNote || '');

        $('.doc-compliance-cb').each(function() {
            const val = $(this).val();
            $(this).prop('checked', (appState.complianceDocs || []).includes(val));
        });

        $('#targetTotalWorked').val(appState.targets.totalWorked);
        $('#targetDirectTotal').val(appState.targets.directTotal);
        $('#targetSupTotal').val(appState.targets.supTotal);
        $('#targetSupIndiv').val(appState.targets.supIndiv);
        $('#priorCreditHours').val(appState.targets.priorCreditHours);
    }

    function updateElapsedDaysMonths() {
        const start = appState.logStartDate;
        const end = appState.logEndDate || new Date().toISOString().split('T')[0];
        if (!start) {
            $('#elapsedTimeDisplay').text('Enter a Start Date to calculate # days and # months');
            return;
        }
        const d1 = new Date(start + 'T00:00:00');
        const d2 = new Date(end + 'T00:00:00');
        const diffMs = d2 - d1;
        if (diffMs < 0) {
            $('#elapsedTimeDisplay').text('End date is before start date');
            return;
        }
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const months = (days / 30.4375).toFixed(1);
        $('#elapsedTimeDisplay').text(`${days} days (${months} months)`);
    }

    function populateSiteFilterDropdown() {
        const select = $('#filterPartnerSiteSelect');
        const currentVal = select.val() || 'ALL';
        select.empty();
        select.append(new Option('All Jobs / Sites / Supervisors Combined', 'ALL'));

        const uniqueLabels = new Set();
        appState.entries.forEach(e => {
            const label = `${e.jobSite || 'Unspecified Site'} — ${e.partnerName || appState.primaryPartnerName || 'Unspecified Supervisor'}`;
            uniqueLabels.add(label);
        });

        uniqueLabels.forEach(l => select.append(new Option(l, l)));
        if ([...uniqueLabels].includes(currentVal)) {
            select.val(currentVal);
        }
    }

    function renderProgressDashboard() {
        const entries = getFilteredEntries();
        const agg = calculateAggregates(entries);

        // Summary Metric Cards
        const cardsContainer = $('#summaryMetricCards');
        cardsContainer.empty();
        cardsContainer.append(`
            <div class="p-3 border rounded-md text-center">
                <div class="muted text-xs">Total Hours Worked</div>
                <div class="text-2xl font-bold">${agg.totalWorked.toFixed(2)}</div>
                <div class="muted text-xs">Target: ${appState.targets.totalWorked || '—'}</div>
            </div>
            <div class="p-3 border rounded-md text-center">
                <div class="muted text-xs">Total Direct Client Hours</div>
                <div class="text-2xl font-bold">${agg.totalDirect.toFixed(2)}</div>
                <div class="muted text-xs">Indiv: ${(agg.dirIndivInPerson + agg.dirIndivTelehealth).toFixed(1)} | Grp: ${(agg.dirGroupInPerson + agg.dirGroupTelehealth).toFixed(1)} | Fam: ${(agg.dirFamilyInPerson + agg.dirFamilyTelehealth).toFixed(1)}</div>
            </div>
            <div class="p-3 border rounded-md text-center">
                <div class="muted text-xs">Total Supervision Hours</div>
                <div class="text-2xl font-bold">${agg.totalSup.toFixed(2)}</div>
                <div class="muted text-xs">1-on-1: ${agg.supIndiv.toFixed(1)} | Group: ${agg.supGroup.toFixed(1)}</div>
            </div>
            <div class="p-3 border rounded-md text-center">
                <div class="muted text-xs">Total Indirect Hours</div>
                <div class="text-2xl font-bold">${agg.totalIndirect.toFixed(2)}</div>
                <div class="muted text-xs">Prior Credit Included: ${(parseFloat(appState.targets.priorCreditHours) || 0).toFixed(1)}</div>
            </div>
        `);

        // Progress Bars
        const barsContainer = $('#progressBarsContainer');
        barsContainer.empty();

        if (appState.targets.totalWorked > 0) {
            barsContainer.append(buildBarHTML('Total Licensure / Experience Hours Worked', agg.totalWorked, appState.targets.totalWorked));
        }
        if (appState.targets.directTotal > 0) {
            barsContainer.append(buildBarHTML('Total Direct Client Contact Hours', agg.totalDirect, appState.targets.directTotal));
        }
        if (appState.targets.supTotal > 0) {
            barsContainer.append(buildBarHTML('Total Immediate Supervision Hours (1-on-1 + Group)', agg.totalSup, appState.targets.supTotal));
        }
        if (appState.targets.supIndiv > 0) {
            barsContainer.append(buildBarHTML('1-on-1 Individual Supervision Hours', agg.supIndiv, appState.targets.supIndiv));
        }

        // Custom Category Progress Bars
        (appState.customCategories || []).forEach(cat => {
            const earned = agg.customTotals[cat.id] || 0;
            if (cat.target > 0) {
                barsContainer.append(buildBarHTML(`${cat.name} (Custom Category)`, earned, cat.target));
            }
        });
    }

    function buildBarHTML(label, earned, target) {
        const pct = target > 0 ? Math.min(100, ((earned / target) * 100)).toFixed(1) : 100;
        const isDone = earned >= target;
        const remaining = Math.max(0, target - earned).toFixed(2);
        return `
            <div class="p-3 border rounded-md">
                <div class="flex flex-wrap justify-between items-center text-xs mb-1">
                    <span class="font-bold">${escapeHtml(label)}</span>
                    <span><strong>${earned.toFixed(2)}</strong> / ${target} hrs (${pct}% completed — ${remaining} needed)</span>
                </div>
                <div class="progress-track w-full rounded-md overflow-hidden">
                    <div class="progress-fill ${isDone ? 'fill-complete' : 'fill-active'}" style="width: ${pct}%;"></div>
                </div>
            </div>
        `;
    }

    function renderLogTable() {
        const tbody = $('#logTableBody');
        const tfoot = $('#logTableFoot');
        tbody.empty();
        tfoot.empty();

        const entries = [...getFilteredEntries()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        if (entries.length === 0) {
            tbody.append(`<tr><td colspan="9" class="p-4 text-center muted text-sm">No entries logged yet. Add a weekly or session row above, or import a saved <code>.json</code> file.</td></tr>`);
            return;
        }

        entries.forEach(e => {
            const calc = computeEntryTotals(e);
            const customBadges = (appState.customCategories || []).map(c => {
                const v = e.customHours && parseFloat(e.customHours[c.id]) ? parseFloat(e.customHours[c.id]) : 0;
                return v > 0 ? `<span class="tag-badge">${escapeHtml(c.name)}: ${v}</span>` : '';
            }).filter(Boolean).join(' ');

            const topicsBadges = (e.topics || []).map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join(' ');

            tbody.append(`
                <tr class="border-b text-xs">
                    <td class="p-2 whitespace-nowrap font-semibold">${escapeHtml(e.date)}</td>
                    <td class="p-2">
                        <div class="font-semibold">${escapeHtml(e.jobSite || '—')}</div>
                        <div class="muted">${escapeHtml(e.partnerName || appState.primaryPartnerName || '—')}</div>
                    </td>
                    <td class="p-2">
                        <div><strong>${calc.totalSup.toFixed(2)} hrs</strong></div>
                        <div class="muted">Indiv: ${calc.supIndiv.toFixed(2)} | Grp: ${calc.supGroup.toFixed(2)}</div>
                    </td>
                    <td class="p-2">
                        <div><strong>${calc.totalDirect.toFixed(2)} hrs</strong></div>
                        <div class="muted">
                            Ind: ${e.dirIndivInPerson || 0} / TH: ${e.dirIndivTelehealth || 0} |
                            Grp: ${e.dirGroupInPerson || 0} / TH: ${e.dirGroupTelehealth || 0} |
                            Fam: ${e.dirFamilyInPerson || 0} / TH: ${e.dirFamilyTelehealth || 0}
                            ${e.dirOther ? ` | Other: ${e.dirOther}` : ''}
                        </div>
                    </td>
                    <td class="p-2">${calc.totalIndirect.toFixed(2)}</td>
                    <td class="p-2 font-bold">${calc.totalWorked.toFixed(2)}</td>
                    <td class="p-2">${customBadges || '—'}</td>
                    <td class="p-2">
                        <div>${topicsBadges}</div>
                        ${e.notes ? `<div class="muted mt-1">${escapeHtml(e.notes)}</div>` : ''}
                    </td>
                    <td class="p-2 text-right whitespace-nowrap">
                        <button type="button" class="btn-link text-xs edit-entry-btn mr-2" data-id="${e.id}">Edit</button>
                        <button type="button" class="btn-link text-xs delete-entry-btn" data-id="${e.id}">Delete</button>
                    </td>
                </tr>
            `);
        });

        const agg = calculateAggregates(entries);
        tfoot.append(`
            <tr>
                <td class="p-2" colspan="2">TOTALS (${entries.length} Entries)</td>
                <td class="p-2">${agg.totalSup.toFixed(2)} hrs</td>
                <td class="p-2">${agg.totalDirect.toFixed(2)} hrs</td>
                <td class="p-2">${agg.totalIndirect.toFixed(2)} hrs</td>
                <td class="p-2">${agg.totalWorked.toFixed(2)} hrs</td>
                <td class="p-2" colspan="3"></td>
            </tr>
        `);
    }

    // --- 5. Form Listeners & Live Row Calculator ---
    function updateLiveRowPreview() {
        const tempEntry = collectFormEntryObject();
        const calc = computeEntryTotals(tempEntry);
        $('#liveRowTotalWorked').text(calc.totalWorked.toFixed(2));
        $('#liveRowDirect').text(calc.totalDirect.toFixed(2));
        $('#liveRowSup').text(calc.totalSup.toFixed(2));
    }

    $(document).on('input', '.hour-input', updateLiveRowPreview);

    $('#userName, #userLicenseNum, #primaryPartnerName, #primaryPartnerCreds, #logStartDate, #logEndDate, #complianceAgreementDateNote').on('input change', function() {
        appState.userName = $('#userName').val().trim();
        appState.userLicenseNum = $('#userLicenseNum').val().trim();
        appState.primaryPartnerName = $('#primaryPartnerName').val().trim();
        appState.primaryPartnerCreds = $('#primaryPartnerCreds').val().trim();
        appState.logStartDate = $('#logStartDate').val();
        appState.logEndDate = $('#logEndDate').val();
        appState.complianceAgreementDateNote = $('#complianceAgreementDateNote').val().trim();
        updateElapsedDaysMonths();
        populateSiteFilterDropdown();
        renderLogTable();
        saveToLocalCacheIfEnabled();
    });

    $('.doc-compliance-cb').on('change', function() {
        appState.complianceDocs = $('.doc-compliance-cb:checked').map(function() { return $(this).val(); }).get();
        saveToLocalCacheIfEnabled();
    });

    $('#targetTotalWorked, #targetDirectTotal, #targetSupTotal, #targetSupIndiv, #priorCreditHours').on('input change', function() {
        appState.targets.totalWorked = parseFloat($('#targetTotalWorked').val()) || 0;
        appState.targets.directTotal = parseFloat($('#targetDirectTotal').val()) || 0;
        appState.targets.supTotal = parseFloat($('#targetSupTotal').val()) || 0;
        appState.targets.supIndiv = parseFloat($('#targetSupIndiv').val()) || 0;
        appState.targets.priorCreditHours = parseFloat($('#priorCreditHours').val()) || 0;
        renderProgressDashboard();
        saveToLocalCacheIfEnabled();
    });

    $('#filterPartnerSiteSelect').on('change', function() {
        renderProgressDashboard();
        renderLogTable();
    });

    function collectFormEntryObject() {
        const customHours = {};
        $('.custom-hour-input').each(function() {
            const cid = $(this).data('custom-id');
            customHours[cid] = parseFloat($(this).val()) || 0;
        });

        return {
            id: $('#editingEntryId').val() || 'sup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            date: $('#entryDate').val(),
            jobSite: $('#entryJobSite').val().trim(),
            partnerName: $('#entryPartnerName').val().trim() || appState.primaryPartnerName,
            supIndivInPerson: parseFloat($('#supIndivInPerson').val()) || 0,
            supIndivTelehealth: parseFloat($('#supIndivTelehealth').val()) || 0,
            supGroupInPerson: parseFloat($('#supGroupInPerson').val()) || 0,
            supGroupTelehealth: parseFloat($('#supGroupTelehealth').val()) || 0,
            dirIndivInPerson: parseFloat($('#dirIndivInPerson').val()) || 0,
            dirIndivTelehealth: parseFloat($('#dirIndivTelehealth').val()) || 0,
            dirGroupInPerson: parseFloat($('#dirGroupInPerson').val()) || 0,
            dirGroupTelehealth: parseFloat($('#dirGroupTelehealth').val()) || 0,
            dirFamilyInPerson: parseFloat($('#dirFamilyInPerson').val()) || 0,
            dirFamilyTelehealth: parseFloat($('#dirFamilyTelehealth').val()) || 0,
            dirOther: parseFloat($('#dirOther').val()) || 0,
            indirectHours: parseFloat($('#indirectHours').val()) || 0,
            customHours: customHours,
            topics: $('#supTopicsSelect').val() || [],
            notes: $('#entryNotes').val().trim()
        };
    }

    $('#supervisionEntryForm').on('submit', function(e) {
        e.preventDefault();
        const entryObj = collectFormEntryObject();
        const editingId = $('#editingEntryId').val();

        if (!appState.logStartDate || (entryObj.date && entryObj.date < appState.logStartDate)) {
            appState.logStartDate = entryObj.date;
            $('#logStartDate').val(appState.logStartDate);
        }

        if (editingId) {
            const idx = appState.entries.findIndex(item => item.id === editingId);
            if (idx > -1) appState.entries[idx] = entryObj;
        } else {
            appState.entries.push(entryObj);
        }

        resetEntryForm();
        renderAll();
    });

    function resetEntryForm() {
        document.getElementById('supervisionEntryForm').reset();
        $('#editingEntryId').val('');
        $('#entryDate').val(new Date().toISOString().split('T')[0]);
        $('#supTopicsSelect').val(null).trigger('change');
        renderCustomHourEntryInputs();
        updateLiveRowPreview();
        $('#saveEntryBtn').text('Add Entry to Log');
        $('#cancelEntryEditBtn').addClass('hidden');
    }

    $('#cancelEntryEditBtn').on('click', resetEntryForm);

    $(document).on('click', '.edit-entry-btn', function() {
        const id = $(this).data('id');
        const entry = appState.entries.find(e => e.id === id);
        if (!entry) return;

        $('#editingEntryId').val(entry.id);
        $('#entryDate').val(entry.date);
        $('#entryJobSite').val(entry.jobSite);
        $('#entryPartnerName').val(entry.partnerName);
        $('#supIndivInPerson').val(entry.supIndivInPerson || '');
        $('#supIndivTelehealth').val(entry.supIndivTelehealth || '');
        $('#supGroupInPerson').val(entry.supGroupInPerson || '');
        $('#supGroupTelehealth').val(entry.supGroupTelehealth || '');
        $('#dirIndivInPerson').val(entry.dirIndivInPerson || '');
        $('#dirIndivTelehealth').val(entry.dirIndivTelehealth || '');
        $('#dirGroupInPerson').val(entry.dirGroupInPerson || '');
        $('#dirGroupTelehealth').val(entry.dirGroupTelehealth || '');
        $('#dirFamilyInPerson').val(entry.dirFamilyInPerson || '');
        $('#dirFamilyTelehealth').val(entry.dirFamilyTelehealth || '');
        $('#dirOther').val(entry.dirOther || '');
        $('#indirectHours').val(entry.indirectHours || '');

        renderCustomHourEntryInputs(entry.customHours || {});

        if (Array.isArray(entry.topics)) {
            entry.topics.forEach(t => {
                if ($('#supTopicsSelect').find(`option[value="${escapeAttr(t)}"]`).length === 0) {
                    $('#supTopicsSelect').append(new Option(t, t, true, true));
                }
            });
            $('#supTopicsSelect').val(entry.topics).trigger('change');
        }
        $('#entryNotes').val(entry.notes || '');

        updateLiveRowPreview();
        $('#saveEntryBtn').text('Update Entry');
        $('#cancelEntryEditBtn').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#supervisionEntryForm').offset().top - 30 }, 400);
    });

    $(document).on('click', '.delete-entry-btn', function() {
        const id = $(this).data('id');
        if (!confirm('Delete this entry from your supervision log?')) return;
        appState.entries = appState.entries.filter(e => e.id !== id);
        renderAll();
    });

    // --- 6. Local Cache Toggle ---
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
                    console.error('Failed to load cached supervision log:', e);
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
        if (!confirm('Wipe all supervision log data? Make sure you have exported your .json backup first.')) return;
        appState.entries = [];
        appState.userName = '';
        appState.userLicenseNum = '';
        appState.primaryPartnerName = '';
        appState.primaryPartnerCreds = '';
        appState.complianceDocs = [];
        appState.complianceAgreementDateNote = '';
        localStorage.removeItem(STORAGE_KEY);
        resetEntryForm();
        renderAll();
    });

    // --- 7. Export (.json, .csv) & Official Print Verification Report ---
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
        downloadFile(JSON.stringify(appState, null, 2), 'supervision_licensure_log.json', 'application/json;charset=utf-8');
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
                alert('Invalid JSON file. Please upload a valid Supervision Log .json backup.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#exportCsvButton').on('click', function() {
        const entries = getFilteredEntries();
        if (entries.length === 0) {
            alert('No entries to export.');
            return;
        }
        const customHeaders = (appState.customCategories || []).map(c => c.name);
        const headers = [
            'Date', 'Job/Site', 'Supervisor/Supervisee',
            'Sup Indiv (In-Person)', 'Sup Indiv (Telehealth)', 'Sup Group (In-Person)', 'Sup Group (Telehealth)',
            'Client Indiv (In-Person)', 'Client Indiv (Telehealth)',
            'Client Group (In-Person)', 'Client Group (Telehealth)',
            'Client Family (In-Person)', 'Client Family (Telehealth)',
            'Other Direct Hours', 'Indirect Hours', 'Total Hours Worked',
            ...customHeaders, 'Themes Discussed', 'Notes'
        ];

        const rows = entries.map(e => {
            const calc = computeEntryTotals(e);
            const customVals = (appState.customCategories || []).map(c => (e.customHours && e.customHours[c.id]) || 0);
            return [
                e.date, e.jobSite, e.partnerName,
                e.supIndivInPerson || 0, e.supIndivTelehealth || 0, e.supGroupInPerson || 0, e.supGroupTelehealth || 0,
                e.dirIndivInPerson || 0, e.dirIndivTelehealth || 0,
                e.dirGroupInPerson || 0, e.dirGroupTelehealth || 0,
                e.dirFamilyInPerson || 0, e.dirFamilyTelehealth || 0,
                e.dirOther || 0, e.indirectHours || 0, calc.totalWorked.toFixed(2),
                ...customVals,
                (e.topics || []).join('; '), e.notes || ''
            ];
        });

        const csvContent = [headers, ...rows]
            .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        downloadFile(csvContent, 'supervision_hours_export.csv', 'text/csv;charset=utf-8');
    });

    $('#printVerificationBtn').on('click', function() {
        const entries = [...getFilteredEntries()].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        const agg = calculateAggregates(entries);

        const docLabels = {
            contract_signed: 'Signed Supervision Contract / Agreement on file',
            state_agreement: 'State / DOH Supervisory Agreement Form completed',
            supervisor_qual_verified: 'Supervisor Qualifications & Approved Status verified',
            disclosure_received: 'Supervisor Disclosure Statement & Evaluation Plan reviewed',
            crisis_coverage_plan: 'Clinical Emergency / Back-Up Coverage Protocol established',
            liability_verified: 'Professional Liability / Malpractice Coverage verified'
        };

        const checkedDocsHtml = (appState.complianceDocs || [])
            .map(d => `<li>&#10003; ${escapeHtml(docLabels[d] || d)}</li>`)
            .join('');

        const customSummaryRows = (appState.customCategories || []).map(c => `
            <tr>
                <td><strong>${escapeHtml(c.name)}</strong> (Custom Requirement)</td>
                <td>${(agg.customTotals[c.id] || 0).toFixed(2)} hrs</td>
                <td>${c.target || '—'} hrs</td>
            </tr>
        `).join('');

        const entryRowsHtml = entries.map(e => {
            const calc = computeEntryTotals(e);
            const customText = (appState.customCategories || []).map(c => {
                const v = e.customHours && parseFloat(e.customHours[c.id]) ? parseFloat(e.customHours[c.id]) : 0;
                return v > 0 ? `${escapeHtml(c.name)}: ${v}` : '';
            }).filter(Boolean).join(', ');

            return `
                <tr>
                    <td>${escapeHtml(e.date)}</td>
                    <td>${escapeHtml(e.jobSite || '—')}<br><small>${escapeHtml(e.partnerName || '')}</small></td>
                    <td>${calc.supIndiv.toFixed(2)}</td>
                    <td>${calc.supGroup.toFixed(2)}</td>
                    <td>${(parseFloat(e.dirIndivInPerson || 0) + parseFloat(e.dirIndivTelehealth || 0)).toFixed(2)}</td>
                    <td>${(parseFloat(e.dirGroupInPerson || 0) + parseFloat(e.dirGroupTelehealth || 0)).toFixed(2)}</td>
                    <td>${(parseFloat(e.dirFamilyInPerson || 0) + parseFloat(e.dirFamilyTelehealth || 0) + parseFloat(e.dirOther || 0)).toFixed(2)}</td>
                    <td>${calc.totalDirect.toFixed(2)}</td>
                    <td>${calc.totalIndirect.toFixed(2)}</td>
                    <td><strong>${calc.totalWorked.toFixed(2)}</strong></td>
                    <td>${customText || '—'}</td>
                </tr>
            `;
        }).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Clinical Supervision &amp; Licensure Verification Log</title>
                <style>
                    @page { margin: 0.5in; size: landscape; }
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; font-size: 9.5pt; line-height: 1.35; margin: 0; }
                    h1, h2, h3 { margin: 0 0 6px 0; }
                    .header-grid { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.5pt; }
                    th, td { border: 1px solid #444; padding: 4px 6px; text-align: left; }
                    th { background: #eee; }
                    .sig-block { margin-top: 24px; display: flex; justify-content: space-between; gap: 30px; break-inside: avoid; }
                </style>
            </head>
            <body>
                <h1>Clinical Supervision &amp; Licensure Hours Verification Report</h1>
                <div class="header-grid">
                    <div>
                        <strong>Clinician / Supervisee:</strong> ${escapeHtml(appState.userName || '________________________')} (${escapeHtml(appState.userLicenseNum || '____________')})<br>
                        <strong>Supervisor:</strong> ${escapeHtml(appState.primaryPartnerName || '________________________')} (${escapeHtml(appState.primaryPartnerCreds || '____________')})
                    </div>
                    <div>
                        <strong>Date Range:</strong> ${escapeHtml(appState.logStartDate || '—')} to ${escapeHtml(appState.logEndDate || '—')}<br>
                        <strong>Elapsed Time:</strong> ${escapeHtml($('#elapsedTimeDisplay').text())}<br>
                        <strong>Filter Scope:</strong> ${escapeHtml($('#filterPartnerSiteSelect').val())}
                    </div>
                </div>

                <h3>Summary Totals Across Logged Sessions</h3>
                <table>
                    <thead>
                        <tr><th>Category</th><th>Completed Hours</th><th>Target Goal</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><strong>Total Experience Hours Worked</strong> (Includes Prior Credit: ${appState.targets.priorCreditHours || 0})</td><td><strong>${agg.totalWorked.toFixed(2)} hrs</strong></td><td>${appState.targets.totalWorked} hrs</td></tr>
                        <tr><td><strong>Total Direct Client Contact Hours</strong> (Indiv: ${(agg.dirIndivInPerson + agg.dirIndivTelehealth).toFixed(2)} | Grp: ${(agg.dirGroupInPerson + agg.dirGroupTelehealth).toFixed(2)} | Fam/Other: ${(agg.dirFamilyInPerson + agg.dirFamilyTelehealth + agg.dirOther).toFixed(2)})</td><td><strong>${agg.totalDirect.toFixed(2)} hrs</strong></td><td>${appState.targets.directTotal} hrs</td></tr>
                        <tr><td><strong>Total Immediate Supervision Hours</strong> (1-on-1 Indiv: ${agg.supIndiv.toFixed(2)} | Group: ${agg.supGroup.toFixed(2)})</td><td><strong>${agg.totalSup.toFixed(2)} hrs</strong></td><td>${appState.targets.supTotal} hrs</td></tr>
                        <tr><td><strong>Indirect Clinical / Admin Hours</strong></td><td>${agg.totalIndirect.toFixed(2)} hrs</td><td>—</td></tr>
                        ${customSummaryRows}
                    </tbody>
                </table>

                ${checkedDocsHtml ? `
                    <h3>Verified Supervisory Relationship Documentation on File</h3>
                    <ul style="margin: 4px 0 12px 18px; padding: 0;">${checkedDocsHtml}</ul>
                    ${appState.complianceAgreementDateNote ? `<p><em>Documentation Notes:</em> ${escapeHtml(appState.complianceAgreementDateNote)}</p>` : ''}
                ` : ''}

                <h3>Chronological Session / Weekly Breakdown</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Site &amp; Supervisor</th>
                            <th>Indiv Sup</th>
                            <th>Grp Sup</th>
                            <th>Direct Indiv</th>
                            <th>Direct Grp</th>
                            <th>Direct Fam/Oth</th>
                            <th>Total Direct</th>
                            <th>Indirect</th>
                            <th>Total Worked</th>
                            <th>Custom Categories</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entryRowsHtml || '<tr><td colspan="11">No sessions logged.</td></tr>'}
                    </tbody>
                </table>

                <div class="sig-block">
                    <div>
                        <strong>Supervisee / Clinician Attestation:</strong><br><br>
                        Signature: _________________________________________ Date: ______________
                    </div>
                    <div>
                        <strong>Approved Clinical Supervisor Attestation:</strong><br><br>
                        Signature: _________________________________________ Date: ______________
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 300);
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

    // Boot
    checkLocalCacheOnLoad();
});