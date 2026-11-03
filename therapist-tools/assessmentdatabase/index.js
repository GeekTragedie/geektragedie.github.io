$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_assessment_db_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_assessment_db_cache_enabled';

    let assessmentsList = [];
    let selectedPacketIds = new Set();

    // Initialize Select2 for Symptom Multi-Filter
    $('#filterSymptomsSelect').select2({
        placeholder: 'Filter by specific symptoms (e.g., Flashbacks, Masking, Sleep)...',
        allowClear: true,
        multiple: true,
        width: '100%'
    });

    // --- 1. Load Assessments from JSON & Local Cache ---
    $.getJSON('assessments-data.json', function(data) {
        assessmentsList = (data && Array.isArray(data.assessments)) ? data.assessments : [];
        checkLocalCacheOnLoad();
        populateSymptomFilterOptions();
        renderAll();
    });

    function populateSymptomFilterOptions() {
        const el = $('#filterSymptomsSelect');
        const currentVals = el.val() || [];
        el.empty();

        const allSymptoms = new Set();
        assessmentsList.forEach(a => {
            (a.symptoms || []).forEach(s => allSymptoms.add(s));
        });

        [...allSymptoms].sort().forEach(sym => {
            el.append(new Option(sym, sym));
        });

        el.val(currentVals).trigger('change.select2');
    }

    // --- 2. Filtering Logic ---
    function getFilteredAssessments() {
        const cat = $('#filterCategorySelect').val();
        const selectedSymptoms = $('#filterSymptomsSelect').val() || [];
        const pop = $('#filterPopulationSelect').val();
        const kw = ($('#searchAssessmentInput').val() || '').toLowerCase().trim();

        return assessmentsList.filter(a => {
            if (cat !== 'ALL' && a.category !== cat) return false;

            if (selectedSymptoms.length > 0) {
                const aSyms = a.symptoms || [];
                const hasMatch = selectedSymptoms.some(s => aSyms.includes(s));
                if (!hasMatch) return false;
            }

            if (pop !== 'ALL') {
                const popHay = `${a.ageGroup || ''} ${a.respondent || ''}`.toLowerCase();
                if (!popHay.includes(pop.toLowerCase())) return false;
            }

            if (kw) {
                const hay = [
                    a.acronym, a.fullName, a.category, a.ageGroup, a.respondent,
                    a.scoringCutoffs, a.citation,
                    ...(a.diagnoses || []),
                    ...(a.symptoms || [])
                ].join(' ').toLowerCase();
                if (!hay.includes(kw)) return false;
            }

            return true;
        });
    }

    // --- 3. Render Cards & APA Citations ---
    function renderAll() {
        const filtered = getFilteredAssessments();
        $('#assessmentCountBadge').text(`${filtered.length} of ${assessmentsList.length} Assessments Shown`);
        $('#selectedAssessmentsCount').text(selectedPacketIds.size);

        const grid = $('#assessmentCardsGrid');
        grid.empty();

        if (filtered.length === 0) {
            grid.append(`
                <div class="subpanel p-6 rounded-md text-center muted md:col-span-2">
                    No assessments match your current filter. Click <strong>Reset All Filters</strong> or add a custom assessment above.
                </div>
            `);
        } else {
            filtered.forEach(a => {
                const isSelected = selectedPacketIds.has(a.id);
                const dxBadges = (a.diagnoses || []).map(d => `<span class="as-tag tag-dx">${escapeHtml(d)}</span>`).join(' ');
                const symBadges = (a.symptoms || []).map(s => `<span class="as-tag tag-sym">${escapeHtml(s)}</span>`).join(' ');

                const pdfBtnHtml = a.pdfPath
                    ? `<a href="${escapeAttr(a.pdfPath)}" target="_blank" rel="noopener" class="btn btn-primary px-3 py-1.5 text-xs font-semibold rounded-md inline-block">Open / Print PDF (${escapeHtml(a.acronym)})</a>`
                    : `<span class="muted text-xs">No PDF path linked yet</span>`;

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
    $('#filterCategorySelect, #filterSymptomsSelect, #filterPopulationSelect, #searchAssessmentInput').on('input change', renderAll);

    $('#resetFiltersBtn').on('click', function() {
        $('#filterCategorySelect').val('ALL');
        $('#filterSymptomsSelect').val(null).trigger('change.select2');
        $('#filterPopulationSelect').val('ALL');
        $('#searchAssessmentInput').val('');
        renderAll();
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
    $('#printScoringGuideBtn, #printFullGuideBottomBtn').on('click', function() {
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
                    .print-citation { font-size: 8.5pt; margin-top: 4px; }
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