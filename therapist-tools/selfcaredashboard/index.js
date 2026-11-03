$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_selfcare_dashboard_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_selfcare_cache_enabled';

    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const PROQOL_QUESTIONS = [
        // Compassion Satisfaction (CS)
        { id: 'cs1', domain: 'cs', text: 'I get satisfaction and meaning from being able to support and help my clients.' },
        { id: 'cs2', domain: 'cs', text: 'I feel invigorated or proud after working with clients using my clinical skills and creativity.' },
        { id: 'cs3', domain: 'cs', text: 'I feel aligned with my values and the type of clinician I am becoming.' },
        // Burnout / Exhaustion (BO)
        { id: 'bo1', domain: 'bo', text: 'I feel worn out, depleted, or overwhelmed by the size or administrative load of my caseload.' },
        { id: 'bo2', domain: 'bo', text: 'I feel trapped, bogged down, or like I have nothing left to give at the end of my workday.' },
        { id: 'bo3', domain: 'bo', text: 'I struggle to disconnect from work responsibilities during my off-hours or weekends.' },
        // Secondary Traumatic Stress / Vicarious Trauma (STS)
        { id: 'sts1', domain: 'sts', text: 'I find myself preoccupied with or carrying the emotional weight of my clients’ trauma outside of session.' },
        { id: 'sts2', domain: 'sts', text: 'I feel jumpy, on edge, or experience intrusive imagery/thoughts related to stories clients have shared.' },
        { id: 'sts3', domain: 'sts', text: 'I find myself avoiding certain topics, emotions, or activities because they remind me of frightening clinical material.' }
    ];

    function getDefaultScheduleDays() {
        // Pre-configured for a Tuesday–Friday 9am-5pm private practice rhythm (customizable!)
        return DAYS_OF_WEEK.map(day => {
            const isOff = day === 'Monday' || day === 'Saturday' || day === 'Sunday';
            return {
                day: day,
                status: isOff ? 'Off / Rest / Admin' : 'Clinical Day',
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
        macro: getDefaultMacroItems(),
        proqol: {
            cs1: 4, cs2: 4, cs3: 4,
            bo1: 2, bo2: 2, bo3: 2,
            sts1: 2, sts2: 1, sts3: 1
        },
        journalNotes: ''
    };

    // --- 1. Main Tab Navigation ---
    $('.sc-tab-btn').on('click', function() {
        const tab = $(this).data('tab');
        $('.sc-tab-btn').removeClass('btn-primary');
        $(this).addClass('btn-primary');
        $('.sc-tab-section').addClass('hidden');
        $(`#sc-tab-${tab}`).removeClass('hidden');
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
        renderMicroTab();
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
                <p><strong>Immediate Care Needed:</strong> Check the DBT PLEASE boxes on the right (have you eaten or used the restroom?). Focus purely on holding a safe, grounded container for your remaining sessions today, defer non-urgent admin to tomorrow, and do a full somatic reset at 5:00 PM.</p>
            `);
        }
    }

    // TAB 2: DAILY SCHEDULE & CLIENT ORDER
    function renderDailyTab() {
        const tbody = $('#scheduleAuditTableBody');
        tbody.empty();

        (appState.daily.scheduleDays || []).forEach((d, idx) => {
            const verdict = evaluateDaySustainability(d);
            tbody.append(`
                <tr class="border-b schedule-day-row" data-idx="${idx}">
                    <td class="p-2 font-bold">${escapeHtml(d.day)}</td>
                    <td class="p-2">
                        <select class="day-status p-1 border rounded-md text-xs">
                            <option value="Clinical Day" ${d.status === 'Clinical Day' ? 'selected' : ''}>Clinical Day</option>
                            <option value="Admin / Supervision Only" ${d.status === 'Admin / Supervision Only' ? 'selected' : ''}>Admin / Supervision Only</option>
                            <option value="Off / Rest / Admin" ${d.status === 'Off / Rest / Admin' ? 'selected' : ''}>Off / Rest Day</option>
                        </select>
                    </td>
                    <td class="p-2">
                        <input type="number" min="0" max="15" class="day-total w-16 p-1 border rounded-md text-xs" value="${d.totalClients || 0}">
                    </td>
                    <td class="p-2">
                        <input type="number" min="0" max="15" class="day-high w-16 p-1 border rounded-md text-xs" value="${d.highAcuityClients || 0}">
                    </td>
                    <td class="p-2">
                        <input type="number" min="0" max="12" class="day-b2b w-16 p-1 border rounded-md text-xs" value="${d.maxBackToBack || 0}">
                    </td>
                    <td class="p-2">
                        <select class="day-peak p-1 border rounded-md text-xs">
                            <option value="Morning (9am–1pm)" ${d.peakEnergy === 'Morning (9am–1pm)' ? 'selected' : ''}>Morning (9am–1pm)</option>
                            <option value="Midday (11am–3pm)" ${d.peakEnergy === 'Midday (11am–3pm)' ? 'selected' : ''}>Midday (11am–3pm)</option>
                            <option value="Afternoon/Eve (1pm–6pm)" ${d.peakEnergy === 'Afternoon/Eve (1pm–6pm)' ? 'selected' : ''}>Afternoon/Eve (1pm–6pm)</option>
                        </select>
                    </td>
                    <td class="p-2">
                        <select class="day-placement p-1 border rounded-md text-xs">
                            <option value="In My Peak Energy Window" ${d.highNeedPlacement === 'In My Peak Energy Window' ? 'selected' : ''}>In My Peak Energy Window</option>
                            <option value="Spread Out With Buffers" ${d.highNeedPlacement === 'Spread Out With Buffers' ? 'selected' : ''}>Spread Out With Buffers</option>
                            <option value="Stacked Back-to-Back" ${d.highNeedPlacement === 'Stacked Back-to-Back' ? 'selected' : ''}>Stacked Back-to-Back</option>
                            <option value="At End of Day / Low Energy" ${d.highNeedPlacement === 'At End of Day / Low Energy' ? 'selected' : ''}>At End of Day / Low Energy</option>
                        </select>
                    </td>
                    <td class="p-2">${verdict.badgeHtml}</td>
                </tr>
            `);
        });

        $('.transition-cb').each(function() {
            $(this).prop('checked', (appState.daily.transitionChecked || []).includes($(this).val()));
        });
        $('#customTransitionRitual').val(appState.daily.customTransitionRitual || '');
    }

    function evaluateDaySustainability(d) {
        if (d.status !== 'Clinical Day' || d.totalClients === 0) {
            return { status: 'rest', badgeHtml: `<span class="sc-badge badge-neutral">Rest / Admin</span>` };
        }
        const warnings = [];
        if (d.totalClients > 7) warnings.push('7+ clients');
        if (d.highAcuityClients >= 3) warnings.push('3+ high-acuity');
        if (d.maxBackToBack >= 4) warnings.push(`${d.maxBackToBack} back-to-back without break`);
        if (d.highNeedPlacement === 'Stacked Back-to-Back' || d.highNeedPlacement === 'At End of Day / Low Energy') {
            warnings.push(d.highNeedPlacement);
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

        const rawHeadcount = c.tier1 + c.tier2 + c.tier3;
        // Weighted units: Tier 1 = 2.5x, Tier 2 = 1.35x, Tier 3 = 1.0x + 0.5 per monthly intake
        const weightedUnits = (c.tier1 * 2.5) + (c.tier2 * 1.35) + (c.tier3 * 1.0) + (c.intakesMonth * 0.5);
        const idealCap = Math.max(1, c.idealSessions * 1.25); // Normalizing so a standard mix hits ~100% at ideal cap
        const loadPct = Math.round((weightedUnits / idealCap) * 100);

        const box = $('#caseloadAnalysisBox');
        let statusTitle = '';
        let adviceText = '';

        if (loadPct <= 85) {
            statusTitle = `🟢 Sustainable Caseload Weight (${loadPct}% of Emotional Bandwidth — ${rawHeadcount} Active Clients)`;
            adviceText = `Your acuity mix is balanced. You have room to take on new intakes if desired, or enjoy the extra breathing room for creative projects and rest.`;
        } else if (loadPct <= 105) {
            statusTitle = `🟡 At Full Capacity (${loadPct}% of Emotional Bandwidth — ${rawHeadcount} Active Clients)`;
            adviceText = `Even if your headcount looks modest on paper, your Tier 1 & Tier 2 acuity weight puts you at 100% capacity. Avoid squeezing in "just one more high-need intake" until an active client steps down to biweekly/maintenance.`;
        } else {
            statusTitle = `🔴 Acuity Overload (${loadPct}% of Emotional Bandwidth — ${rawHeadcount} Active Clients)`;
            adviceText = `Your caseload is carrying heavy emotional weight (${c.tier1} high-acuity crisis clients). Strongly consider pausing new intakes (use your Referral Database "Option A: Full Practice" email!), stepping stable clients down to biweekly, and bringing Tier 1 cases to consultation.`;
        }

        const barWidth = Math.min(100, loadPct);
        const barColorClass = loadPct > 105 ? 'fill-red' : (loadPct > 85 ? 'fill-amber' : 'fill-green');

        box.html(`
            <div class="font-bold text-sm">${statusTitle}</div>
            <div class="sc-progress-track w-full rounded-md overflow-hidden my-2">
                <div class="sc-progress-fill ${barColorClass}" style="width: ${barWidth}%;"></div>
            </div>
            <p class="text-xs">${adviceText}</p>
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
                    <div class="font-semibold">${idx + 1}. ${escapeHtml(q.text)}</div>
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

        const csLevel = csScore >= 11 ? 'High (Protective)' : (csScore >= 7 ? 'Moderate' : 'Low');
        const boLevel = boScore >= 11 ? 'High (Action Needed)' : (boScore >= 7 ? 'Moderate (Watch Pacing)' : 'Low (Resourced)');
        const stsLevel = stsScore >= 10 ? 'Elevated (Seek Consultation/Support)' : (stsScore >= 6 ? 'Mild/Moderate' : 'Low');

        $('#proqolResultsBox').html(`
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-center text-xs">
                <div class="p-3 border rounded-md">
                    <div class="muted font-semibold">Compassion Satisfaction</div>
                    <div class="text-lg font-bold mt-1">${csScore} / 15 — ${csLevel}</div>
                    <div class="muted mt-1">Joy &amp; fulfillment from clinical work</div>
                </div>
                <div class="p-3 border rounded-md">
                    <div class="muted font-semibold">Burnout / Exhaustion Load</div>
                    <div class="text-lg font-bold mt-1">${boScore} / 15 — ${boLevel}</div>
                    <div class="muted mt-1">Workload, pacing &amp; system fatigue</div>
                </div>
                <div class="p-3 border rounded-md">
                    <div class="muted font-semibold">Secondary Traumatic Stress</div>
                    <div class="text-lg font-bold mt-1">${stsScore} / 15 — ${stsLevel}</div>
                    <div class="muted mt-1">Vicarious trauma &amp; somatic residue</div>
                </div>
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
        $('#statPleaseCount').text(`PLEASE Basics: ${(m.pleaseChecked || []).length} / 5 Checked`);

        // Card 2: Schedule & Transition
        let heavyDays = 0;
        (appState.daily.scheduleDays || []).forEach(d => {
            const v = evaluateDaySustainability(d);
            if (v.status === 'heavy') heavyDays++;
        });
        $('#statScheduleScore').text(heavyDays === 0 ? '🟢 Sustainable' : `🟡 ${heavyDays} Heavy Day(s)`);
        $('#statTransitionCount').text(`After-Work Transition: ${(appState.daily.transitionChecked || []).length} / 6`);

        // Card 3: Caseload
        const c = appState.caseload;
        const rawTotal = c.tier1 + c.tier2 + c.tier3;
        const weightedUnits = (c.tier1 * 2.5) + (c.tier2 * 1.35) + (c.tier3 * 1.0) + (c.intakesMonth * 0.5);
        const idealCap = Math.max(1, c.idealSessions * 1.25);
        const loadPct = Math.round((weightedUnits / idealCap) * 100);
        $('#statCaseloadLoad').text(`${rawTotal} Clients (${loadPct}% Load)`);
        const leaksCount = (c.boundaryLeaks || []).length;
        $('#statCaseloadAdvice').text(leaksCount === 0 ? '0 Boundary Leaks Checked' : `⚠️ ${leaksCount} Boundary Leak(s) Noted`);

        // Card 4: Macro & ProQOL
        let totalMacroDone = 0;
        let totalMacroAll = 0;
        Object.values(appState.macro || {}).forEach(arr => {
            arr.forEach(item => {
                totalMacroAll++;
                if (item.done) totalMacroDone++;
            });
        });
        $('#statMacroDone').text(`${totalMacroDone} / ${totalMacroAll} Habits Done`);

        const p = appState.proqol || {};
        const boScore = (p.bo1 || 2) + (p.bo2 || 2) + (p.bo3 || 2);
        $('#statProqolStatus').text(`Burnout Score: ${boScore} / 15`);
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

        d.status = $(this).find('.day-status').val();
        d.totalClients = parseInt($(this).find('.day-total').val(), 10) || 0;
        d.highAcuityClients = parseInt($(this).find('.day-high').val(), 10) || 0;
        d.maxBackToBack = parseInt($(this).find('.day-b2b').val(), 10) || 0;
        d.peakEnergy = $(this).find('.day-peak').val();
        d.highNeedPlacement = $(this).find('.day-placement').val();

        const verdict = evaluateDaySustainability(d);
        $(this).find('td:last').html(verdict.badgeHtml);
        updateTopSummaryCards();
        saveToLocalCacheIfEnabled();
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
        appState.journalNotes = '';
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
        downloadFile(JSON.stringify(appState, null, 2), `clinician_selfcare_checkin_${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8');
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
                <td>${escapeHtml(d.status)}</td>
                <td>${d.totalClients}</td>
                <td>${d.highAcuityClients}</td>
                <td>${d.maxBackToBack}</td>
                <td>${escapeHtml(d.peakEnergy)}</td>
                <td>${escapeHtml(d.highNeedPlacement)}</td>
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
                    <div><strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</div>
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
                        <tr><th>Day</th><th>Status</th><th>Clients</th><th>High-Acuity</th><th>Max Back-to-Back</th><th>Peak Window</th><th>High-Need Placement</th></tr>
                    </thead>
                    <tbody>${schedRows}</tbody>
                </table>

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