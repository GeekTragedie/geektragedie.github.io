$(document).ready(function() {
    const MAX_ACTIVE_GOALS = 5;
    const MAX_OBJECTIVES_PER_GOAL = 5;

    let planConfig = {};
    let allDiagnosesData = { ICD: [], DSM: [] };
    let currentClassification = 'ICD';

    // Core Application State (Strictly Session-Only)
    let appState = {
        activeGoals: [],
        archivedItems: [] // Holds achieved/archived goals and objectives
    };

    // Set Default Dates (Today + 90-Day Review Date)
    const todayStr = new Date().toISOString().split('T')[0];
    $('#planDate').val(todayStr);
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + 90);
    $('#nextReviewDate').val(reviewDate.toISOString().split('T')[0]);

    // Initialize Select2 Dropdowns
    $('#diagnosisSelect').select2({
        placeholder: 'Search and select client diagnosis(es)...',
        allowClear: true,
        multiple: true,
        width: '100%'
    });

    $('#theorySelect').select2({
        placeholder: 'Select clinical theories / modalities...',
        allowClear: true,
        multiple: true,
        tags: true,
        width: '100%'
    });

    // --- 1. Load Treatment Plan Data & Shared Toolkit Diagnoses/Theories ---
    $.getJSON('treatment-plan-data.json', function(data) {
        planConfig = data || {};
        allDiagnosesData = data.fallbackDiagnoses || { ICD: [], DSM: [] };

        // Populate Plan Frameworks
        const fwSelect = $('#planFrameworkSelect');
        fwSelect.empty();
        (planConfig.frameworks || []).forEach(fw => {
            fwSelect.append(new Option(fw.name, fw.id));
        });
        fwSelect.trigger('change');

        // Populate Diagnostic Recommendation Filter Dropdown
        const recFilter = $('#dxRecFilterSelect');
        recFilter.empty();
        recFilter.append(new Option('Auto-Match Selected Diagnosis(es)', 'AUTO'));
        Object.entries(planConfig.diagnosisRecommendations || {}).forEach(([key, obj]) => {
            recFilter.append(new Option(obj.label, key));
        });

        // Populate Fallback Theories first, then try loading shared ../notegenerator/therapy_styles.json
        populateTheories(planConfig.fallbackTheories || []);
        $.getJSON('../notegenerator/therapy_styles.json', function(sharedStyles) {
            if (Array.isArray(sharedStyles) && sharedStyles.length > 0) {
                populateTheories(sharedStyles.map(s => s.name));
            }
        }).always(function() {
            // Try loading shared ../notegenerator/diagnoses.json if available
            $.getJSON('../notegenerator/diagnoses.json', function(sharedDx) {
                if (sharedDx && (sharedDx.ICD || sharedDx.DSM)) {
                    allDiagnosesData = sharedDx;
                }
            }).always(function() {
                populateDiagnosesDropdown(currentClassification);
            });
        });

        renderCitations(planConfig.citations || []);

        // Initialize with 1 Blank Active Goal
        if (appState.activeGoals.length === 0) {
            addNewActiveGoal();
        }
        renderAll();
    });

    function populateTheories(list) {
        const select = $('#theorySelect');
        select.empty();
        list.forEach(item => select.append(new Option(item, item)));
        select.trigger('change');
    }

    function populateDiagnosesDropdown(classification, selectedValues = []) {
        const select = $('#diagnosisSelect');
        select.empty();
        const list = allDiagnosesData[classification] || [];
        list.forEach(dx => {
            const label = dx.name.includes(dx.code) ? dx.name : `${dx.code} - ${dx.name}`;
            select.append(new Option(label, dx.code));
        });
        if (selectedValues.length > 0) {
            select.val(selectedValues);
        }
        select.trigger('change');
    }

    // --- 2. Framework & Diagnosis Change Handlers ---
    $('#planFrameworkSelect').on('change', function() {
        const fwId = $(this).val();
        const fw = (planConfig.frameworks || []).find(f => f.id === fwId);
        $('#planFrameworkDesc').text(fw ? fw.description : '');
    });

    $('input[name="diagnosisClassification"]').on('change', function() {
        currentClassification = $(this).val();
        populateDiagnosesDropdown(currentClassification);
    });

    $('#diagnosisSelect, #dxRecFilterSelect').on('change', function() {
        renderDiagnosisRecommendations();
    });

    // Maps any ICD/DSM code or text to one of our recommendation categories
    function inferCategoriesFromSelectedDiagnoses() {
        const manualFilter = $('#dxRecFilterSelect').val();
        if (manualFilter && manualFilter !== 'AUTO') {
            return [manualFilter];
        }

        const selectedCodes = $('#diagnosisSelect').val() || [];
        if (selectedCodes.length === 0) return [];

        const matchedCats = new Set();
        const list = allDiagnosesData[currentClassification] || [];

        selectedCodes.forEach(code => {
            const dxObj = list.find(d => d.code === code);
            if (dxObj && dxObj.category) {
                matchedCats.add(dxObj.category);
            }
            const haystack = `${code} ${dxObj ? dxObj.name : ''}`.toLowerCase();
            if (/f41|f40|300\.0|300\.2|anxiety|panic|phobia/.test(haystack)) matchedCats.add('anxiety');
            if (/f32|f33|f34|296\.2|296\.3|300\.4|depress|dysthym/.test(haystack)) matchedCats.add('depression');
            if (/f43\.1|309\.81|ptsd|post-traumatic|posttraumatic|trauma/.test(haystack)) matchedCats.add('trauma');
            if (/f43\.2|f43\.8|309\.|adjustment|grief|bereave/.test(haystack)) matchedCats.add('adjustment');
            if (/f90|314\.|adhd|attention/.test(haystack)) matchedCats.add('adhd');
            if (/f84|299\.|autis|asperger/.test(haystack)) matchedCats.add('autism');
            if (/f42|300\.3|obsessive|ocd/.test(haystack)) matchedCats.add('ocd');
            if (/f60\.3|f31|301\.83|296\.8|borderline|bipolar|cyclothym| dysregulation/.test(haystack)) matchedCats.add('emotion_regulation');
            if (/f50|307\.5|eating|anorex|bulim|binge|arfid/.test(haystack)) matchedCats.add('eating');
            if (/f10|f11|f12|f13|f14|f15|f16|f18|f19|303|304|305|alcohol|cannabis|opioid|substance|stimulant/.test(haystack)) matchedCats.add('substance');
        });

        // If a rare diagnosis code didn't match a specific keyword, show adjustment & anxiety as helpful defaults
        if (matchedCats.size === 0) {
            matchedCats.add('adjustment');
            matchedCats.add('anxiety');
        }
        return [...matchedCats];
    }

    function renderDiagnosisRecommendations() {
        const panel = $('#dxRecommendationsPanel');
        const container = $('#dxRecCardsContainer');
        container.empty();

        const cats = inferCategoriesFromSelectedDiagnoses();
        if (cats.length === 0) {
            panel.addClass('hidden');
            return;
        }

        panel.removeClass('hidden');
        const recsMap = planConfig.diagnosisRecommendations || {};

        cats.forEach(catKey => {
            const catObj = recsMap[catKey];
            if (!catObj || !Array.isArray(catObj.templates)) return;

            catObj.templates.forEach((tpl, idx) => {
                const objListHtml = (tpl.smartObjectives || []).map(o => `<li class="ml-4 list-disc">${escapeHtml(o)}</li>`).join('');
                const card = $(`
                    <div class="p-3 border rounded-md flex flex-col justify-between text-xs space-y-2">
                        <div>
                            <div class="font-bold text-sm mb-1">${escapeHtml(tpl.domain)} <span class="muted font-normal">(${escapeHtml(catObj.label)})</span></div>
                            <p class="mb-1"><strong>Broad Goal:</strong> ${escapeHtml(tpl.broadGoal)}</p>
                            <div class="mb-1"><strong>Suggested SMART Objectives:</strong><ul>${objListHtml}</ul></div>
                        </div>
                        <div class="pt-2 border-t flex justify-end">
                            <button type="button" class="btn btn-primary px-3 py-1 text-xs font-semibold rounded-md insert-rec-goal-btn" data-cat="${catKey}" data-idx="${idx}">
                                + Add as New Active Goal
                            </button>
                        </div>
                    </div>
                `);
                container.append(card);
            });
        });
    }

    $(document).on('click', '.insert-rec-goal-btn', function() {
        const catKey = $(this).data('cat');
        const idx = $(this).data('idx');
        const tpl = planConfig.diagnosisRecommendations?.[catKey]?.templates?.[idx];
        if (!tpl) return;

        // If first goal is completely blank, overwrite it; otherwise add a new goal (up to 5)
        const firstGoal = appState.activeGoals[0];
        if (
            appState.activeGoals.length === 1 &&
            !firstGoal.broadGoal.trim() &&
            firstGoal.objectives.length === 1 &&
            !firstGoal.objectives[0].text.trim()
        ) {
            firstGoal.domain = tpl.domain;
            firstGoal.broadGoal = tpl.broadGoal;
            firstGoal.interventions = [...(tpl.interventions || [])];
            firstGoal.objectives = (tpl.smartObjectives || []).slice(0, MAX_OBJECTIVES_PER_GOAL).map(oText => createObjectiveObject(oText));
            renderAll();
            return;
        }

        if (appState.activeGoals.length >= MAX_ACTIVE_GOALS) {
            alert(`You already have the maximum of ${MAX_ACTIVE_GOALS} Active Goals. Archive/complete an existing goal first or edit one of your current goals.`);
            return;
        }

        appState.activeGoals.push({
            id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            domain: tpl.domain || '',
            broadGoal: tpl.broadGoal || '',
            targetDate: $('#nextReviewDate').val(),
            interventions: [...(tpl.interventions || [])],
            customInterventions: '',
            objectives: (tpl.smartObjectives || []).slice(0, MAX_OBJECTIVES_PER_GOAL).map(oText => createObjectiveObject(oText))
        });
        renderAll();
    });

    // --- 3. Active Goals & SMART Objectives Management (Max 5 Goals x Max 5 Objectives) ---
    function createObjectiveObject(text = '') {
        return {
            id: 'obj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            text: text,
            targetDate: $('#nextReviewDate').val() || '',
            progressStatus: 'In Progress / Baseline',
            showSmartHelper: false,
            smartParts: {
                specificBehavior: '',
                measurableFreq: 'at least 3 times per week',
                achievableSupport: 'using skills practiced in session',
                relevantNeed: 'to improve daily regulation and functioning',
                timeBound: 'Within 90 days'
            }
        };
    }

    function addNewActiveGoal() {
        if (appState.activeGoals.length >= MAX_ACTIVE_GOALS) {
            alert(`Maximum of ${MAX_ACTIVE_GOALS} Active Goals reached. Mark an existing goal as Achieved/Archived to add a new active goal.`);
            return;
        }
        appState.activeGoals.push({
            id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            domain: '',
            broadGoal: '',
            targetDate: $('#nextReviewDate').val() || '',
            interventions: [],
            customInterventions: '',
            objectives: [createObjectiveObject('')]
        });
    }

    $('#addActiveGoalBtn').on('click', function() {
        addNewActiveGoal();
        renderAll();
    });

    // Evaluate whether an objective statement has S-M-A-R-T elements
    function evaluateSmartCriteria(text) {
        const t = (text || '').toLowerCase();
        return {
            S: t.length > 20 && /(client will|identify|practice|utilize|engage|complete|communicate|reduce|increase|implement)/.test(t),
            M: /(\d+|%|times|days|week|month|daily|weekly|rating|scale|out of|fewer|more than)/.test(t),
            A: /(session|skill|strategy|support|accommodation|tool|hierarchy|journal|practiced|collaborat)/.test(t) || t.length > 35,
            R: /(to reduce|to increase|to improve|to support|functioning|anxiety|mood|safety|regulation|distress|burnout|sleep|relationship)/.test(t) || t.length > 45,
            T: /(within|by |days|weeks|months|90|60|30|date|review|consecutiv)/.test(t)
        };
    }

    function renderActiveGoals() {
        $('#activeGoalsCount').text(appState.activeGoals.length);
        $('#addActiveGoalBtn').prop('disabled', appState.activeGoals.length >= MAX_ACTIVE_GOALS);

        const container = $('#activeGoalsContainer');
        container.empty();

        if (appState.activeGoals.length === 0) {
            container.append(`
                <div class="subpanel p-6 rounded-md text-center muted">
                    No active goals right now. Click <strong>+ Add Active Goal</strong> above or select a diagnosis recommendation.
                </div>
            `);
            return;
        }

        const interventionsPresetList = planConfig.interventionsLibrary || [];

        appState.activeGoals.forEach((goal, gIdx) => {
            const objCount = (goal.objectives || []).length;

            // Build Objectives HTML for this Goal
            const objectivesHtml = (goal.objectives || []).map((obj, oIdx) => {
                const smartEval = evaluateSmartCriteria(obj.text);
                const badgesHtml = ['S', 'M', 'A', 'R', 'T'].map(letter => {
                    const passed = smartEval[letter];
                    return `<span class="smart-badge ${passed ? 'smart-pass' : 'smart-miss'}" title="${passed ? 'Detected' : 'Add details to strengthen this SMART element'}">${letter}</span>`;
                }).join('');

                return `
                    <div class="objective-card p-3 border rounded-md space-y-2" data-goal-id="${goal.id}" data-obj-id="${obj.id}">
                        <div class="flex flex-wrap justify-between items-center gap-2">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-xs">Objective ${gIdx + 1}.${oIdx + 1}</span>
                                <div class="inline-flex items-center gap-1" aria-label="SMART Criteria Check">${badgesHtml}</div>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <button type="button" class="btn-link text-xs toggle-smart-helper-btn">
                                    ${obj.showSmartHelper ? 'Hide SMART Builder' : 'Help Make It SMART'}
                                </button>
                                <button type="button" class="btn-link text-xs archive-obj-btn" title="Move this objective to Achieved/Archived log">
                                    Mark Achieved / Archive
                                </button>
                                <button type="button" class="btn-link text-xs delete-obj-btn">Remove</button>
                            </div>
                        </div>

                        <!-- Interactive SMART Sentence Builder (Collapsible) -->
                        <div class="smart-helper-box p-3 border rounded-md space-y-2 ${obj.showSmartHelper ? '' : 'hidden'}">
                            <div class="text-xs font-bold">Interactive SMART Objective Builder (Fill fields &amp; click "Build SMART Statement"):</div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                <div>
                                    <label class="block font-semibold mb-1"><strong>T</strong>ime-Bound Frame:</label>
                                    <input type="text" class="sm-time w-full p-1.5 border rounded-md" placeholder="e.g., Within 90 days" value="${escapeAttr(obj.smartParts?.timeBound || 'Within 90 days')}">
                                </div>
                                <div>
                                    <label class="block font-semibold mb-1"><strong>S</strong>pecific Client Action:</label>
                                    <input type="text" class="sm-spec w-full p-1.5 border rounded-md" placeholder="e.g., practice 2 sensory grounding skills" value="${escapeAttr(obj.smartParts?.specificBehavior || '')}">
                                </div>
                                <div>
                                    <label class="block font-semibold mb-1"><strong>M</strong>easurable Frequency:</label>
                                    <input type="text" class="sm-meas w-full p-1.5 border rounded-md" placeholder="e.g., at least 4 times per week" value="${escapeAttr(obj.smartParts?.measurableFreq || 'at least 3 times per week')}">
                                </div>
                                <div>
                                    <label class="block font-semibold mb-1"><strong>A</strong>chievable Context/Tool:</label>
                                    <input type="text" class="sm-ach w-full p-1.5 border rounded-md" placeholder="e.g., using their regulation plan" value="${escapeAttr(obj.smartParts?.achievableSupport || 'using skills practiced in session')}">
                                </div>
                                <div>
                                    <label class="block font-semibold mb-1"><strong>R</strong>elevant Clinical Outcome:</label>
                                    <input type="text" class="sm-rel w-full p-1.5 border rounded-md" placeholder="e.g., to reduce panic episodes to <=1/wk" value="${escapeAttr(obj.smartParts?.relevantNeed || 'to improve daily regulation and functioning')}">
                                </div>
                            </div>
                            <div class="flex justify-end">
                                <button type="button" class="btn btn-primary px-3 py-1 text-xs font-semibold rounded-md apply-smart-builder-btn">
                                    Build &amp; Insert SMART Objective Statement
                                </button>
                            </div>
                        </div>

                        <textarea rows="2" class="obj-text-input w-full p-2 border rounded-md text-sm" placeholder="e.g., Within 90 days, client will identify 3 early somatic signs of overwhelm and utilize 1 grounding strategy at least 4 times per week...">${escapeHtml(obj.text)}</textarea>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div class="flex items-center gap-2">
                                <label class="font-semibold whitespace-nowrap">Target Date:</label>
                                <input type="date" class="obj-target-date p-1 border rounded-md w-full" value="${escapeAttr(obj.targetDate)}">
                            </div>
                            <div class="flex items-center gap-2">
                                <label class="font-semibold whitespace-nowrap">Current Progress:</label>
                                <select class="obj-progress-select p-1 border rounded-md w-full">
                                    <option value="In Progress / Baseline" ${obj.progressStatus === 'In Progress / Baseline' ? 'selected' : ''}>In Progress / Baseline</option>
                                    <option value="Making Steady Progress" ${obj.progressStatus === 'Making Steady Progress' ? 'selected' : ''}>Making Steady Progress</option>
                                    <option value="Near Completion" ${obj.progressStatus === 'Near Completion' ? 'selected' : ''}>Near Completion</option>
                                    <option value="Needs Modification / Barrier Identified" ${obj.progressStatus === 'Needs Modification / Barrier Identified' ? 'selected' : ''}>Needs Modification / Barrier</option>
                                </select>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Build Interventions Checkboxes for this Goal
            const interventionsHtml = interventionsPresetList.map(intText => {
                const isChecked = (goal.interventions || []).includes(intText) ? 'checked' : '';
                return `
                    <label class="inline-flex items-start text-xs cursor-pointer">
                        <input type="checkbox" class="goal-intervention-cb mt-0.5 mr-2" value="${escapeAttr(intText)}" ${isChecked}>
                        <span>${escapeHtml(intText)}</span>
                    </label>
                `;
            }).join('');

            const goalCard = $(`
                <div class="subpanel p-5 rounded-md border goal-card space-y-4" data-goal-id="${goal.id}">
                    <div class="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
                        <div class="flex items-center gap-2">
                            <span class="goal-number-badge font-bold text-base">Active Goal #${gIdx + 1}</span>
                            <span class="muted text-xs">(Objectives: ${objCount} / ${MAX_OBJECTIVES_PER_GOAL})</span>
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <button type="button" class="btn-link text-xs font-semibold archive-goal-btn">
                                Mark Entire Goal Achieved / Archive
                            </button>
                            <button type="button" class="btn-link text-xs delete-goal-btn">Delete Goal</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="md:col-span-2">
                            <label class="block text-xs font-semibold mb-1">Clinical Domain / Focus Area:</label>
                            <input type="text" class="goal-domain-input w-full p-2 border rounded-md text-sm" placeholder="e.g., Trauma Stabilization, Sensory Regulation, Anxiety Reduction" value="${escapeAttr(goal.domain)}">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold mb-1">Goal Target Date:</label>
                            <input type="date" class="goal-target-date w-full p-2 border rounded-md text-sm" value="${escapeAttr(goal.targetDate)}">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold mb-1">Broad Long-Term Goal Statement (Client's Overarching Outcome):</label>
                        <textarea rows="2" class="goal-broad-input w-full p-2 border rounded-md text-sm" placeholder="e.g., Reduce frequency and intensity of panic/overwhelm while building sustainable nervous system regulation...">${escapeHtml(goal.broadGoal)}</textarea>
                    </div>

                    <!-- SMART Objectives Section (Up to 5) -->
                    <div class="space-y-3 pt-2 border-t">
                        <div class="flex flex-wrap justify-between items-center">
                            <h3 class="text-sm font-bold">Measurable SMART Objectives (${objCount} / ${MAX_OBJECTIVES_PER_GOAL})</h3>
                            <button type="button" class="btn px-3 py-1 text-xs font-semibold rounded-md add-objective-btn" ${objCount >= MAX_OBJECTIVES_PER_GOAL ? 'disabled' : ''}>
                                + Add Objective to Goal #${gIdx + 1} (Max 5)
                            </button>
                        </div>
                        <div class="space-y-3">${objectivesHtml}</div>
                    </div>

                    <!-- Therapeutic Interventions for this Goal -->
                    <div class="space-y-2 pt-3 border-t">
                        <h3 class="text-sm font-bold">Clinical Interventions for Goal #${gIdx + 1}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            ${interventionsHtml}
                        </div>
                        <div class="pt-1">
                            <input type="text" class="goal-custom-interventions w-full p-2 border rounded-md text-xs" placeholder="Additional personalized interventions for this goal..." value="${escapeAttr(goal.customInterventions || '')}">
                        </div>
                    </div>
                </div>
            `);

            container.append(goalCard);
        });
    }

    // --- 4. Render Achieved / Archived Goals & Objectives ---
    function renderArchivedItems() {
        $('#archivedCountBadge').text(appState.archivedItems.length);
        const container = $('#archivedItemsContainer');
        container.empty();

        if (appState.archivedItems.length === 0) {
            container.append(`
                <p class="muted text-xs text-center p-3">
                    No achieved or archived goals/objectives yet. When a client completes an active goal or objective above, click <strong>Mark Achieved / Archive</strong> to log it here!
                </p>
            `);
            return;
        }

        appState.archivedItems.forEach(item => {
            container.append(`
                <div class="p-3 border rounded-md archived-card flex flex-wrap md:flex-nowrap justify-between items-start gap-3 text-xs" data-archive-id="${item.id}">
                    <div class="flex-1 space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="archive-badge">${escapeHtml(item.type || 'Achieved Goal')}</span>
                            <input type="text" class="arch-domain font-bold p-1 border rounded-md" placeholder="Domain / Title" value="${escapeAttr(item.domain || '')}">
                            <label class="font-semibold">Date Achieved:</label>
                            <input type="date" class="arch-date p-1 border rounded-md" value="${escapeAttr(item.dateAchieved || todayStr)}">
                            <select class="arch-outcome p-1 border rounded-md">
                                <option value="Achieved / Completed" ${item.outcome === 'Achieved / Completed' ? 'selected' : ''}>Achieved / Completed</option>
                                <option value="Partially Achieved / Step-Down" ${item.outcome === 'Partially Achieved / Step-Down' ? 'selected' : ''}>Partially Achieved / Step-Down</option>
                                <option value="Discontinued / Reframed" ${item.outcome === 'Discontinued / Reframed' ? 'selected' : ''}>Discontinued / Reframed</option>
                            </select>
                        </div>
                        <textarea rows="2" class="arch-summary w-full p-2 border rounded-md text-xs">${escapeHtml(item.summary || '')}</textarea>
                    </div>
                    <div class="flex flex-col gap-1 whitespace-nowrap">
                        <button type="button" class="btn-link text-xs restore-archive-btn">↩ Restore to Active</button>
                        <button type="button" class="btn-link text-xs delete-archive-btn">Delete</button>
                    </div>
                </div>
            `);
        });
    }

    function renderAll() {
        renderActiveGoals();
        renderArchivedItems();
        renderDiagnosisRecommendations();
    }

    // --- 5. Delegated Event Handlers for Active Goals, SMART Helpers & Archive ---
    function findGoal(goalId) {
        return appState.activeGoals.find(g => g.id === goalId);
    }

    function findObjective(goalId, objId) {
        const g = findGoal(goalId);
        if (!g) return null;
        return (g.objectives || []).find(o => o.id === objId);
    }

    // Sync Goal Text Inputs
    $(document).on('input change', '.goal-domain-input, .goal-target-date, .goal-broad-input, .goal-custom-interventions, .goal-intervention-cb', function() {
        const card = $(this).closest('.goal-card');
        const goalId = card.data('goal-id');
        const goal = findGoal(goalId);
        if (!goal) return;

        goal.domain = card.find('.goal-domain-input').val();
        goal.targetDate = card.find('.goal-target-date').val();
        goal.broadGoal = card.find('.goal-broad-input').val();
        goal.customInterventions = card.find('.goal-custom-interventions').val();
        goal.interventions = card.find('.goal-intervention-cb:checked').map(function() { return $(this).val(); }).get();
    });

    // Sync Objective Inputs & Update Live SMART Badges
    $(document).on('input change', '.obj-text-input, .obj-target-date, .obj-progress-select', function() {
        const objCard = $(this).closest('.objective-card');
        const goalId = objCard.data('goal-id');
        const objId = objCard.data('obj-id');
        const obj = findObjective(goalId, objId);
        if (!obj) return;

        obj.text = objCard.find('.obj-text-input').val();
        obj.targetDate = objCard.find('.obj-target-date').val();
        obj.progressStatus = objCard.find('.obj-progress-select').val();

        // Update SMART badges in place without losing cursor focus
        const smartEval = evaluateSmartCriteria(obj.text);
        objCard.find('.smart-badge').each(function() {
            const letter = $(this).text().trim();
            if (smartEval[letter]) {
                $(this).removeClass('smart-miss').addClass('smart-pass');
            } else {
                $(this).removeClass('smart-pass').addClass('smart-miss');
            }
        });
    });

    // Toggle SMART Helper Panel
    $(document).on('click', '.toggle-smart-helper-btn', function() {
        const objCard = $(this).closest('.objective-card');
        const obj = findObjective(objCard.data('goal-id'), objCard.data('obj-id'));
        if (!obj) return;
        obj.showSmartHelper = !obj.showSmartHelper;
        renderActiveGoals();
    });

    // Build SMART Statement from the 5 Helper Inputs
    $(document).on('click', '.apply-smart-builder-btn', function() {
        const objCard = $(this).closest('.objective-card');
        const obj = findObjective(objCard.data('goal-id'), objCard.data('obj-id'));
        if (!obj) return;

        const timeBound = objCard.find('.sm-time').val().trim() || 'Within 90 days';
        const specificBehavior = objCard.find('.sm-spec').val().trim() || 'utilize 2 personalized regulation strategies';
        const measurableFreq = objCard.find('.sm-meas').val().trim() || 'at least 3 times per week';
        const achievableSupport = objCard.find('.sm-ach').val().trim() || 'using skills practiced in session';
        const relevantNeed = objCard.find('.sm-rel').val().trim() || 'to improve daily functioning and reduce symptom distress';

        obj.smartParts = { timeBound, specificBehavior, measurableFreq, achievableSupport, relevantNeed };
        obj.text = `${timeBound}, client will ${specificBehavior} ${measurableFreq} ${achievableSupport} ${relevantNeed}.`;
        obj.showSmartHelper = false;
        renderActiveGoals();
    });

    // Add Objective to Goal (Max 5)
    $(document).on('click', '.add-objective-btn', function() {
        const goalId = $(this).closest('.goal-card').data('goal-id');
        const goal = findGoal(goalId);
        if (!goal) return;
        if (goal.objectives.length >= MAX_OBJECTIVES_PER_GOAL) {
            alert(`Each Goal can have up to ${MAX_OBJECTIVES_PER_GOAL} Active Objectives.`);
            return;
        }
        goal.objectives.push(createObjectiveObject(''));
        renderActiveGoals();
    });

    // Delete Objective
    $(document).on('click', '.delete-obj-btn', function() {
        const objCard = $(this).closest('.objective-card');
        const goal = findGoal(objCard.data('goal-id'));
        if (!goal) return;
        goal.objectives = goal.objectives.filter(o => o.id !== objCard.data('obj-id'));
        if (goal.objectives.length === 0) {
            goal.objectives.push(createObjectiveObject(''));
        }
        renderActiveGoals();
    });

    // Archive Single Objective
    $(document).on('click', '.archive-obj-btn', function() {
        const objCard = $(this).closest('.objective-card');
        const goal = findGoal(objCard.data('goal-id'));
        const obj = findObjective(objCard.data('goal-id'), objCard.data('obj-id'));
        if (!goal || !obj) return;

        appState.archivedItems.unshift({
            id: 'arch_' + Date.now(),
            type: 'Achieved Objective',
            domain: goal.domain || 'Clinical Objective',
            dateAchieved: new Date().toISOString().split('T')[0],
            outcome: 'Achieved / Completed',
            summary: obj.text || 'Completed clinical objective.'
        });

        goal.objectives = goal.objectives.filter(o => o.id !== obj.id);
        if (goal.objectives.length === 0) {
            goal.objectives.push(createObjectiveObject(''));
        }
        renderAll();
    });

    // Archive Entire Goal
    $(document).on('click', '.archive-goal-btn', function() {
        const goalId = $(this).closest('.goal-card').data('goal-id');
        const goal = findGoal(goalId);
        if (!goal) return;

        const objSummary = (goal.objectives || [])
            .map(o => o.text)
            .filter(Boolean)
            .join(' | ');

        appState.archivedItems.unshift({
            id: 'arch_' + Date.now(),
            type: 'Achieved Goal',
            domain: goal.domain || 'Treatment Goal',
            dateAchieved: new Date().toISOString().split('T')[0],
            outcome: 'Achieved / Completed',
            summary: `Goal: ${goal.broadGoal || 'N/A'}${objSummary ? '\nCompleted Objectives: ' + objSummary : ''}`
        });

        appState.activeGoals = appState.activeGoals.filter(g => g.id !== goalId);
        renderAll();
    });

    // Delete Goal
    $(document).on('click', '.delete-goal-btn', function() {
        const goalId = $(this).closest('.goal-card').data('goal-id');
        if (!confirm('Remove this goal from the treatment plan?')) return;
        appState.activeGoals = appState.activeGoals.filter(g => g.id !== goalId);
        renderAll();
    });

    // Archive Edits, Manual Add & Restore
    $('#addManualArchiveBtn').on('click', function() {
        appState.archivedItems.unshift({
            id: 'arch_' + Date.now(),
            type: 'Achieved Goal',
            domain: 'Prior Treatment Goal',
            dateAchieved: new Date().toISOString().split('T')[0],
            outcome: 'Achieved / Completed',
            summary: ''
        });
        renderArchivedItems();
    });

    $(document).on('input change', '.archived-card input, .archived-card select, .archived-card textarea', function() {
        const card = $(this).closest('.archived-card');
        const id = card.data('archive-id');
        const item = appState.archivedItems.find(a => a.id === id);
        if (!item) return;

        item.domain = card.find('.arch-domain').val();
        item.dateAchieved = card.find('.arch-date').val();
        item.outcome = card.find('.arch-outcome').val();
        item.summary = card.find('.arch-summary').val();
    });

    $(document).on('click', '.restore-archive-btn', function() {
        const id = $(this).closest('.archived-card').data('archive-id');
        const item = appState.archivedItems.find(a => a.id === id);
        if (!item) return;

        if (appState.activeGoals.length >= MAX_ACTIVE_GOALS) {
            alert(`You already have ${MAX_ACTIVE_GOALS} Active Goals. Complete or remove an active goal before restoring.`);
            return;
        }

        appState.activeGoals.push({
            id: 'goal_' + Date.now(),
            domain: item.domain || 'Restored Goal',
            broadGoal: item.summary || '',
            targetDate: $('#nextReviewDate').val(),
            interventions: [],
            customInterventions: '',
            objectives: [createObjectiveObject(item.summary || '')]
        });

        appState.archivedItems = appState.archivedItems.filter(a => a.id !== id);
        renderAll();
    });

    $(document).on('click', '.delete-archive-btn', function() {
        const id = $(this).closest('.archived-card').data('archive-id');
        appState.archivedItems = appState.archivedItems.filter(a => a.id !== id);
        renderArchivedItems();
    });

    // --- 6. Collect Full State & Render Preview / Print / Export ---
    function collectFullPlanState() {
        const selectedDxCodes = $('#diagnosisSelect').val() || [];
        const dxList = allDiagnosesData[currentClassification] || [];
        const formattedDiagnoses = selectedDxCodes.map(code => {
            const found = dxList.find(d => d.code === code);
            if (!found) return code;
            return found.name.includes(found.code) ? found.name : `${found.code} - ${found.name}`;
        });

        return {
            framework: $('#planFrameworkSelect').val(),
            frameworkName: $('#planFrameworkSelect option:selected').text(),
            planStatus: $('#planStatusSelect').val(),
            clientName: $('#clientName').val().trim(),
            planDate: $('#planDate').val(),
            nextReviewDate: $('#nextReviewDate').val(),
            sessionFrequency: $('#sessionFrequency').val().trim(),
            clientStrengths: $('#clientStrengths').val().trim(),
            clinicianNameCreds: $('#clinicianNameCreds').val().trim(),
            diagnosisClassification: currentClassification,
            diagnosisCodes: selectedDxCodes,
            formattedDiagnoses: formattedDiagnoses,
            theories: $('#theorySelect').val() || [],
            medicalNecessityNote: $('#medicalNecessityNote').val().trim(),
            activeGoals: appState.activeGoals,
            archivedItems: appState.archivedItems,
            dischargeCriteria: $('#dischargeCriteria').val().trim(),
            clientParticipationNote: $('#clientParticipationNote').val().trim()
        };
    }

    function buildTreatmentPlanHtml(state) {
        const dxText = state.formattedDiagnoses.length > 0
            ? state.formattedDiagnoses.map(d => escapeHtml(d)).join('<br>')
            : 'None specified';

        const theoriesText = state.theories.length > 0
            ? escapeHtml(state.theories.join(', '))
            : 'Integrative / Person-Centered';

        const goalsHtml = (state.activeGoals || []).map((g, idx) => {
            const objsHtml = (g.objectives || []).map((o, oIdx) => `
                <li>
                    <strong>Objective ${idx + 1}.${oIdx + 1}:</strong> ${escapeHtml(o.text || '—')}
                    <br><small><em>Target Date:</em> ${escapeHtml(o.targetDate || '—')} &nbsp;|&nbsp; <em>Status:</em> ${escapeHtml(o.progressStatus || 'In Progress')}</small>
                </li>
            `).join('');

            const allInts = [...(g.interventions || [])];
            if (g.customInterventions) allInts.push(g.customInterventions);
            const intsHtml = allInts.length > 0
                ? `<ul>${allInts.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
                : '<p>Standard therapeutic support and clinical check-ins.</p>';

            return `
                <div class="tp-goal-box">
                    <div class="tp-goal-header">
                        <strong>ACTIVE GOAL #${idx + 1}: ${escapeHtml(g.domain || 'Clinical Treatment Goal')}</strong>
                        <span>Target Date: ${escapeHtml(g.targetDate || state.nextReviewDate || '—')}</span>
                    </div>
                    <p><strong>Broad Goal:</strong> ${escapeHtml(g.broadGoal || '—')}</p>
                    <div class="tp-sub">
                        <strong>Measurable SMART Objectives:</strong>
                        <ol>${objsHtml}</ol>
                    </div>
                    <div class="tp-sub">
                        <strong>Planned Therapeutic Interventions:</strong>
                        ${intsHtml}
                    </div>
                </div>
            `;
        }).join('');

        const archivedHtml = (state.archivedItems && state.archivedItems.length > 0)
            ? `
                <div class="tp-section">
                    <h3>Achieved &amp; Archived Treatment Goals / Objectives</h3>
                    <ul>
                        ${state.archivedItems.map(a => `
                            <li>
                                <strong>[${escapeHtml(a.outcome)} — ${escapeHtml(a.dateAchieved)}] ${escapeHtml(a.domain)}:</strong>
                                ${escapeHtml(a.summary)}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `
            : '';

        return `
            <div class="tp-document">
                <div class="tp-header">
                    <h2>${escapeHtml(state.planStatus)}</h2>
                    <div>${escapeHtml(state.frameworkName)}</div>
                </div>

                <div class="tp-meta-grid">
                    <div><strong>Client:</strong> ${escapeHtml(state.clientName || '________________________')}</div>
                    <div><strong>Plan Date:</strong> ${escapeHtml(state.planDate || '—')}</div>
                    <div><strong>Next Review Date:</strong> ${escapeHtml(state.nextReviewDate || '—')}</div>
                    <div><strong>Clinician:</strong> ${escapeHtml(state.clinicianNameCreds || '________________________')}</div>
                    <div><strong>Frequency / Modality:</strong> ${escapeHtml(state.sessionFrequency || '—')}</div>
                    <div><strong>Therapeutic Modalities:</strong> ${theoriesText}</div>
                </div>

                <div class="tp-section">
                    <h3>Diagnostic Impressions (${escapeHtml(state.diagnosisClassification)}) &amp; Medical Necessity</h3>
                    <p><strong>Diagnosis(es):</strong><br>${dxText}</p>
                    ${state.medicalNecessityNote ? `<p><strong>Presenting Problem &amp; Functional Impact:</strong> ${escapeHtml(state.medicalNecessityNote)}</p>` : ''}
                    ${state.clientStrengths ? `<p><strong>Client Strengths &amp; Protective Factors:</strong> ${escapeHtml(state.clientStrengths)}</p>` : ''}
                </div>

                <div class="tp-section">
                    <h3>Active Goals, SMART Objectives &amp; Clinical Interventions</h3>
                    ${goalsHtml || '<p>No active goals entered.</p>'}
                </div>

                ${archivedHtml}

                <div class="tp-section">
                    <h3>Discharge / Step-Down Criteria &amp; Collaboration</h3>
                    <p><strong>Discharge Criteria:</strong> ${escapeHtml(state.dischargeCriteria)}</p>
                    <p><strong>Client Agreement:</strong> ${escapeHtml(state.clientParticipationNote)}</p>
                </div>

                <div class="tp-signatures">
                    <div>Client / Guardian Signature: ______________________________________ Date: ______________</div>
                    <div>Clinician Signature: ______________________________________________ Date: ______________</div>
                </div>
            </div>
        `;
    }

    function buildTreatmentPlanPlainText(state) {
        const lines = [];
        lines.push(`${state.planStatus.toUpperCase()} (${state.frameworkName})`);
        lines.push('='.repeat(65));
        lines.push(`Client: ${state.clientName || 'N/A'} | Date: ${state.planDate} | Next Review: ${state.nextReviewDate}`);
        lines.push(`Clinician: ${state.clinicianNameCreds || 'N/A'} | Frequency: ${state.sessionFrequency}`);
        lines.push(`Diagnosis (${state.diagnosisClassification}): ${state.formattedDiagnoses.join('; ') || 'Unspecified'}`);
        lines.push(`Clinical Modalities: ${state.theories.join(', ') || 'Integrative'}`);
        if (state.medicalNecessityNote) lines.push(`Medical Necessity / Functional Impact: ${state.medicalNecessityNote}`);
        if (state.clientStrengths) lines.push(`Client Strengths: ${state.clientStrengths}`);
        lines.push('');

        lines.push('--- ACTIVE TREATMENT GOALS & SMART OBJECTIVES ---');
        (state.activeGoals || []).forEach((g, idx) => {
            lines.push(`\nGOAL #${idx + 1} (${g.domain || 'General'}): ${g.broadGoal} [Target: ${g.targetDate || state.nextReviewDate}]`);
            (g.objectives || []).forEach((o, oIdx) => {
                lines.push(`  Objective ${idx + 1}.${oIdx + 1}: ${o.text} (Target: ${o.targetDate || 'N/A'} | Status: ${o.progressStatus})`);
            });
            const allInts = [...(g.interventions || [])];
            if (g.customInterventions) allInts.push(g.customInterventions);
            if (allInts.length > 0) {
                lines.push(`  Interventions: ${allInts.join(' ')}`);
            }
        });

        if (state.archivedItems && state.archivedItems.length > 0) {
            lines.push('\n--- ACHIEVED & ARCHIVED GOALS / OBJECTIVES ---');
            state.archivedItems.forEach(a => {
                lines.push(`* [${a.outcome} on ${a.dateAchieved}] ${a.domain}: ${a.summary}`);
            });
        }

        lines.push('\n--- DISCHARGE CRITERIA & COLLABORATION ---');
        if (state.dischargeCriteria) lines.push(`Discharge Criteria: ${state.dischargeCriteria}`);
        if (state.clientParticipationNote) lines.push(`Collaboration Note: ${state.clientParticipationNote}`);

        return lines.join('\n').trim();
    }

    // --- 7. Submit, Print, Copy & Export / Import Handlers ---
    $('#treatmentPlanForm').on('submit', function(e) {
        e.preventDefault();
        const state = collectFullPlanState();
        $('#generatedPlanHtml').html(buildTreatmentPlanHtml(state));
        $('#generatedPlanContainer').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#generatedPlanContainer').offset().top - 20 }, 400);
    });

    $('#copyPlanTextBtn').on('click', function() {
        const text = buildTreatmentPlanPlainText(collectFullPlanState());
        navigator.clipboard.writeText(text).then(() => {
            alert('Treatment Plan copied to clipboard!');
        });
    });

    $('#printPlanPdfBtn').on('click', function() {
        const state = collectFullPlanState();
        const html = buildTreatmentPlanHtml(state);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Clinical Treatment Plan</title>
                <style>
                    @page { margin: 0.55in; }
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; background: #fff; font-size: 10pt; line-height: 1.45; margin: 0; }
                    .tp-header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px; }
                    .tp-header h2 { margin: 0; font-size: 16pt; }
                    .tp-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 14px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                    .tp-section { margin-bottom: 14px; }
                    .tp-section h3 { font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 10px 0 6px 0; }
                    .tp-goal-box { border: 1px solid #333; border-radius: 4px; padding: 10px 12px; margin-bottom: 12px; break-inside: avoid; }
                    .tp-goal-header { display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 6px; }
                    .tp-sub { margin-top: 6px; }
                    .tp-sub ol, .tp-sub ul { margin: 4px 0 0 20px; padding: 0; }
                    .tp-signatures { margin-top: 24px; padding-top: 12px; border-top: 1px solid #666; display: flex; justify-content: space-between; gap: 20px; break-inside: avoid; }
                </style>
            </head>
            <body>${html}</body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 250);
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

    $('#exportTxtBtn').on('click', function() {
        const text = buildTreatmentPlanPlainText(collectFullPlanState());
        downloadFile(text, 'clinical_treatment_plan.txt', 'text/plain;charset=utf-8');
    });

    $('#exportJsonButtonTop, #exportJsonButtonBottom').on('click', function() {
        const state = collectFullPlanState();
        downloadFile(JSON.stringify(state, null, 2), 'treatment_plan_data.json', 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', () => $('#importJsonFile').click());

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const data = JSON.parse(evt.target.result);
                applyImportedPlan(data);
            } catch (err) {
                alert('Invalid JSON file. Please upload a valid Treatment Plan .json file.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    function applyImportedPlan(data) {
        if (!data || typeof data !== 'object') return;
        if (data.framework) $('#planFrameworkSelect').val(data.framework).trigger('change');
        if (data.planStatus) $('#planStatusSelect').val(data.planStatus);
        $('#clientName').val(data.clientName || '');
        $('#planDate').val(data.planDate || todayStr);
        $('#nextReviewDate').val(data.nextReviewDate || '');
        $('#sessionFrequency').val(data.sessionFrequency || '');
        $('#clientStrengths').val(data.clientStrengths || '');
        $('#clinicianNameCreds').val(data.clinicianNameCreds || '');
        $('#medicalNecessityNote').val(data.medicalNecessityNote || '');
        if (data.dischargeCriteria) $('#dischargeCriteria').val(data.dischargeCriteria);
        if (data.clientParticipationNote) $('#clientParticipationNote').val(data.clientParticipationNote);

        if (data.diagnosisClassification) {
            currentClassification = data.diagnosisClassification;
            $(`input[name="diagnosisClassification"][value="${currentClassification}"]`).prop('checked', true);
            populateDiagnosesDropdown(currentClassification, data.diagnosisCodes || []);
        }

        if (Array.isArray(data.theories)) {
            data.theories.forEach(t => {
                if ($('#theorySelect').find(`option[value="${escapeAttr(t)}"]`).length === 0) {
                    $('#theorySelect').append(new Option(t, t, true, true));
                }
            });
            $('#theorySelect').val(data.theories).trigger('change');
        }

        if (Array.isArray(data.activeGoals)) {
            appState.activeGoals = data.activeGoals.slice(0, MAX_ACTIVE_GOALS);
        }
        if (Array.isArray(data.archivedItems)) {
            appState.archivedItems = data.archivedItems;
        }

        renderAll();
        $('#treatmentPlanForm').trigger('submit');
    }

    $('#clearAllButton').on('click', function() {
        if (!confirm('Clear the entire treatment plan form? Make sure you have exported your .json file if you want to save your work.')) return;
        document.getElementById('treatmentPlanForm').reset();
        $('#planDate').val(todayStr);
        $('#diagnosisSelect').val(null).trigger('change');
        $('#theorySelect').val(null).trigger('change');
        appState.activeGoals = [];
        appState.archivedItems = [];
        addNewActiveGoal();
        $('#generatedPlanContainer').addClass('hidden');
        renderAll();
    });

    function renderCitations(citations) {
        const list = $('#sourcesList');
        list.empty();
        citations.forEach(c => list.append(`<p class="apa-citation">${c}</p>`));
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