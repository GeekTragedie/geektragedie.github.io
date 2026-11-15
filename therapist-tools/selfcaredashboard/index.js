$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_selfcare_dashboard_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_selfcare_cache_enabled';

    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const PROQOL_QUESTIONS = [
        // Meaning in my work (cs)
        { id: 'cs1', domain: 'cs', text: 'Helping clients still feels meaningful to me.' },
        { id: 'cs2', domain: 'cs', text: 'I end a lot of sessions feeling good about the work we did.' },
        { id: 'cs3', domain: 'cs', text: 'My work fits the kind of clinician I want to be.' },
        // Burnout / Exhaustion (BO)
        { id: 'bo1', domain: 'bo', text: 'The size of my caseload or the paperwork feels like too much.' },
        { id: 'bo2', domain: 'bo', text: 'By the end of the workday, I have little left for anything else.' },
        { id: 'bo3', domain: 'bo', text: 'It’s hard to switch off from work on evenings and days off.' },
        // Secondary Traumatic Stress / Vicarious Trauma (STS)
        { id: 'sts1', domain: 'sts', text: 'Clients’ stories stay with me after sessions end.' },
        { id: 'sts2', domain: 'sts', text: 'Images or thoughts from clients’ stories show up when I don’t want them.' },
        { id: 'sts3', domain: 'sts', text: 'I steer away from certain topics, places, or feelings because they bring clinical material to mind.' }
    ];

    const TABS = [
        { id: 'micro', name: 'Right now' },
        { id: 'wellness', name: 'Personal wellness' },
        { id: 'daily', name: 'Daily energy & pacing' },
        { id: 'caseload', name: 'Caseload & boundaries' },
        { id: 'macro', name: 'Checklists' },
        { id: 'proqol', name: 'Burnout check' }
    ];
    const PLEASE_TOTAL = 6;
    // Caseload weights, matching the labels on the page
    const WEIGHTS = { tier1: 3, tier2: 1.5, tier3: 1, intake: 0.5 };
    const BANDWIDTH_FACTOR = 1.25;
    const WORK_STATUSES = ['Clinical Day', 'Admin / Supervision Only', 'Off / Rest / Admin', 'Other'];
    const PEAK_WINDOWS = ['Morning (9am–1pm)', 'Midday (11am–3pm)', 'Afternoon/Eve (1pm–6pm)'];
    const PLACEMENTS = ['In My Peak Energy Window', 'Spread Out With Buffers', 'Stacked Back-to-Back', 'At End of Day / Low Energy'];
    const PLACEMENT_LABELS = {
        'In My Peak Energy Window': 'In my peak energy window',
        'Spread Out With Buffers': 'Spread out with buffers',
        'Stacked Back-to-Back': 'Stacked back-to-back',
        'At End of Day / Low Energy': 'At the end of the day / low energy'
    };

    function getDefaultWellness() {
        return { sleep: 6, connection: 6, joy: 6, body: 6, stress: 4, checked: [], note: '' };
    }

    function getDefaultScheduleDays() {
        // Pre-configured for a Tuesday–Friday 9am-5pm private practice rhythm (customizable!)
        return DAYS_OF_WEEK.map(day => {
            const isOff = day === 'Monday' || day === 'Saturday' || day === 'Sunday';
            return {
                day: day,
                status: isOff ? 'Off / Rest / Admin' : 'Clinical Day',
                statusOther: '',
                totalClients: isOff ? 0 : 5,
                highAcuityClients: isOff ? 0 : 1,
                maxBackToBack: isOff ? 0 : 3,
                peakEnergy: 'Morning (9am–1pm)',
                highNeedPlacement: 'In My Peak Energy Window'
            };
        });
    }

    function getDefaultMacroItems() {
        return {
            weekly: [
                { id: 'w1', text: 'Protected my full weekend / Monday off without answering non-urgent client emails or portal messages', done: false },
                { id: 'w2', text: 'Ate a real midday meal away from my clinical charting screen on workdays', done: false },
                { id: 'w3', text: 'Engaged in a hobby, special interest, or creative outlet completely unrelated to mental health (e.g., RPGs, art, fiction)', done: false },
                { id: 'w4', text: 'Connected with friends, partner, or community where I did NOT play the "therapist" role', done: false },
                { id: 'w5', text: 'Spent time outdoors in nature / daylight and moved my body gently', done: false }
            ],
            monthly: [
                { id: 'm1', text: 'Attended peer consultation group, clinical supervision, or case consultation so I am not holding heavy cases alone', done: false },
                { id: 'm2', text: 'Attended my own personal therapy, somatic bodywork, or massage appointment', done: false },
                { id: 'm3', text: 'Reviewed my caseload numbers and updated my availability status (Accepting vs. Waitlist vs. Full)', done: false },
                { id: 'm4', text: 'Completed my monthly bank reconciliation & paid myself my Owner’s Draw', done: false }
            ],
            quarterly: [
                { id: 'q1', text: 'Scheduled and took at least 1 long weekend or mental health rest days off this quarter', done: false },
                { id: 'q2', text: 'Audited my daily client schedule and moved any draining time slots to better energy windows', done: false },
                { id: 'q3', text: 'Completed quarterly business check-in, B&O/IRS estimated taxes, and CAQH 120-day re-attestation', done: false },
                { id: 'q4', text: 'Logged recent CEU courses into my CEU Tracker so they don’t pile up before renewal', done: false }
            ],
            yearly: [
                { id: 'y1', text: 'Scheduled & completed my Annual Primary Care Physical & routine bloodwork/labs', done: false },
                { id: 'y2', text: 'Scheduled & completed my Dental Cleanings (2x/year)', done: false },
                { id: 'y3', text: 'Scheduled & completed my Vision / Eye Exam (especially important for telehealth screen strain!)', done: false },
                { id: 'y4', text: 'Scheduled & completed Dermatology skin check / specialty preventative screenings', done: false },
                { id: 'y5', text: 'Blocked off my vacation weeks on my calendar at least 3–6 months in advance (and prepped my OOO Voicemail)', done: false },
                { id: 'y6', text: 'Reviewed my private pay rates, insurance fee schedules, and living-wage sustainability for the new year', done: false }
            ]
        };
    }

    let currentHorizon = 'weekly';

    let appState = {
        micro: {
            physicalEnergy: 7,
            emotionalCap: 7,
            sensoryDrain: 3,
            pleaseChecked: [],
            microResetsChecked: []
        },
        daily: {
            scheduleDays: getDefaultScheduleDays(),
            transitionChecked: [],
            customTransitionRitual: ''
        },
        caseload: {
            idealSessions: 20,
            tier1: 2,
            tier2: 10,
            tier3: 8,
            intakesMonth: 2,
            boundaryLeaks: []
        },
        wellness: getDefaultWellness(),
        ui: { tab: 'micro', hidden: [] },
        macro: getDefaultMacroItems(),
        proqol: {
            cs1: 4, cs2: 4, cs3: 4,
            bo1: 2, bo2: 2, bo3: 2,
            sts1: 2, sts2: 1, sts3: 1
        },
        journalNotes: ''
    };

    // --- 1. Check-ins (in the tool menu) and hideable tools ---
    function normalizeState() {
        const m = appState.micro || (appState.micro = {});
        // Older saves had one "PL" box; it is now separate P and L boxes
        m.pleaseChecked = (m.pleaseChecked || []).flatMap(v => (v === 'PL' ? ['P', 'L'] : [v]));
        appState.wellness = { ...getDefaultWellness(), ...(appState.wellness || {}) };
        appState.ui = { tab: 'micro', hidden: [], ...(appState.ui || {}) };
        if (!Array.isArray(appState.ui.hidden)) appState.ui.hidden = [];
        if (!TABS.some(t => t.id === appState.ui.tab)) appState.ui.tab = 'micro';
        appState.daily = appState.daily || {};
        if (!Array.isArray(appState.daily.scheduleDays)) appState.daily.scheduleDays = getDefaultScheduleDays();
        appState.daily.scheduleDays.forEach(d => { if (d.statusOther === undefined) d.statusOther = ''; });
    }

    function isHidden(key) {
        return appState.ui.hidden.includes(key);
    }

    function renderCheckins() {
        const list = $('#checkinList');
        list.empty();
        TABS.forEach(t => {
            if (isHidden(`tab:${t.id}`)) return;
            const active = appState.ui.tab === t.id;
            list.append(`<li class="checkin-item${active ? ' is-active' : ''}">
                <button type="button" class="sc-tab-link" data-tab="${t.id}" aria-pressed="${active}">${escapeHtml(t.name)}</button>
                <button type="button" class="checkin-hide" data-hide="tab:${t.id}" aria-label="Hide ${escapeAttr(t.name)}" title="Hide this check-in">Hide</button>
            </li>`);
        });
        const n = appState.ui.hidden.length;
        $('#showHiddenToolsBtn').prop('hidden', n === 0).text(`Show hidden tools (${n})`);
    }

    function applyVisibility() {
        // If the open check-in was hidden, open the first one still showing
        if (isHidden(`tab:${appState.ui.tab}`)) {
            const next = TABS.find(t => !isHidden(`tab:${t.id}`));
            appState.ui.tab = next ? next.id : appState.ui.tab;
        }
        $('.sc-tab-section').addClass('hidden');
        if (!isHidden(`tab:${appState.ui.tab}`)) $(`#sc-tab-${appState.ui.tab}`).removeClass('hidden');
        const tab = TABS.find(t => t.id === appState.ui.tab);
        const allHidden = TABS.every(t => isHidden(`tab:${t.id}`));
        $('#currentCheckinName').text(allHidden ? 'nothing (every check-in is hidden)' : tab.name);
        $('[data-tool-name]').each(function() {
            const id = this.dataset.tool;
            $(this).toggleClass('hidden', isHidden(`tool:${id}`));
            if (!$(this).children('.tool-hide-btn').length) {
                $(this).addClass('has-hide-btn').prepend(`<button type="button" class="tool-hide-btn btn-link text-xs" data-hide="tool:${id}" aria-label="Hide ${escapeAttr(this.dataset.toolName)}">Hide</button>`);
            }
        });
        renderCheckins();
    }

    $(document).on('click', '.sc-tab-link', function() {
        appState.ui.tab = $(this).data('tab');
        applyVisibility();
        saveToLocalCacheIfEnabled();
        const menu = document.querySelector('.tool-menu');
        if (menu && !window.matchMedia('(min-width: 901px)').matches) menu.open = false;
        const target = document.getElementById(`sc-tab-${appState.ui.tab}`);
        if (target && target.getBoundingClientRect().top < 0) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $(document).on('click', '[data-hide]', function() {
        const key = $(this).data('hide');
        if (!appState.ui.hidden.includes(key)) appState.ui.hidden.push(key);
        applyVisibility();
        saveToLocalCacheIfEnabled();
    });
    $('#showHiddenToolsBtn').on('click', function() {
        appState.ui.hidden = [];
        applyVisibility();
        saveToLocalCacheIfEnabled();
    });

    // Macro Horizon Sub-Tabs
    $('.macro-horizon-btn').on('click', function() {
        currentHorizon = $(this).data('horizon');
        $('.macro-horizon-btn').removeClass('btn-primary');
        $(this).addClass('btn-primary');
        renderMacroTab();
    });

    // --- 2. Render All Sections ---
    function renderAll() {
        normalizeState();
        applyVisibility();
        renderMicroTab();
        renderWellnessTab();
        renderDailyTab();
        renderCaseloadTab();
        renderMacroTab();
        renderProqolTab();
        $('#selfCareJournalNotes').val(appState.journalNotes || '');
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    }

    // TAB 1: MICRO CHECK-IN
    function renderMicroTab() {
        const m = appState.micro;
        $('#sliderPhysicalEnergy').val(m.physicalEnergy);
        $('#valPhysicalEnergy').text(`${m.physicalEnergy} / 10`);

        $('#sliderEmotionalCap').val(m.emotionalCap);
        $('#valEmotionalCap').text(`${m.emotionalCap} / 10`);

        $('#sliderSensoryDrain').val(m.sensoryDrain);
        $('#valSensoryDrain').text(`${m.sensoryDrain} / 10`);

        $('.please-cb').each(function() {
            $(this).prop('checked', (m.pleaseChecked || []).includes($(this).val()));
        });

        $('.micro-reset-cb').each(function() {
            $(this).prop('checked', (m.microResetsChecked || []).includes($(this).val()));
        });

        // Compute Battery % (Physical + Emotional + inverted Sensory Drain)
        const invertedSensory = 11 - m.sensoryDrain;
        const batteryPct = Math.round(((m.physicalEnergy + m.emotionalCap + invertedSensory) / 30) * 100);

        const callout = $('#microActionCallout');
        if (batteryPct >= 70) {
            callout.html(`
                <div class="font-bold text-green">🟢 Battery at ${batteryPct}% — Within Your Window of Tolerance</div>
                <p>Your nervous system is well-resourced right now. Keep protecting your between-session hydration and movement breaks so you finish the day strong.</p>
            `);
        } else if (batteryPct >= 45) {
            callout.html(`
                <div class="font-bold text-amber">🟡 Battery at ${batteryPct}% — Moderate Drain Detected</div>
                <p><strong>Gentle Pivot for Next Session:</strong> Lower your sensory load (dim screen brightness/lights, grab cold water or a warm drink), lean on collaborative client-led pacing rather than over-functioning, and jot only 2 bullet points after session.</p>
            `);
        } else {
            callout.html(`
                <div class="font-bold text-red">🔴 Battery at ${batteryPct}% — High Depletion / Sensory Overload</div>
                <p><strong>Immediate Care Needed:</strong> Check the DBT PLEASE boxes (have you eaten or used the restroom?). Focus purely on holding a safe, grounded container for your remaining sessions today, defer non-urgent admin to tomorrow, and do a full somatic reset at 5:00 PM.</p>
            `);
        }
    }

    // PERSONAL WELLNESS
    const WELLNESS_TIPS = {
        sleep: 'Sleep is lowest. Protect one earlier night this week, and keep your heaviest sessions out of the day after a short night.',
        connection: 'Connection is lowest. Reach out to one person you don’t hold space for at work, even with a short text.',
        joy: 'Joy and play are lowest. Put one special interest or hobby on the calendar like an appointment.',
        body: 'Body and movement are lowest. Add a short walk or stretch between sessions, or book that appointment you’ve been putting off.',
        stress: 'Stress outside work is high. Consider lightening something at work this week, and bring it to your own therapy or support.'
    };
    function renderWellnessTab() {
        const w = appState.wellness;
        const names = { sleep: 'WellSleep', connection: 'WellConnection', joy: 'WellJoy', body: 'WellBody', stress: 'WellStress' };
        Object.entries(names).forEach(([k, id]) => {
            $(`#${id.charAt(0).toLowerCase() + id.slice(1)}`).val(w[k]);
            $(`#val${id}`).text(`${w[k]} / 10`);
        });
        $('.wellness-cb').each(function() { $(this).prop('checked', (w.checked || []).includes(this.value)); });
        $('#wellnessNote').val(w.note || '');
        // Stress is reversed so 10 always means "doing well"
        const scores = { sleep: w.sleep, connection: w.connection, joy: w.joy, body: w.body, stress: 11 - w.stress };
        const pct = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 50 * 100);
        const lowest = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];
        const tone = pct >= 70 ? ['text-green', '🟢', 'Well supported'] : (pct >= 45 ? ['text-amber', '🟡', 'Running a little low'] : ['text-red', '🔴', 'Running on empty']);
        const tip = lowest[1] <= 6 ? WELLNESS_TIPS[lowest[0]] : 'Nothing is running low right now. Keep doing what’s working.';
        $('#wellnessCallout').html(`<div class="font-bold ${tone[0]}">${tone[1]} Personal wellness at ${pct}%: ${tone[2]}</div><p>${escapeHtml(tip)}</p><p class="muted">${(w.checked || []).length} of 6 “this week” items checked.</p>`);
        return pct;
    }
    $(document).on('input change', '.wellness-slider', function() {
        appState.wellness[this.dataset.key] = parseInt(this.value, 10) || 1;
        renderWellnessTab();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });
    $(document).on('change', '.wellness-cb', function() {
        appState.wellness.checked = $('.wellness-cb:checked').map(function() { return this.value; }).get();
        renderWellnessTab();
        saveToLocalCacheIfEnabled();
    });
    $('#wellnessNote').on('input', function() {
        appState.wellness.note = this.value;
        saveToLocalCacheIfEnabled();
    });

    // TAB 2: DAILY SCHEDULE & CLIENT ORDER
    function renderDailyTab() {
        const tbody = $('#scheduleAuditTableBody');
        tbody.empty();

        (appState.daily.scheduleDays || []).forEach((d, idx) => {
            const verdict = evaluateDaySustainability(d);
            const opt = (list, cur, labels) => list.map(v => `<option value="${escapeAttr(v)}" ${cur === v ? 'selected' : ''}>${escapeHtml((labels && labels[v]) || v)}</option>`).join('');
            const statusLabels = { 'Clinical Day': 'Clinical day', 'Admin / Supervision Only': 'Admin or supervision only', 'Off / Rest / Admin': 'Off / rest day', 'Other': 'Other…' };
            tbody.append(`
                <tr class="border-b schedule-day-row" data-idx="${idx}">
                    <td class="p-2" data-label="Day"><input type="text" class="day-name w-full p-1 border rounded-md text-xs font-bold" value="${escapeAttr(d.day)}" aria-label="Day name"></td>
                    <td class="p-2" data-label="Work status">
                        <select class="day-status p-1 border rounded-md text-xs" aria-label="Work status">${opt(WORK_STATUSES, d.status, statusLabels)}</select>
                        <input type="text" class="day-status-other p-1 border rounded-md text-xs mt-1 w-full ${d.status === 'Other' ? '' : 'hidden'}" placeholder="e.g., Groups only, Testing day" value="${escapeAttr(d.statusOther || '')}" aria-label="Other work status">
                    </td>
                    <td class="p-2" data-label="Total clients"><input type="number" min="0" max="15" class="day-total w-16 p-1 border rounded-md text-xs" value="${d.totalClients || 0}" aria-label="Total clients"></td>
                    <td class="p-2" data-label="Heavy sessions"><input type="number" min="0" max="15" class="day-high w-16 p-1 border rounded-md text-xs" value="${d.highAcuityClients || 0}" aria-label="Heavy sessions"></td>
                    <td class="p-2" data-label="Most back-to-back"><input type="number" min="0" max="12" class="day-b2b w-16 p-1 border rounded-md text-xs" value="${d.maxBackToBack || 0}" aria-label="Most back-to-back"></td>
                    <td class="p-2" data-label="Peak energy"><select class="day-peak p-1 border rounded-md text-xs" aria-label="Peak energy window">${opt(PEAK_WINDOWS, d.peakEnergy)}</select></td>
                    <td class="p-2" data-label="Heavy sessions are"><select class="day-placement p-1 border rounded-md text-xs" aria-label="Where heavy sessions are">${opt(PLACEMENTS, d.highNeedPlacement, PLACEMENT_LABELS)}</select></td>
                    <td class="p-2 verdict-cell" data-label="Pacing">${verdict.badgeHtml}</td>
                    <td class="p-2" data-label=""><button type="button" class="remove-day-btn btn-link text-xs" aria-label="Remove ${escapeAttr(d.day)}">Remove</button></td>
                </tr>
            `);
        });

        $('.transition-cb').each(function() {
            $(this).prop('checked', (appState.daily.transitionChecked || []).includes($(this).val()));
        });
        $('#customTransitionRitual').val(appState.daily.customTransitionRitual || '');
    }

    function evaluateDaySustainability(d) {
        const seesClients = d.status === 'Clinical Day' || d.status === 'Other';
        if (!seesClients || !d.totalClients) {
            return { status: 'rest', badgeHtml: `<span class="sc-badge badge-neutral">Rest / Admin</span>` };
        }
        const warnings = [];
        if (d.totalClients > 7) warnings.push('8+ clients');
        if (d.highAcuityClients >= 3) warnings.push('3+ heavy sessions');
        if (d.maxBackToBack >= 4) warnings.push(`${d.maxBackToBack} back-to-back without break`);
        if (d.highNeedPlacement === 'Stacked Back-to-Back' || d.highNeedPlacement === 'At End of Day / Low Energy') {
            warnings.push(`heavy sessions ${PLACEMENT_LABELS[d.highNeedPlacement].toLowerCase()}`);
        }

        if (warnings.length >= 2 || d.totalClients >= 8 || d.maxBackToBack >= 5) {
            return {
                status: 'heavy',
                badgeHtml: `<span class="sc-badge badge-red" title="${escapeAttr(warnings.join(', '))}">🔴 High Drain (${escapeHtml(warnings[0] || 'Heavy')})</span>`
            };
        } else if (warnings.length === 1) {
            return {
                status: 'caution',
                badgeHtml: `<span class="sc-badge badge-amber">🟡 Watch Pacing (${escapeHtml(warnings[0])})</span>`
            };
        }
        return {
            status: 'good',
            badgeHtml: `<span class="sc-badge badge-green">🟢 Well-Paced</span>`
        };
    }

    // TAB 3: CASELOAD ACUITY & BOUNDARIES
    function computeCaseloadLoad(c) {
        const headcount = c.tier1 + c.tier2 + c.tier3;
        const units = (c.tier1 * WEIGHTS.tier1) + (c.tier2 * WEIGHTS.tier2) + (c.tier3 * WEIGHTS.tier3) + (c.intakesMonth * WEIGHTS.intake);
        const bandwidth = Math.max(1, c.idealSessions * BANDWIDTH_FACTOR);
        return { headcount, units, bandwidth, pct: Math.round((units / bandwidth) * 100) };
    }

    function renderCaseloadTab() {
        const c = appState.caseload;
        $('#caseloadIdealSessions').val(c.idealSessions);
        $('#caseloadTier1').val(c.tier1);
        $('#caseloadTier2').val(c.tier2);
        $('#caseloadTier3').val(c.tier3);
        $('#caseloadIntakesMonth').val(c.intakesMonth);

        $('.boundary-leak-cb').each(function() {
            $(this).prop('checked', (c.boundaryLeaks || []).includes($(this).val()));
        });

        const load = computeCaseloadLoad(c);
        const rawHeadcount = load.headcount;
        const loadPct = load.pct;

        const box = $('#caseloadAnalysisBox');
        let statusTitle = '';
        let adviceText = '';

        if (loadPct <= 85) {
            statusTitle = `🟢 Sustainable Caseload Weight (${loadPct}% of Emotional Bandwidth — ${rawHeadcount} Active Clients)`;
            adviceText = `Your acuity mix is balanced. You have room to take on new intakes if desired, or enjoy the extra breathing room for creative projects and rest.`;
        } else if (loadPct <= 105) {
            statusTitle = `🟡 At Full Capacity (${loadPct}% of Emotional Bandwidth — ${rawHeadcount} Active Clients)`;
            adviceText = `Even if your headcount looks modest on paper, your Tier 1 and Tier 2 acuity weight puts you at about full capacity. Avoid squeezing in "just one more high-need intake" until an active client steps down to biweekly/maintenance.`;
        } else {
            statusTitle = `🔴 Acuity Overload (${loadPct}% of Emotional Bandwidth — ${rawHeadcount} Active Clients)`;
            adviceText = `Your caseload is carrying heavy emotional weight (${c.tier1} high-acuity crisis clients). Strongly consider pausing new intakes (use the “I’m at full capacity” reason in your Personal Referral Database email), stepping stable clients down to biweekly, and bringing Tier 1 cases to consultation.`;
        }

        const barWidth = Math.min(100, loadPct);
        const barColorClass = loadPct > 105 ? 'fill-red' : (loadPct > 85 ? 'fill-amber' : 'fill-green');

        box.html(`
            <div class="font-bold text-sm">${statusTitle}</div>
            <div class="sc-progress-track w-full rounded-md overflow-hidden my-2">
                <div class="sc-progress-fill ${barColorClass}" style="width: ${barWidth}%;"></div>
            </div>
            <p class="text-xs">${adviceText}</p>
            <p class="text-xs muted">How it’s figured: (${c.tier1} × 3) + (${c.tier2} × 1.5) + (${c.tier3} × 1) + (${c.intakesMonth} intakes × 0.5) = ${fmt(load.units)} units. Your bandwidth is your session cap plus 25% room, ${c.idealSessions} × 1.25 = ${fmt(load.bandwidth)} units. ${fmt(load.units)} ÷ ${fmt(load.bandwidth)} = ${loadPct}%.</p>
        `);
    }

    // TAB 4: MACRO TIMELINES
    function renderMacroTab() {
        const container = $('#macroChecklistContainer');
        container.empty();

        const list = (appState.macro && appState.macro[currentHorizon]) || [];
        if (list.length === 0) {
            container.append(`<p class="muted text-xs">No items in this timeline yet. Add one below!</p>`);
            return;
        }

        list.forEach(item => {
            container.append(`
                <div class="flex justify-between items-center p-2.5 border rounded-md text-sm macro-item-row" data-id="${item.id}">
                    <label class="flex items-center cursor-pointer flex-1">
                        <input type="checkbox" class="macro-item-cb mr-3" ${item.done ? 'checked' : ''}>
                        <span class="${item.done ? 'line-through muted' : ''}">${escapeHtml(item.text)}</span>
                    </label>
                    <button type="button" class="remove-macro-item-btn btn-link text-xs ml-2">Remove</button>
                </div>
            `);
        });
    }

    // Upcoming renewals from uploaded practice data (license, malpractice, CAQH every 120 days)
    function parseLocalDate(v) {
        const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    }
    function renderRenewals(data) {
        const box = $('#renewalsBox');
        const t = data && data.therapist;
        if (!t) { box.prop('hidden', true).empty(); return; }
        const items = [];
        (t.licenses || []).forEach(l => {
            const d = parseLocalDate(l.expiration);
            if (d) items.push({ what: `${l.type || 'License'}${l.state ? ` (${l.state})` : ''} renewal`, date: d });
        });
        const mal = parseLocalDate(t.malpracticeRenewal);
        if (mal) items.push({ what: 'Malpractice insurance renewal', date: mal });
        const caqh = parseLocalDate(t.caqhAttestDate);
        if (caqh) {
            const next = new Date(caqh.getFullYear(), caqh.getMonth(), caqh.getDate() + 120);
            items.push({ what: 'CAQH re-attestation (every 120 days)', date: next });
        }
        if (!items.length) { box.prop('hidden', true).empty(); return; }
        const today = new Date(); today.setHours(0, 0, 0, 0);
        items.sort((a, b) => a.date - b.date);
        const rows = items.map(i => {
            const days = Math.round((i.date - today) / 86400000);
            const when = days < 0 ? `${-days} day${days === -1 ? '' : 's'} overdue` : (days === 0 ? 'due today' : `in ${days} day${days === 1 ? '' : 's'}`);
            const cls = days < 0 ? 'text-red' : (days <= 90 ? 'text-amber' : '');
            return `<li><strong>${escapeHtml(i.what)}:</strong> ${i.date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} <span class="${cls}">(${when})</span></li>`;
        }).join('');
        box.prop('hidden', false).html(`<div class="font-bold text-sm mb-1">Upcoming renewals <span class="muted font-normal">(from your practice data)</span></div><ul class="list-disc ml-5 space-y-1">${rows}</ul>`);
    }
    if (window.TTPractice) {
        window.TTPractice.onLoad(renderRenewals);
        document.addEventListener('practicedata:forgotten', () => renderRenewals(null));
    }

    // TAB 5: PROQOL PULSE CHECK
    function renderProqolTab() {
        const container = $('#proqolQuestionsContainer');
        container.empty();

        PROQOL_QUESTIONS.forEach((q, idx) => {
            const currentVal = (appState.proqol && appState.proqol[q.id]) || 3;
            const radiosHtml = [1, 2, 3, 4, 5].map(num => {
                const labels = { 1: '1 (Never)', 2: '2 (Rarely)', 3: '3 (Sometimes)', 4: '4 (Often)', 5: '5 (Very Often)' };
                return `
                    <label class="inline-flex items-center text-xs cursor-pointer mr-3">
                        <input type="radio" name="proqol_${q.id}" class="proqol-radio mr-1" data-qid="${q.id}" value="${num}" ${currentVal === num ? 'checked' : ''}>
                        <span>${labels[num]}</span>
                    </label>
                `;
            }).join('');

            container.append(`
                <div class="p-3 border rounded-md text-sm space-y-1">
                    <div class="font-semibold">${escapeHtml(q.text)}</div>
                    <div class="pt-1 flex flex-wrap gap-2">${radiosHtml}</div>
                </div>
            `);
        });

        renderProqolResults();
    }

    function renderProqolResults() {
        const p = appState.proqol || {};
        const csScore = (p.cs1 || 3) + (p.cs2 || 3) + (p.cs3 || 3); // 3 to 15
        const boScore = (p.bo1 || 2) + (p.bo2 || 2) + (p.bo3 || 2); // 3 to 15
        const stsScore = (p.sts1 || 2) + (p.sts2 || 1) + (p.sts3 || 1); // 3 to 15

        const csKey = csScore >= 11 ? 'high' : (csScore >= 7 ? 'moderate' : 'low');
        const boKey = boScore >= 11 ? 'high' : (boScore >= 7 ? 'moderate' : 'low');
        const stsKey = stsScore >= 10 ? 'high' : (stsScore >= 6 ? 'moderate' : 'low');
        const csLevel = { high: 'High (Protective)', moderate: 'Moderate', low: 'Low' }[csKey];
        const boLevel = { high: 'High (Action Needed)', moderate: 'Moderate (Watch Pacing)', low: 'Low (Resourced)' }[boKey];
        const stsLevel = { high: 'Elevated (Seek Consultation/Support)', moderate: 'Mild/Moderate', low: 'Low' }[stsKey];
        const RECS = {
            cs: {
                high: 'Your work still feels meaningful, which protects against burnout. Notice what’s feeding that and keep it in your week.',
                moderate: 'Meaning is there but thinner. Revisit why you chose this work: a client win, a training you loved, or a population you want more of.',
                low: 'The work feels less rewarding right now. Talk it through in consultation or your own therapy, and look at whether your caseload still fits your interests and values.'
            },
            bo: {
                low: 'Your workload feels manageable. Keep protecting your breaks and your days off.',
                moderate: 'Workload is starting to wear on you. Check your schedule for back-to-back heavy sessions, trim one admin task, and protect one full day off this week.',
                high: 'Burnout is high. Pause new intakes if you can, bring it to supervision or consultation, and look at your caseload weight and schedule under the other check-ins. Your own therapy can help too.'
            },
            sts: {
                low: 'Clients’ trauma isn’t following you home much right now. Keep your end-of-day ritual going.',
                moderate: 'Some clinical material is staying with you. Strengthen your end-of-day ritual and bring the cases that stick to peer consultation.',
                high: 'Secondary traumatic stress is elevated. Get consultation on the cases that stay with you, think about lowering your trauma-heavy load for a while, and reach out to your own therapist. If intrusive images or avoidance are affecting daily life, that’s a sign to get support now.'
            }
        };

        $('#proqolResultsBox').html(`
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-center text-xs">
                <div class="p-3 border rounded-md proqol-score" data-level="${csKey}">
                    <div class="muted font-semibold">Meaning in My Work</div>
                    <div class="text-lg font-bold mt-1">${csScore} / 15 — ${csLevel}</div>
                    <div class="muted mt-1">Joy &amp; fulfillment from clinical work</div>
                </div>
                <div class="p-3 border rounded-md">
                    <div class="muted font-semibold">Burnout and Exhaustion</div>
                    <div class="text-lg font-bold mt-1">${boScore} / 15 — ${boLevel}</div>
                    <div class="muted mt-1">Workload, pacing &amp; system fatigue</div>
                </div>
                <div class="p-3 border rounded-md">
                    <div class="muted font-semibold">Secondary Traumatic Stress</div>
                    <div class="text-lg font-bold mt-1">${stsScore} / 15 — ${stsLevel}</div>
                    <div class="muted mt-1">Vicarious trauma &amp; somatic residue</div>
                </div>
            </div>
            <div class="proqol-recs text-xs space-y-1">
                <div class="font-bold text-sm">What might help</div>
                <p><strong>Meaning in my work:</strong> ${escapeHtml(RECS.cs[csKey])}</p>
                <p><strong>Burnout:</strong> ${escapeHtml(RECS.bo[boKey])}</p>
                <p><strong>Secondary traumatic stress:</strong> ${escapeHtml(RECS.sts[stsKey])}</p>
            </div>
        `);
    }

    // --- 3. Top Summary Cards Updater ---
    function updateTopSummaryCards() {
        // Card 1: Battery & PLEASE
        const m = appState.micro;
        const invertedSensory = 11 - m.sensoryDrain;
        const batteryPct = Math.round(((m.physicalEnergy + m.emotionalCap + invertedSensory) / 30) * 100);
        const batteryLabel = batteryPct >= 70 ? 'Grounded' : (batteryPct >= 45 ? 'Moderate Drain' : 'Depleted');
        $('#statCurrentBattery').text(`${batteryPct}% — ${batteryLabel}`);
        $('#statPleaseCount').text(`PLEASE basics: ${(m.pleaseChecked || []).length} / ${PLEASE_TOTAL} checked`);

        // Card 2: Schedule & Transition
        let heavyDays = 0;
        (appState.daily.scheduleDays || []).forEach(d => {
            const v = evaluateDaySustainability(d);
            if (v.status === 'heavy') heavyDays++;
        });
        $('#statScheduleScore').text(heavyDays === 0 ? '🟢 Sustainable' : `🟡 ${heavyDays} heavy day${heavyDays === 1 ? '' : 's'}`);
        $('#statTransitionCount').text(`After-work transition: ${(appState.daily.transitionChecked || []).length} / 6`);

        // Card 3: Caseload
        const c = appState.caseload;
        const load = computeCaseloadLoad(c);
        $('#statCaseloadLoad').text(`${load.headcount} clients (${load.pct}% load)`);
        const leaksCount = (c.boundaryLeaks || []).length;
        $('#statCaseloadAdvice').text(leaksCount === 0 ? 'No boundary leaks checked' : `⚠️ ${leaksCount} boundary leak${leaksCount === 1 ? '' : 's'} noted`);

        // Card 4: Macro & burnout check
        let totalMacroDone = 0;
        let totalMacroAll = 0;
        Object.values(appState.macro || {}).forEach(arr => {
            arr.forEach(item => {
                totalMacroAll++;
                if (item.done) totalMacroDone++;
            });
        });
        $('#statMacroDone').text(`${totalMacroDone} / ${totalMacroAll} habits done`);

        const p = appState.proqol || {};
        const boScore = (p.bo1 || 2) + (p.bo2 || 2) + (p.bo3 || 2);
        $('#statProqolStatus').text(`Burnout score: ${boScore} / 15`);
    }

    // --- 4. Interactive Listeners ---
    $('#sliderPhysicalEnergy, #sliderEmotionalCap, #sliderSensoryDrain').on('input change', function() {
        appState.micro.physicalEnergy = parseInt($('#sliderPhysicalEnergy').val(), 10) || 5;
        appState.micro.emotionalCap = parseInt($('#sliderEmotionalCap').val(), 10) || 5;
        appState.micro.sensoryDrain = parseInt($('#sliderSensoryDrain').val(), 10) || 5;
        renderMicroTab();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $('.please-cb').on('change', function() {
        appState.micro.pleaseChecked = $('.please-cb:checked').map(function() { return $(this).val(); }).get();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $('.micro-reset-cb').on('change', function() {
        appState.micro.microResetsChecked = $('.micro-reset-cb:checked').map(function() { return $(this).val(); }).get();
        saveToLocalCacheIfEnabled();
    });

    $(document).on('change input', '.schedule-day-row', function() {
        const idx = $(this).data('idx');
        const d = appState.daily.scheduleDays[idx];
        if (!d) return;

        d.day = $(this).find('.day-name').val();
        d.status = $(this).find('.day-status').val();
        d.statusOther = $(this).find('.day-status-other').val();
        $(this).find('.day-status-other').toggleClass('hidden', d.status !== 'Other');
        d.totalClients = parseInt($(this).find('.day-total').val(), 10) || 0;
        d.highAcuityClients = parseInt($(this).find('.day-high').val(), 10) || 0;
        d.maxBackToBack = parseInt($(this).find('.day-b2b').val(), 10) || 0;
        d.peakEnergy = $(this).find('.day-peak').val();
        d.highNeedPlacement = $(this).find('.day-placement').val();

        const verdict = evaluateDaySustainability(d);
        $(this).find('.verdict-cell').html(verdict.badgeHtml);
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $(document).on('click', '.remove-day-btn', function() {
        const idx = $(this).closest('.schedule-day-row').data('idx');
        appState.daily.scheduleDays.splice(idx, 1);
        renderDailyTab();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });
    $('#addScheduleRowBtn').on('click', function() {
        appState.daily.scheduleDays.push({ day: 'New day', status: 'Clinical Day', statusOther: '', totalClients: 0, highAcuityClients: 0, maxBackToBack: 0, peakEnergy: PEAK_WINDOWS[0], highNeedPlacement: PLACEMENTS[0] });
        renderDailyTab();
        saveToLocalCacheIfEnabled();
        $('#scheduleAuditTableBody .day-name').last().trigger('focus').trigger('select');
    });
    $('#resetScheduleBtn').on('click', function() {
        if (!confirm('Reset your schedule to a standard Tuesday–Friday week?')) return;
        appState.daily.scheduleDays = getDefaultScheduleDays();
        renderDailyTab();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    // Caseload at a Glance import: count clients by acuity and intake phase
    $('#importCaseloadBtn').on('click', () => $('#caseloadFileInput').click());
    $('#caseloadFileInput').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                const clients = parsed && Array.isArray(parsed.clients) ? parsed.clients : null;
                if (!clients) throw new Error('No clients');
                const has = (c, word) => String(c.acuity || '').toLowerCase().includes(word);
                const c = appState.caseload;
                c.tier1 = clients.filter(x => has(x, 'high')).length;
                c.tier3 = clients.filter(x => has(x, 'low')).length;
                c.tier2 = clients.length - c.tier1 - c.tier3;
                c.intakesMonth = clients.filter(x => /intake/i.test(String(x.phase || ''))).length;
                renderCaseloadTab();
                updateTopSummaryCards();
                saveToLocalCacheIfEnabled();
                $('#caseloadImportNote').text(`Imported ${clients.length} clients: ${c.tier1} high acuity (Tier 1), ${c.tier2} moderate (Tier 2), ${c.tier3} low (Tier 3), and ${c.intakesMonth} in the intake phase. Adjust the numbers if they don’t look right.`);
            } catch (err) {
                alert('That file doesn’t look like a Caseload at a Glance .json. Save one from Caseload at a Glance and try again.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('.transition-cb').on('change', function() {
        appState.daily.transitionChecked = $('.transition-cb:checked').map(function() { return $(this).val(); }).get();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $('#customTransitionRitual').on('input change', function() {
        appState.daily.customTransitionRitual = $(this).val().trim();
        saveToLocalCacheIfEnabled();
    });

    $('#caseloadIdealSessions, #caseloadTier1, #caseloadTier2, #caseloadTier3, #caseloadIntakesMonth').on('input change', function() {
        appState.caseload.idealSessions = parseInt($('#caseloadIdealSessions').val(), 10) || 20;
        appState.caseload.tier1 = parseInt($('#caseloadTier1').val(), 10) || 0;
        appState.caseload.tier2 = parseInt($('#caseloadTier2').val(), 10) || 0;
        appState.caseload.tier3 = parseInt($('#caseloadTier3').val(), 10) || 0;
        appState.caseload.intakesMonth = parseInt($('#caseloadIntakesMonth').val(), 10) || 0;
        renderCaseloadTab();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $('.boundary-leak-cb').on('change', function() {
        appState.caseload.boundaryLeaks = $('.boundary-leak-cb:checked').map(function() { return $(this).val(); }).get();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $(document).on('change', '.macro-item-cb', function() {
        const id = $(this).closest('.macro-item-row').data('id');
        const list = appState.macro[currentHorizon] || [];
        const item = list.find(i => i.id === id);
        if (item) item.done = $(this).is(':checked');
        renderMacroTab();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $(document).on('click', '.remove-macro-item-btn', function() {
        const id = $(this).closest('.macro-item-row').data('id');
        appState.macro[currentHorizon] = (appState.macro[currentHorizon] || []).filter(i => i.id !== id);
        renderMacroTab();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $('#addMacroItemBtn').on('click', function() {
        const text = $('#newMacroItemInput').val().trim();
        if (!text) return;
        appState.macro[currentHorizon].push({
            id: 'cust_' + Date.now(),
            text: text,
            done: false
        });
        $('#newMacroItemInput').val('');
        renderMacroTab();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $(document).on('change', '.proqol-radio', function() {
        const qid = $(this).data('qid');
        appState.proqol[qid] = parseInt($(this).val(), 10) || 3;
        renderProqolResults();
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
    });

    $('#selfCareJournalNotes').on('input change', function() {
        appState.journalNotes = $(this).val();
        saveToLocalCacheIfEnabled();
    });

    // --- 5. Local Cache Option ---
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
                    console.error('Error loading cached self-care dashboard:', e);
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
        if (!confirm('Reset all self-care check-ins to default? Make sure you have exported your .json backup if you want to save your current log.')) return;
        appState.micro = { physicalEnergy: 7, emotionalCap: 7, sensoryDrain: 3, pleaseChecked: [], microResetsChecked: [] };
        appState.daily = { scheduleDays: getDefaultScheduleDays(), transitionChecked: [], customTransitionRitual: '' };
        appState.caseload = { idealSessions: 20, tier1: 2, tier2: 10, tier3: 8, intakesMonth: 2, boundaryLeaks: [] };
        appState.macro = getDefaultMacroItems();
        appState.wellness = getDefaultWellness();
        appState.proqol = { cs1: 4, cs2: 4, cs3: 4, bo1: 2, bo2: 2, bo3: 2, sts1: 2, sts2: 1, sts3: 1 };
        appState.ui = { tab: 'micro', hidden: [] };
        appState.journalNotes = '';
        $('#caseloadImportNote').text('');
        localStorage.removeItem(STORAGE_KEY);
        renderAll();
    });

    // --- 6. JSON Export / Import & Printable PDF Snapshot ---
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

    $('#exportJsonButtonTop').on('click', function() {
        downloadFile(JSON.stringify(appState, null, 2), `clinician_selfcare_checkin_${localDateISO()}.json`, 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', () => $('#importJsonFile').click());

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (!parsed || typeof parsed !== 'object' || (!parsed.micro && !parsed.daily && !parsed.caseload)) throw new Error('Not a self-care file');
                Object.assign(appState, parsed);
                normalizeState();
                renderAll();
            } catch (err) {
                alert('Invalid JSON file. Please upload a valid Self-Care Dashboard .json file.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#printReflectionBtn').on('click', function() {
        const schedRows = (appState.daily.scheduleDays || []).map(d => `
            <tr>
                <td><strong>${escapeHtml(d.day)}</strong></td>
                <td>${escapeHtml(d.status === 'Other' ? (d.statusOther || 'Other') : d.status)}</td>
                <td>${d.totalClients}</td>
                <td>${d.highAcuityClients}</td>
                <td>${d.maxBackToBack}</td>
                <td>${escapeHtml(d.peakEnergy)}</td>
                <td>${escapeHtml(PLACEMENT_LABELS[d.highNeedPlacement] || d.highNeedPlacement)}</td>
            </tr>
        `).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Clinician Self-Care &amp; Sustainability Snapshot</title>
                <style>
                    @page { margin: 0.55in; }
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; font-size: 10pt; line-height: 1.45; margin: 0; }
                    h1, h2, h3 { margin: 0 0 6px 0; }
                    .top-bar { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; }
                    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
                    .box { border: 1px solid #333; padding: 8px; border-radius: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9pt; }
                    th, td { border: 1px solid #444; padding: 5px 7px; text-align: left; }
                    th { background: #eee; }
                </style>
            </head>
            <body>
                <div class="top-bar">
                    <div>
                        <h1>Clinician Self-Care, Caseload &amp; Energy Snapshot</h1>
                        <div>Personal Sustainability &amp; Work-Life Balance Check-In</div>
                    </div>
                    <div><strong>Date:</strong> ${localDateISO()}</div>
                </div>

                <div class="grid-4">
                    <div class="box"><strong>Current Battery:</strong><br>${escapeHtml($('#statCurrentBattery').text())}<br><small>${escapeHtml($('#statPleaseCount').text())}</small></div>
                    <div class="box"><strong>Schedule Pacing:</strong><br>${escapeHtml($('#statScheduleScore').text())}<br><small>${escapeHtml($('#statTransitionCount').text())}</small></div>
                    <div class="box"><strong>Caseload Load:</strong><br>${escapeHtml($('#statCaseloadLoad').text())}<br><small>${escapeHtml($('#statCaseloadAdvice').text())}</small></div>
                    <div class="box"><strong>Macro Habits:</strong><br>${escapeHtml($('#statMacroDone').text())}<br><small>${escapeHtml($('#statProqolStatus').text())}</small></div>
                </div>

                <h3>Weekly Schedule &amp; Client-Order Pacing</h3>
                <table>
                    <thead>
                        <tr><th>Day</th><th>Status</th><th>Clients</th><th>Heavy sessions</th><th>Most back-to-back</th><th>Peak window</th><th>Heavy sessions are</th></tr>
                    </thead>
                    <tbody>${schedRows}</tbody>
                </table>

                <h3>Personal Wellness</h3>
                <p>${escapeHtml($('#wellnessCallout div').first().text())}. Sleep ${appState.wellness.sleep}/10, connection ${appState.wellness.connection}/10, joy ${appState.wellness.joy}/10, body ${appState.wellness.body}/10, outside stress ${appState.wellness.stress}/10.${appState.wellness.note ? ` Want more of: ${escapeHtml(appState.wellness.note)}` : ''}</p>
                <h3>Burnout Check</h3>
                <div class="box" style="margin-bottom:14px;">${$('#proqolResultsBox .proqol-recs').html() || ''}</div>
                ${appState.daily.customTransitionRitual ? `<p><strong>After-Work Transition Ritual:</strong> ${escapeHtml(appState.daily.customTransitionRitual)}</p>` : ''}
                ${appState.journalNotes ? `<h3>Personal Action Plan &amp; Reflection Notes</h3><p style="white-space:pre-wrap;">${escapeHtml(appState.journalNotes)}</p>` : ''}
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

    function fmt(n) {
        return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
    }

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

    // Boot
    checkLocalCacheOnLoad();
});