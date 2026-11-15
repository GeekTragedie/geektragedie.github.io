$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_assessment_db_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_assessment_db_cache_enabled';

    let assessmentsList = [];
    let selectedPacketIds = new Set();

    // Side-filter state: each group is a set of checked values (empty = no filter)
    const filters = { category: new Set(), age: new Set(), respondent: new Set(), symptom: new Set() };
    const openGroups = new Set(['category']);
    function ageBuckets(a) {
        const t = (a.ageGroup || '').toLowerCase();
        const out = [];
        if (/adult|18\+|16\+/.test(t)) out.push('Adults');
        if (/adolescent|teen|11–17|12–|13–|16\+|grades/.test(t)) out.push('Adolescents');
        if (/child|pediatric|6–|grades|youth/.test(t)) out.push('Children');
        return out.length ? out : ['Any age'];
    }
    function respondentBuckets(a) {
        const t = (a.respondent || 'Self-Report').toLowerCase();
        const out = [];
        if (/self/.test(t)) out.push('Self-report');
        if (/clinician|interview/.test(t)) out.push('Clinician-rated');
        if (/caregiver|parent|teacher|informant|proxy/.test(t)) out.push('Caregiver or teacher');
        return out.length ? out : ['Self-report'];
    }
    const GROUPS = [
        { key: 'category', label: 'Category', values: a => [a.category || 'Other'] },
        { key: 'age', label: 'Age group', values: ageBuckets },
        { key: 'respondent', label: 'Who completes it', values: respondentBuckets },
        { key: 'symptom', label: 'Symptoms measured', values: a => a.symptoms || [] }
    ];
    // Shorter labels so every filter option fits on one line
    const SHORT_LABELS = {
        'Autism, Sensory & Camouflaging': 'Autism & sensory', 'OCD & Repetitive Thoughts/Behaviors': 'OCD & repetitive',
        'Trauma, PTSD & Dissociation': 'Trauma & PTSD', 'ADHD & Executive Functioning': 'ADHD & executive function',
        'Anxiety, Panic & Worry': 'Anxiety & panic', 'Depression & Mood': 'Depression & mood', 'Bipolar & Mood Spectrum': 'Bipolar spectrum',
        'Suicide & Safety Risk': 'Suicide & safety', 'Substance Use & Behavioral': 'Substance use', 'Eating, Feeding & Body Image': 'Eating & feeding',
        'Youth, Pediatric & Caregiver': 'Youth & caregiver', 'Cross-Cutting, Functioning & QoL': 'Functioning',
        'ADHD & Executive Functioning ': 'ADHD & executive',
        'Absorption / Imaginative involvement': 'Absorption', 'Binge eating and compensatory behaviors': 'Binge eating & purging',
        'Drug use problems in the past 12 months': 'Drug use problems', 'Fear of aversive consequences (choking/GI)': 'Fear-based food avoidance',
        'Fear something awful might happen': 'Dread / catastrophizing', 'Negative alterations in mood/cognition': 'Negative mood & thoughts',
        'Picky eating / sensory food aversion': 'Picky / sensory eating', 'Preparatory behavior / Past attempts': 'Past attempts / preparation',
        'Pressured speech / Racing thoughts': 'Racing thoughts', 'Social communication differences': 'Social communication',
        'Social relatedness across lifespan': 'Social relatedness', 'Substance dependence symptoms': 'Substance dependence',
        'Dissociative amnesia / Time loss': 'Dissociative amnesia', 'Intrusive memories / Flashbacks': 'Flashbacks',
        'Sensory processing differences': 'Sensory processing', 'Circumscribed special interests': 'Special interests',
        'Hazardous alcohol consumption': 'Hazardous drinking', 'School performance impairment': 'School impairment',
        'Alcohol dependence symptoms': 'Alcohol dependence', 'Anxiety and depression screen': 'Anxiety & depression',
        'Nervousness / Feeling on edge': 'Feeling on edge', 'Developmental trauma history': 'Developmental trauma',
        'Low appetite or interest in food': 'Low appetite', 'Negative self-concept / Shame': 'Shame / self-concept',
        'Time blindness / Forgetfulness': 'Time blindness', 'Life activities / Work / School': 'Work & school',
        'Disturbances in relationships': 'Relationship problems', 'Goal-directed hyperactivity': 'Goal-directed activity',
        'Suicidal method / intent / plan': 'Suicidal intent / plan'
    };
    SHORT_LABELS['ADHD & Executive Functioning'] = 'ADHD & executive';
    const shortLabel = (v) => SHORT_LABELS[v] || (/^13 psychiatric domains/.test(v) ? '13 symptom domains' : v);

    // --- 1. Load Assessments from JSON & Local Cache ---
    $.getJSON('assessments-data.json', function(data) {
        assessmentsList = (data && Array.isArray(data.assessments)) ? data.assessments : [];
        checkLocalCacheOnLoad();
        renderAll();
    });

    function populateSymptomFilterOptions() { /* filter options are rebuilt in renderFilters() */ }

    // --- 2. Filtering Logic ---
    function matches(a, skipGroup) {
        const kw = ($('#searchAssessmentInput').val() || '').toLowerCase().trim();
        for (const g of GROUPS) {
            if (g.key === skipGroup) continue;
            const set = filters[g.key];
            if (set.size && !g.values(a).some(v => set.has(v))) return false;
        }
        if (kw) {
            const hay = [a.acronym, a.fullName, a.category, a.ageGroup, a.respondent, a.scoringCutoffs, a.citation,
                ...(a.diagnoses || []), ...(a.symptoms || [])].join(' ').toLowerCase();
            if (!hay.includes(kw)) return false;
        }
        return true;
    }
    function getFilteredAssessments() {
        return assessmentsList.filter(a => matches(a));
    }

    // Each option's count reflects the other active filters, like the Resources page.
    function renderFilters() {
        const box = $('#filterGroups');
        box.find('details').each(function() { if (this.open) openGroups.add(this.dataset.group); else openGroups.delete(this.dataset.group); });
        box.empty();
        GROUPS.forEach(g => {
            const counts = new Map();
            assessmentsList.forEach(a => g.values(a).forEach(v => counts.set(v, (counts.get(v) || 0) + (matches(a, g.key) ? 1 : 0))));
            filters[g.key].forEach(v => { if (!counts.has(v)) counts.set(v, 0); });
            const values = [...counts.keys()].sort((x, y) => x.localeCompare(y));
            const active = filters[g.key].size;
            const opts = values.map(v => `<label class="filter-option" title="${escapeAttr(v)}"><span><input type="checkbox" class="as-filter-cb" data-group="${g.key}" value="${escapeAttr(v)}" ${filters[g.key].has(v) ? 'checked' : ''}> ${escapeHtml(shortLabel(v))}</span><span class="filter-count">${counts.get(v)}</span></label>`).join('');
            box.append(`<details class="filter-accordion" data-group="${g.key}" ${openGroups.has(g.key) || active ? 'open' : ''}><summary>${escapeHtml(g.label)}${active ? ` <span class="filter-active">${active}</span>` : ''}</summary><div class="filter-options">${opts}</div></details>`);
        });
        const chips = [];
        GROUPS.forEach(g => filters[g.key].forEach(v => chips.push(`<span class="active-filter-tag">${escapeHtml(shortLabel(v))} <button type="button" class="remove-filter-btn" data-group="${g.key}" data-value="${escapeAttr(v)}" aria-label="Remove filter ${escapeAttr(v)}">×</button></span>`)));
        $('#activeFiltersBar').html(chips.length ? `${chips.join('')} <button type="button" class="clear-all-btn" id="clearAllFiltersBtn">Clear all</button>` : '');
    }

    // PDFs that aren't in the pdfs/ folder yet go to the "Future Feature Attraction" page.
    // Links you add yourself (https://…) are used as-is; set "pdfAvailable": true once a file is in pdfs/.
    function pdfHref(a) {
        if (!a.pdfPath) return '';
        if (/^https?:\/\//i.test(a.pdfPath) || a.pdfAvailable) return a.pdfPath;
        return `../../coming-soon/index.html?feature=${encodeURIComponent(`${a.acronym} PDF`)}&from=${encodeURIComponent('../therapist-tools/assessmentdatabase/index.html')}`;
    }

    // --- 3. Render Cards & APA Citations ---
    function renderAll() {
        const filtered = getFilteredAssessments();
        renderFilters();
        $('#assessmentCountBadge').text(`${filtered.length} of ${assessmentsList.length} assessments shown`);
        $('#selectedAssessmentsCount').text(selectedPacketIds.size);

        const grid = $('#assessmentCardsGrid');
        grid.empty();

        if (filtered.length === 0) {
            grid.append(`
                <div class="subpanel p-6 rounded-md text-center muted md:col-span-2">
                    No assessments match your filters. Click <strong>Reset filters</strong>, or add your own assessment above.
                </div>
            `);
        } else {
            filtered.forEach(a => {
                const isSelected = selectedPacketIds.has(a.id);
                const dxBadges = (a.diagnoses || []).map(d => `<span class="as-tag tag-dx">${escapeHtml(d)}</span>`).join(' ');
                const symBadges = (a.symptoms || []).map(s => `<span class="as-tag tag-sym">${escapeHtml(s)}</span>`).join(' ');

                const href = pdfHref(a);
                const pdfBtnHtml = href
                    ? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener" class="btn btn-primary px-3 py-1.5 text-xs font-semibold rounded-md inline-block">Open / Print PDF (${escapeHtml(a.acronym)})</a>`
                    : `<span class="muted text-xs">No PDF linked yet</span>`;

                grid.append(`
                    <div class="subpanel p-5 rounded-md border assessment-card flex flex-col justify-between ${isSelected ? 'selected-card' : ''}">
                        <div class="space-y-3">
                            <!-- Card Header -->
                            <div class="flex justify-between items-start gap-2 border-b pb-2">
                                <div>
                                    <label class="inline-flex items-center cursor-pointer" title="Check to include in Packet & Citation copy">
                                        <input type="checkbox" class="select-assessment-cb mr-2" data-id="${a.id}" ${isSelected ? 'checked' : ''}>
                                        <span class="text-xl font-bold">${escapeHtml(a.acronym)}</span>
                                    </label>
                                    <span class="cat-pill ml-2">${escapeHtml(a.category)}</span>
                                    <div class="text-sm font-semibold mt-0.5">${escapeHtml(a.fullName)}</div>
                                </div>
                                <div class="flex gap-2 whitespace-nowrap">
                                    <button type="button" class="btn-link text-xs edit-assessment-btn" data-id="${a.id}">Edit</button>
                                    <button type="button" class="btn-link text-xs delete-assessment-btn" data-id="${a.id}">Delete</button>
                                </div>
                            </div>

                            <!-- Metadata Bar -->
                            <div class="grid grid-cols-3 gap-2 text-xs border-b pb-2">
                                <div><strong>Population:</strong><br>${escapeHtml(a.ageGroup || '—')}</div>
                                <div><strong>Length:</strong><br>${escapeHtml(a.itemsTime || '—')}</div>
                                <div><strong>Format:</strong><br>${escapeHtml(a.respondent || 'Self-Report')}</div>
                            </div>

                            <!-- Diagnoses & Symptoms Tags -->
                            <div class="space-y-1.5 text-xs">
                                ${dxBadges ? `<div><strong class="mr-1">Diagnoses:</strong> ${dxBadges}</div>` : ''}
                                ${symBadges ? `<div><strong class="mr-1">Symptoms Measured:</strong> ${symBadges}</div>` : ''}
                            </div>

                            <!-- Scoring & Cutoffs Box -->
                            <div class="p-2.5 border rounded-md scoring-box text-xs whitespace-pre-wrap"><strong>Clinical Scoring &amp; Cutoffs:</strong>\n${escapeHtml(a.scoringCutoffs || 'See instrument manual.')}</div>

                            <!-- Individual APA Citation -->
                            <div class="text-xs muted pt-1">
                                <strong>APA Citation:</strong> <span class="apa-inline">${a.citation || ''}</span>
                            </div>
                        </div>

                        <!-- Card Footer Actions -->
                        <div class="flex flex-wrap justify-between items-center gap-2 pt-3 mt-3 border-t">
                            ${pdfBtnHtml}
                            <button type="button" class="btn px-3 py-1.5 text-xs font-semibold rounded-md copy-single-citation-btn" data-id="${a.id}">
                                Copy APA Citation
                            </button>
                        </div>
                    </div>
                `);
            });
        }

        renderBottomCitations(filtered);
        saveToLocalCacheIfEnabled();
    }

    function renderBottomCitations(filteredList) {
        const listEl = $('#sourcesList');
        listEl.empty();

        // If user has checked specific assessments, highlight those; otherwise show all currently filtered
        const targetList = selectedPacketIds.size > 0
            ? assessmentsList.filter(a => selectedPacketIds.has(a.id))
            : filteredList;

        $('#citationScopeLabel').text(
            selectedPacketIds.size > 0
                ? `Showing APA 7th citations for ${targetList.length} selected assessment(s)`
                : `Showing APA 7th citations for ${targetList.length} displayed assessment(s)`
        );

        targetList.forEach(a => {
            if (a.citation) {
                listEl.append(`<p class="apa-citation"><strong>[${escapeHtml(a.acronym)}]</strong> ${a.citation}</p>`);
            }
        });
    }

    // --- 4. Event Listeners for Filters, Selection & Custom Form ---
    $('#searchAssessmentInput').on('input', renderAll);
    $(document).on('change', '.as-filter-cb', function() {
        const set = filters[this.dataset.group];
        if (this.checked) set.add(this.value); else set.delete(this.value);
        renderAll();
    });
    $(document).on('click', '.remove-filter-btn', function() {
        filters[this.dataset.group].delete(this.dataset.value);
        renderAll();
    });
    function resetFilters() {
        Object.values(filters).forEach(set => set.clear());
        $('#searchAssessmentInput').val('');
    }
    $(document).on('click', '#resetFiltersBtn, #clearAllFiltersBtn', function() {
        resetFilters();
        renderAll();
    });
    // Start over: clear filters, the selection, and the add/edit form, then go back to the top.
    $('#startOverBtn').on('click', function() {
        if (!confirm('Start over? This clears your filters, your selection, and the add/edit form. Your assessment library stays as it is.')) return;
        resetFilters();
        selectedPacketIds.clear();
        const form = document.getElementById('customAssessmentForm');
        if (form) form.reset();
        $('#editingAssessmentId').val('');
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    $(document).on('change', '.select-assessment-cb', function() {
        const id = $(this).data('id');
        if ($(this).is(':checked')) {
            selectedPacketIds.add(id);
        } else {
            selectedPacketIds.delete(id);
        }
        renderAll();
    });

    $('#selectAllShownBtn').on('click', function() {
        getFilteredAssessments().forEach(a => selectedPacketIds.add(a.id));
        renderAll();
    });

    $('#clearSelectedBtn').on('click', function() {
        selectedPacketIds.clear();
        renderAll();
    });

    // Copy Single APA Citation (strips HTML <em> tags for plain text clipboard)
    function stripHtmlTags(str) {
        return String(str || '').replace(/<\/?[^>]+(>|$)/g, '');
    }

    $(document).on('click', '.copy-single-citation-btn', function() {
        const id = $(this).data('id');
        const a = assessmentsList.find(item => item.id === id);
        if (!a) return;
        const cleanCitation = `${a.acronym} (${a.fullName}): ${stripHtmlTags(a.citation)}`;
        navigator.clipboard.writeText(cleanCitation).then(() => {
            alert(`APA Citation for ${a.acronym} copied to clipboard!`);
        });
    });

    $('#copySelectedCitationsBtn').on('click', function() {
        const targetList = selectedPacketIds.size > 0
            ? assessmentsList.filter(a => selectedPacketIds.has(a.id))
            : getFilteredAssessments();

        if (targetList.length === 0) return;

        const text = targetList
            .map(a => `${stripHtmlTags(a.citation)}`)
            .join('\n\n');

        navigator.clipboard.writeText(text).then(() => {
            alert(`Copied ${targetList.length} APA 7th citation(s) to clipboard!`);
        });
    });

    // Add / Edit Custom Assessment Form
    $('#toggleCustomFormBtn').on('click', function() {
        $('#customAssessmentSection').toggleClass('hidden');
    });

    $('#closeCustomFormBtn, #cancelCustomEditBtn').on('click', function() {
        resetCustomForm();
        $('#customAssessmentSection').addClass('hidden');
    });

    function resetCustomForm() {
        document.getElementById('customAssessmentForm').reset();
        $('#editingAssessmentId').val('');
        $('#saveCustomAssessmentBtn').text('Save Assessment to Database');
        $('#cancelCustomEditBtn').addClass('hidden');
    }

    $('#customAssessmentForm').on('submit', function(e) {
        e.preventDefault();
        const editingId = $('#editingAssessmentId').val();

        const diagnoses = ($('#asDiagnosesCodes').val() || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const symptoms = ($('#asSymptomsTags').val() || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const obj = {
            id: editingId || 'as_' + Date.now(),
            acronym: $('#asAcronym').val().trim(),
            fullName: $('#asFullName').val().trim(),
            category: $('#asCategory').val(),
            ageGroup: $('#asAgeGroup').val().trim(),
            itemsTime: $('#asItemsTime').val().trim(),
            respondent: $('#asRespondent').val(),
            pdfPath: $('#asPdfPath').val().trim(),
            diagnoses: diagnoses,
            symptoms: symptoms,
            scoringCutoffs: $('#asScoringCutoffs').val().trim(),
            citation: $('#asApaCitation').val().trim()
        };

        if (editingId) {
            const idx = assessmentsList.findIndex(a => a.id === editingId);
            if (idx > -1) assessmentsList[idx] = obj;
        } else {
            assessmentsList.unshift(obj);
        }

        populateSymptomFilterOptions();
        resetCustomForm();
        $('#customAssessmentSection').addClass('hidden');
        renderAll();
    });

    $(document).on('click', '.edit-assessment-btn', function() {
        const id = $(this).data('id');
        const a = assessmentsList.find(item => item.id === id);
        if (!a) return;

        $('#customAssessmentSection').removeClass('hidden');
        $('#editingAssessmentId').val(a.id);
        $('#asAcronym').val(a.acronym);
        $('#asFullName').val(a.fullName);
        $('#asCategory').val(a.category);
        $('#asAgeGroup').val(a.ageGroup);
        $('#asItemsTime').val(a.itemsTime);
        $('#asRespondent').val(a.respondent);
        $('#asPdfPath').val(a.pdfPath);
        $('#asDiagnosesCodes').val((a.diagnoses || []).join(', '));
        $('#asSymptomsTags').val((a.symptoms || []).join(', '));
        $('#asScoringCutoffs').val(a.scoringCutoffs);
        $('#asApaCitation').val(a.citation);

        $('#saveCustomAssessmentBtn').text('Update Assessment');
        $('#cancelCustomEditBtn').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#customAssessmentSection').offset().top - 30 }, 400);
    });

    $(document).on('click', '.delete-assessment-btn', function() {
        const id = $(this).data('id');
        if (!confirm('Remove this assessment from your current view/library?')) return;
        assessmentsList = assessmentsList.filter(a => a.id !== id);
        selectedPacketIds.delete(id);
        populateSymptomFilterOptions();
        renderAll();
    });

    // --- 5. Print Scoring & Citation Guide + Export (.json / .csv) ---
    $('#printScoringGuideBtn').on('click', function() {
        const targetList = selectedPacketIds.size > 0
            ? assessmentsList.filter(a => selectedPacketIds.has(a.id))
            : getFilteredAssessments();

        if (targetList.length === 0) {
            alert('No assessments selected or shown to print.');
            return;
        }

        const rowsHtml = targetList.map(a => `
            <div class="print-box">
                <div class="print-box-header">
                    <strong>${escapeHtml(a.acronym)} — ${escapeHtml(a.fullName)}</strong>
                    <span>${escapeHtml(a.category)}</span>
                </div>
                <div class="print-meta">
                    <strong>Population:</strong> ${escapeHtml(a.ageGroup)} &nbsp;|&nbsp;
                    <strong>Length:</strong> ${escapeHtml(a.itemsTime)} &nbsp;|&nbsp;
                    <strong>Format:</strong> ${escapeHtml(a.respondent)}
                </div>
                <div class="print-meta">
                    <strong>Diagnoses:</strong> ${escapeHtml((a.diagnoses || []).join(', '))}<br>
                    <strong>Symptoms Measured:</strong> ${escapeHtml((a.symptoms || []).join(', '))}
                </div>
                <div class="print-scoring"><strong>Scoring &amp; Cutoffs:</strong><br>${escapeHtml(a.scoringCutoffs)}</div>
                <div class="print-citation"><strong>APA Citation:</strong> ${a.citation}</div>
            </div>
        `).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Clinical Assessment Scoring &amp; Reference Guide</title>
                <style>
                    @page { margin: 0.55in; }
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; font-size: 9.5pt; line-height: 1.4; margin: 0; }
                    h1 { font-size: 16pt; border-bottom: 2px solid #000; padding-bottom: 6px; margin: 0 0 12px 0; }
                    .print-box { border: 1px solid #333; border-radius: 4px; padding: 8px 10px; margin-bottom: 10px; break-inside: avoid; }
                    .print-box-header { display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 4px; font-size: 10.5pt; }
                    .print-meta { margin-bottom: 4px; }
                    .print-scoring { white-space: pre-wrap; background: #f9fafb; padding: 6px; border-left: 3px solid #333; margin: 4px 0; }
                    .print-citation { font-size: 8.5pt; margin-top: 4px; padding-left: 2em; text-indent: -2em; text-align: left; }
                </style>
            </head>
            <body>
                <h1>Evidence-Based Clinical Assessment Scoring &amp; APA Reference Guide</h1>
                ${rowsHtml}
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

    function checkLocalCacheOnLoad() {
        const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
        $('#localCacheToggle').prop('checked', isEnabled);
        if (isEnabled) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed.assessments)) {
                        assessmentsList = parsed.assessments;
                    }
                } catch (e) {
                    console.error('Error loading cached assessment database:', e);
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ assessments: assessmentsList }));
        }
    }

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
        downloadFile(JSON.stringify({ assessments: assessmentsList }, null, 2), 'clinical_assessments_database.json', 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', () => $('#importJsonFile').click());

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (Array.isArray(parsed.assessments)) {
                    assessmentsList = parsed.assessments;
                    populateSymptomFilterOptions();
                    renderAll();
                }
            } catch (err) {
                alert('Invalid JSON file. Please upload a valid Assessment Database .json file.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#exportCsvButton').on('click', function() {
        const headers = ['Acronym', 'Full Name', 'Category', 'Age Group', 'Items/Time', 'Respondent', 'Diagnoses', 'Symptoms Measured', 'Scoring & Cutoffs', 'PDF Path', 'APA Citation'];
        const rows = assessmentsList.map(a => [
            a.acronym, a.fullName, a.category, a.ageGroup, a.itemsTime, a.respondent,
            (a.diagnoses || []).join('; '),
            (a.symptoms || []).join('; '),
            a.scoringCutoffs, a.pdfPath, stripHtmlTags(a.citation)
        ]);
        const csvContent = [headers, ...rows]
            .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        downloadFile(csvContent, 'clinical_assessments_index.csv', 'text/csv;charset=utf-8');
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