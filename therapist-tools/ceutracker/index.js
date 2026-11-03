$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_ceu_tracker_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_ceu_cache_enabled';

    let licensureRules = {};
    let appState = {
        clinicianName: '',
        licenseNumber: '',
        state: 'WA',
        licenseType: 'LMHC',
        renewalDueDate: '',
        anchorDates: {}, // e.g., { health_equity: '2024-05-01', suicide: '2023-08-15' }
        courses: []
    };

    // Temporary holder for Base64 certificate attachment while adding/editing a course
    let currentAttachment = null;

    // --- 1. Load Licensure Rules & Initialize ---
    $.getJSON('licensure-rules.json', function(data) {
        licensureRules = data.states || {};
        populateStateDropdown();
        initDefaultRenewalDate();
        checkLocalCacheOnLoad();
        renderAll();
    });

    function initDefaultRenewalDate() {
        if (!appState.renewalDueDate) {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            appState.renewalDueDate = d.toISOString().split('T')[0];
            $('#renewalDueDate').val(appState.renewalDueDate);
        }
    }

    function populateStateDropdown() {
        const stateSelect = $('#stateSelect');
        stateSelect.empty();
        Object.entries(licensureRules).forEach(([stateCode, stateObj]) => {
            stateSelect.append(new Option(stateObj.name, stateCode));
        });
        stateSelect.val(appState.state);
        populateLicenseDropdown(appState.state);
    }

    function populateLicenseDropdown(stateCode) {
        const licenseSelect = $('#licenseTypeSelect');
        licenseSelect.empty();
        const stateObj = licensureRules[stateCode];
        if (!stateObj || !stateObj.licenses) return;

        Object.entries(stateObj.licenses).forEach(([licCode, licObj]) => {
            licenseSelect.append(new Option(licObj.name, licCode));
        });

        if (!stateObj.licenses[appState.licenseType]) {
            appState.licenseType = Object.keys(stateObj.licenses)[0];
        }
        licenseSelect.val(appState.licenseType);
    }

    function getCurrentRuleSet() {
        if (
            licensureRules[appState.state] &&
            licensureRules[appState.state].licenses &&
            licensureRules[appState.state].licenses[appState.licenseType]
        ) {
            return licensureRules[appState.state].licenses[appState.licenseType];
        }
        return null;
    }

    // --- 2. Date Window Calculations ---
    function subtractYears(dateStr, years) {
        const d = new Date(dateStr + 'T00:00:00');
        d.setFullYear(d.getFullYear() - years);
        return d.toISOString().split('T')[0];
    }

    function addYears(dateStr, years) {
        const d = new Date(dateStr + 'T00:00:00');
        d.setFullYear(d.getFullYear() + years);
        return d.toISOString().split('T')[0];
    }

    function getPrimaryWindow() {
        const rules = getCurrentRuleSet();
        const cycleYears = rules ? rules.primaryCycleYears : 2;
        const endDate = appState.renewalDueDate || new Date().toISOString().split('T')[0];
        const startDate = subtractYears(endDate, cycleYears);
        return { startDate, endDate, cycleYears };
    }

    function getRequirementWindow(req) {
        const primary = getPrimaryWindow();
        if (req.cycleYears === primary.cycleYears) {
            return {
                startDate: primary.startDate,
                endDate: primary.endDate,
                usingAnchor: false
            };
        }
        // For multi-cycle tiers (e.g., 4-year Health Equity or 6-year Suicide)
        const anchorDate = appState.anchorDates[req.id];
        if (anchorDate) {
            return {
                startDate: anchorDate,
                endDate: addYears(anchorDate, req.cycleYears),
                usingAnchor: true
            };
        }
        // Fallback if no anchor date is entered: look back `req.cycleYears` from current renewal due date
        return {
            startDate: subtractYears(primary.endDate, req.cycleYears),
            endDate: primary.endDate,
            usingAnchor: false
        };
    }

    function isDateInWindow(courseDate, startDate, endDate, usingAnchor) {
        if (!courseDate) return false;
        // If using a "Last Completed Date" anchor, courses taken ON or AFTER that date count
        if (usingAnchor) {
            return courseDate >= startDate && courseDate <= endDate;
        }
        return courseDate > startDate && courseDate <= endDate;
    }

    // --- 3. Render UI Sections ---
    function renderAll() {
        syncInputsWithState();
        renderMultiCycleDateInputs();
        renderMandateCheckboxes();
        renderProgressDashboard();
        renderCourseTable();
        renderCitations();
        saveToLocalCacheIfEnabled();
    }

    function syncInputsWithState() {
        $('#clinicianName').val(appState.clinicianName);
        $('#licenseNumber').val(appState.licenseNumber);
        $('#stateSelect').val(appState.state);
        $('#licenseTypeSelect').val(appState.licenseType);
        $('#renewalDueDate').val(appState.renewalDueDate);
    }

    function renderMultiCycleDateInputs() {
        const rules = getCurrentRuleSet();
        const container = $('#multiCycleDatesContainer');
        container.empty();

        if (!rules) {
            container.addClass('hidden');
            return;
        }

        const multiCycleReqs = (rules.requirements || []).filter(r => r.cycleYears !== rules.primaryCycleYears);
        if (multiCycleReqs.length === 0) {
            container.addClass('hidden');
            return;
        }

        container.removeClass('hidden');
        multiCycleReqs.forEach(req => {
            const currentVal = appState.anchorDates[req.id] || '';
            const nextDueText = currentVal
                ? `Next due by: <strong>${addYears(currentVal, req.cycleYears)}</strong>`
                : `Optional: Defaults to ${req.cycleYears}-year lookback from your Renewal Due Date.`;

            const html = `
                <div>
                    <label for="anchor_${req.id}" class="block text-sm font-semibold mb-1">
                        ${req.anchorLabel || req.name + ' Window Start Date'}:
                    </label>
                    <input type="date" id="anchor_${req.id}" data-req-id="${req.id}" value="${currentVal}" class="anchor-date-input w-full p-2 border rounded-md">
                    <p class="muted text-xs mt-1">${nextDueText}</p>
                </div>
            `;
            container.append(html);
        });
    }

    function renderMandateCheckboxes(selectedMandates = []) {
        const rules = getCurrentRuleSet();
        const container = $('#mandateCheckboxesContainer');
        container.empty();

        const generalChecked = selectedMandates.includes('general') ? 'checked' : '';
        container.append(`
            <label class="inline-flex items-center text-sm cursor-pointer">
                <input type="checkbox" name="courseMandate" value="general" ${generalChecked}>
                <span class="ml-2">General CEU</span>
            </label>
        `);

        if (rules && rules.requirements) {
            rules.requirements.forEach(req => {
                const isChecked = selectedMandates.includes(req.id) ? 'checked' : '';
                container.append(`
                    <label class="inline-flex items-center text-sm cursor-pointer" title="${req.description || ''}">
                        <input type="checkbox" name="courseMandate" value="${req.id}" ${isChecked}>
                        <span class="ml-2">${req.name} (${req.cycleYears}yr)</span>
                    </label>
                `);
            });
        }
    }

    function renderProgressDashboard() {
        const rules = getCurrentRuleSet();
        const container = $('#progressBarsContainer');
        container.empty();
        if (!rules) return;

        const primaryWindow = getPrimaryWindow();

        // Calculate Total Hours & Cost within Primary Renewal Window (each course added ONCE)
        let primaryTotalHours = 0;
        let primaryTotalCost = 0;

        appState.courses.forEach(course => {
            const hrs = parseFloat(course.hours) || 0;
            const cost = parseFloat(course.cost) || 0;
            if (isDateInWindow(course.date, primaryWindow.startDate, primaryWindow.endDate, false)) {
                primaryTotalHours += hrs;
                primaryTotalCost += cost;
            }
        });

        $('#totalCostDisplay').text(`$${primaryTotalCost.toFixed(2)}`);

        // Render Primary Total Hours Bar
        container.append(buildProgressBarHTML(
            `Total Renewal Cycle Hours (${rules.primaryCycleYears}-Year Cycle)`,
            primaryTotalHours,
            rules.totalRequiredHours,
            `Active Window: ${primaryWindow.startDate} to ${primaryWindow.endDate}`,
            'Clock hours from each course count once toward this total.'
        ));

        // Render Each Specific Mandate Bar
        (rules.requirements || []).forEach(req => {
            const win = getRequirementWindow(req);
            let reqHours = 0;

            appState.courses.forEach(course => {
                const hrs = parseFloat(course.hours) || 0;
                const mandates = Array.isArray(course.mandates) ? course.mandates : [];
                if (mandates.includes(req.id) && isDateInWindow(course.date, win.startDate, win.endDate, win.usingAnchor)) {
                    reqHours += hrs;
                }
            });

            const windowSubtitle = win.usingAnchor
                ? `${req.cycleYears}-Year Window (From Anchor): ${win.startDate} to Due Date ${win.endDate}`
                : `${req.cycleYears}-Year Window: ${win.startDate} to ${win.endDate}`;

            container.append(buildProgressBarHTML(
                req.name,
                reqHours,
                req.hours,
                windowSubtitle,
                req.description
            ));
        });
    }

    function buildProgressBarHTML(title, earned, required, windowText, description) {
        const pct = Math.min(100, Math.round((earned / required) * 100));
        const isComplete = earned >= required;
        const statusBadge = isComplete
            ? `<span class="status-badge status-complete">Complete (${earned} / ${required} hrs)</span>`
            : `<span class="status-badge status-pending">${earned} / ${required} hrs (${Math.max(0, (required - earned).toFixed(2))} remaining)</span>`;

        return `
            <div class="progress-card p-3 border rounded-md">
                <div class="flex flex-wrap justify-between items-center gap-2 mb-1">
                    <div>
                        <span class="font-bold text-sm">${title}</span>
                        <span class="block muted text-xs">${windowText}</span>
                    </div>
                    <div>${statusBadge}</div>
                </div>
                <div class="progress-track w-full rounded-md overflow-hidden my-2">
                    <div class="progress-fill ${isComplete ? 'fill-complete' : 'fill-active'}" style="width: ${pct}%;"></div>
                </div>
                <p class="muted text-xs">${description || ''}</p>
            </div>
        `;
    }

    function getMandateLabelMap() {
        const map = { general: 'General CEU' };
        const rules = getCurrentRuleSet();
        if (rules && rules.requirements) {
            rules.requirements.forEach(r => { map[r.id] = r.name; });
        }
        return map;
    }

    function renderCourseTable() {
        const tbody = $('#courseLogTableBody');
        tbody.empty();

        const filterMode = $('#filterCycleSelect').val();
        const primaryWindow = getPrimaryWindow();
        const labelMap = getMandateLabelMap();

        // Sort courses newest first
        const sortedCourses = [...appState.courses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const filteredCourses = sortedCourses.filter(c => {
            if (filterMode === 'current') {
                return isDateInWindow(c.date, primaryWindow.startDate, primaryWindow.endDate, false);
            }
            return true;
        });

        if (filteredCourses.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="8" class="p-4 text-center muted">No courses match the current filter.</td>
                </tr>
            `);
            return;
        }

        filteredCourses.forEach(course => {
            const mandateBadges = (course.mandates || []).map(m => {
                return `<span class="mandate-tag">${escapeHtml(labelMap[m] || m)}</span>`;
            }).join(' ');

            let certHtml = '<span class="muted text-xs">None</span>';
            const certParts = [];
            if (course.certLink) {
                const isUrl = /^https?:\/\//i.test(course.certLink);
                if (isUrl) {
                    certParts.push(`<a href="${escapeHtml(course.certLink)}" target="_blank" rel="noopener" class="btn-link text-xs">Cloud Link</a>`);
                } else {
                    certParts.push(`<span class="text-xs" title="Local file reference">${escapeHtml(course.certLink)}</span>`);
                }
            }
            if (course.certAttachment && course.certAttachment.dataUrl) {
                certParts.push(`<button type="button" class="btn-link text-xs view-cert-btn" data-id="${course.id}">View Embedded (${escapeHtml(course.certAttachment.name)})</button>`);
            }
            if (certParts.length > 0) {
                certHtml = certParts.join('<br>');
            }

            const notesPreview = course.notes
                ? `<div class="muted text-xs mt-1"><em>Note:</em> ${escapeHtml(course.notes)}</div>`
                : '';

            tbody.append(`
                <tr class="border-b text-sm">
                    <td class="p-2 whitespace-nowrap">${escapeHtml(course.date)}</td>
                    <td class="p-2">
                        <div class="font-semibold">${escapeHtml(course.title)}</div>
                        <div class="muted text-xs">${escapeHtml(course.presenter)}</div>
                        ${notesPreview}
                    </td>
                    <td class="p-2 font-semibold">${parseFloat(course.hours).toFixed(2)}</td>
                    <td class="p-2">${mandateBadges || '<span class="muted text-xs">General</span>'}</td>
                    <td class="p-2 text-xs">
                        <div>${escapeHtml(course.approvalBody || '—')}</div>
                        <div class="muted">${escapeHtml(course.format || '')}</div>
                    </td>
                    <td class="p-2 text-xs">$${(parseFloat(course.cost) || 0).toFixed(2)}</td>
                    <td class="p-2">${certHtml}</td>
                    <td class="p-2 text-right whitespace-nowrap">
                        <button type="button" class="btn-link text-xs edit-course-btn mr-2" data-id="${course.id}">Edit</button>
                        <button type="button" class="btn-link text-xs delete-course-btn" data-id="${course.id}">Delete</button>
                    </td>
                </tr>
            `);
        });
    }

    function renderCitations() {
        const rules = getCurrentRuleSet();
        const container = $('#sourcesContainer');
        const list = $('#sourcesList');
        list.empty();

        if (rules && rules.citations && rules.citations.length > 0) {
            rules.citations.forEach(citation => {
                list.append(`<p>${escapeHtml(citation)}</p>`);
            });
            container.removeClass('hidden');
        } else {
            container.addClass('hidden');
        }
    }

    // --- 4. Certificate File Compression & Base64 Embedding ---
    $('#certFileInput').on('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        // If it's an image, compress via canvas so JSON stays lightweight
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const maxDim = 1400;
                    let width = img.width;
                    let height = img.height;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setAttachmentState({
                        name: file.name,
                        type: 'image/jpeg',
                        dataUrl: compressedDataUrl
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            if (file.size > 5 * 1024 * 1024) {
                alert('Notice: This PDF is over 5MB. Embedding large PDFs will make your .json file larger. Consider uploading a screenshot/image of the certificate or using a file link if you have many certificates.');
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                setAttachmentState({
                    name: file.name,
                    type: 'application/pdf',
                    dataUrl: e.target.result
                });
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select an image (JPG/PNG) or a PDF file.');
            $(this).val('');
        }
    });

    function setAttachmentState(attObj) {
        currentAttachment = attObj;
        if (attObj) {
            $('#certFileNameBadge').text(`Attached: ${attObj.name}`);
            $('#certAttachmentStatus').removeClass('hidden');
        } else {
            $('#certFileNameBadge').text('');
            $('#certAttachmentStatus').addClass('hidden');
            $('#certFileInput').val('');
        }
    }

    $('#removeCertAttachmentBtn').on('click', function() {
        setAttachmentState(null);
    });

    // --- 5. Event Listeners for Profile & Form ---
    $('#clinicianName, #licenseNumber, #renewalDueDate').on('change input', function() {
        appState.clinicianName = $('#clinicianName').val().trim();
        appState.licenseNumber = $('#licenseNumber').val().trim();
        appState.renewalDueDate = $('#renewalDueDate').val();
        renderProgressDashboard();
        renderCourseTable();
        saveToLocalCacheIfEnabled();
    });

    $('#stateSelect').on('change', function() {
        appState.state = $(this).val();
        populateLicenseDropdown(appState.state);
        appState.licenseType = $('#licenseTypeSelect').val();
        renderAll();
    });

    $('#licenseTypeSelect').on('change', function() {
        appState.licenseType = $(this).val();
        renderAll();
    });

    $(document).on('change', '.anchor-date-input', function() {
        const reqId = $(this).data('req-id');
        const val = $(this).val();
        if (val) {
            appState.anchorDates[reqId] = val;
        } else {
            delete appState.anchorDates[reqId];
        }
        renderMultiCycleDateInputs();
        renderProgressDashboard();
        saveToLocalCacheIfEnabled();
    });

    $('#filterCycleSelect').on('change', function() {
        renderCourseTable();
    });

    // Add / Update Course Submission
    $('#ceuCourseForm').on('submit', function(e) {
        e.preventDefault();

        const selectedMandates = $('input[name="courseMandate"]:checked').map(function() {
            return $(this).val();
        }).get();

        if (selectedMandates.length === 0) {
            selectedMandates.push('general');
        }

        const editingId = $('#editingCourseId').val();
        const courseObj = {
            id: editingId || 'ceu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: $('#courseTitle').val().trim(),
            presenter: $('#coursePresenter').val().trim(),
            date: $('#courseDate').val(),
            hours: parseFloat($('#courseHours').val()) || 0,
            approvalBody: $('#courseApprovalBody').val().trim(),
            format: $('#courseFormat').val(),
            cost: parseFloat($('#courseCost').val()) || 0,
            mandates: selectedMandates,
            certLink: $('#certLink').val().trim(),
            certAttachment: currentAttachment ? { ...currentAttachment } : null,
            notes: $('#courseNotes').val().trim()
        };

        if (editingId) {
            const idx = appState.courses.findIndex(c => c.id === editingId);
            if (idx > -1) appState.courses[idx] = courseObj;
        } else {
            appState.courses.push(courseObj);
        }

        resetCourseForm();
        renderProgressDashboard();
        renderCourseTable();
        saveToLocalCacheIfEnabled();
    });

    function resetCourseForm() {
        document.getElementById('ceuCourseForm').reset();
        $('#editingCourseId').val('');
        setAttachmentState(null);
        renderMandateCheckboxes();
        $('#saveCourseBtn').text('Add Course to Log');
        $('#cancelEditBtn').addClass('hidden');
    }

    $('#cancelEditBtn').on('click', function() {
        resetCourseForm();
    });

    // Edit Course Button
    $(document).on('click', '.edit-course-btn', function() {
        const id = $(this).data('id');
        const course = appState.courses.find(c => c.id === id);
        if (!course) return;

        $('#editingCourseId').val(course.id);
        $('#courseTitle').val(course.title);
        $('#coursePresenter').val(course.presenter);
        $('#courseDate').val(course.date);
        $('#courseHours').val(course.hours);
        $('#courseApprovalBody').val(course.approvalBody);
        $('#courseFormat').val(course.format);
        $('#courseCost').val(course.cost || '');
        $('#certLink').val(course.certLink || '');
        $('#courseNotes').val(course.notes || '');

        renderMandateCheckboxes(course.mandates || []);
        setAttachmentState(course.certAttachment || null);

        $('#saveCourseBtn').text('Update Course');
        $('#cancelEditBtn').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#ceuCourseForm').offset().top - 40 }, 400);
    });

    // Delete Course Button
    $(document).on('click', '.delete-course-btn', function() {
        const id = $(this).data('id');
        if (!confirm('Remove this course from your CEU log?')) return;
        appState.courses = appState.courses.filter(c => c.id !== id);
        renderProgressDashboard();
        renderCourseTable();
        saveToLocalCacheIfEnabled();
    });

    // View Embedded Certificate Modal / New Tab
    $(document).on('click', '.view-cert-btn', function() {
        const id = $(this).data('id');
        const course = appState.courses.find(c => c.id === id);
        if (!course || !course.certAttachment || !course.certAttachment.dataUrl) return;

        const win = window.open('', '_blank');
        if (course.certAttachment.type === 'application/pdf') {
            win.document.write(`<iframe src="${course.certAttachment.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`);
        } else {
            win.document.write(`<html><head><title>${escapeHtml(course.certAttachment.name)}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#222;"><img src="${course.certAttachment.dataUrl}" style="max-width:100%;max-height:100vh;"/></body></html>`);
        }
        win.document.close();
    });

    // --- 6. Local Browser Cache Toggle (Optional Persistence) ---
    function checkLocalCacheOnLoad() {
        const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
        $('#localCacheToggle').prop('checked', isEnabled);
        if (isEnabled) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    applyImportedData(parsed, false);
                } catch (e) {
                    console.error('Failed to parse cached CEU data:', e);
                }
            }
        }
    }

    $('#localCacheToggle').on('change', function() {
        const enabled = $(this).is(':checked');
        if (enabled) {
            localStorage.setItem(CACHE_ENABLED_KEY, 'true');
            saveToLocalCacheIfEnabled();
        } else {
            localStorage.removeItem(CACHE_ENABLED_KEY);
            localStorage.removeItem(STORAGE_KEY);
        }
    });

    function saveToLocalCacheIfEnabled() {
        if ($('#localCacheToggle').is(':checked')) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
            } catch (e) {
                alert('Browser storage limit reached (likely due to large embedded PDFs). Please use "Save / Export .json" to save directly to your hard drive.');
            }
        }
    }

    // Wipe Session
    $('#clearAllButton').on('click', function() {
        if (!confirm('Wipe all current session data? Make sure you have exported your .json file if you want to keep your log.')) return;
        appState.clinicianName = '';
        appState.licenseNumber = '';
        appState.anchorDates = {};
        appState.courses = [];
        initDefaultRenewalDate();
        localStorage.removeItem(STORAGE_KEY);
        resetCourseForm();
        renderAll();
    });

    // --- 7. JSON Import / Export & CSV Export ---
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
        const safeName = (appState.clinicianName || 'clinician').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `ceu_tracker_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
        downloadFile(JSON.stringify(appState, null, 2), filename, 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', function() {
        $('#importJsonFile').click();
    });

    $('#importJsonFile').on('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                applyImportedData(data, true);
            } catch (err) {
                alert('Invalid JSON file. Please select a valid CEU Tracker .json backup.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    function applyImportedData(data, shouldRender = true) {
        if (!data || typeof data !== 'object') return;
        appState.clinicianName = data.clinicianName || '';
        appState.licenseNumber = data.licenseNumber || '';
        appState.state = data.state && licensureRules[data.state] ? data.state : 'WA';
        populateStateDropdown();
        appState.licenseType = data.licenseType || 'LMHC';
        populateLicenseDropdown(appState.state);
        appState.renewalDueDate = data.renewalDueDate || appState.renewalDueDate;
        appState.anchorDates = data.anchorDates || {};
        appState.courses = Array.isArray(data.courses) ? data.courses : [];
        if (shouldRender) renderAll();
    }

    $('#exportCsvButton').on('click', function() {
        if (appState.courses.length === 0) {
            alert('No courses logged yet to export.');
            return;
        }
        const labelMap = getMandateLabelMap();
        const headers = ['Completion Date', 'Course Title', 'Presenter/Provider', 'Clock Hours', 'Mandates Satisfied', 'Approval Body', 'Format', 'Cost ($)', 'Certificate Reference', 'Notes'];
        const rows = appState.courses.map(c => [
            c.date || '',
            c.title || '',
            c.presenter || '',
            c.hours || 0,
            (c.mandates || []).map(m => labelMap[m] || m).join('; '),
            c.approvalBody || '',
            c.format || '',
            (parseFloat(c.cost) || 0).toFixed(2),
            c.certLink || (c.certAttachment ? c.certAttachment.name : ''),
            c.notes || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        downloadFile(csvContent, 'ceu_log_export.csv', 'text/csv;charset=utf-8');
    });

    // --- 8. Print / Audit Packet Generator (Summary Table + Embedded Certificates) ---
    $('#printAuditPacketBtn').on('click', function() {
        const rules = getCurrentRuleSet();
        const primaryWindow = getPrimaryWindow();
        const labelMap = getMandateLabelMap();

        const sortedCourses = [...appState.courses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        let tableRowsHtml = '';
        let certsAppendixHtml = '';

        sortedCourses.forEach((c, idx) => {
            const mandatesText = (c.mandates || []).map(m => labelMap[m] || m).join(', ');
            const certRef = c.certLink
                ? escapeHtml(c.certLink)
                : (c.certAttachment ? `Embedded (#${idx + 1}: ${escapeHtml(c.certAttachment.name)})` : '—');

            tableRowsHtml += `
                <tr>
                    <td>${escapeHtml(c.date)}</td>
                    <td><strong>${escapeHtml(c.title)}</strong><br><small>${escapeHtml(c.presenter)}</small></td>
                    <td>${parseFloat(c.hours).toFixed(2)}</td>
                    <td>${escapeHtml(mandatesText)}</td>
                    <td>${escapeHtml(c.approvalBody || '—')}<br><small>${escapeHtml(c.format || '')}</small></td>
                    <td>$${(parseFloat(c.cost) || 0).toFixed(2)}</td>
                    <td>${certRef}</td>
                </tr>
            `;

            if (c.certAttachment && c.certAttachment.dataUrl) {
                if (c.certAttachment.type.startsWith('image/')) {
                    certsAppendixHtml += `
                        <div class="cert-page">
                            <h3>Certificate #${idx + 1}: ${escapeHtml(c.title)} (${escapeHtml(c.date)} — ${c.hours} hrs)</h3>
                            <p>Provider: ${escapeHtml(c.presenter)} | Approval: ${escapeHtml(c.approvalBody || 'N/A')}</p>
                            <img src="${c.certAttachment.dataUrl}" alt="Certificate for ${escapeHtml(c.title)}" />
                        </div>
                    `;
                } else if (c.certAttachment.type === 'application/pdf') {
                    certsAppendixHtml += `
                        <div class="cert-page">
                            <h3>Certificate #${idx + 1}: ${escapeHtml(c.title)} (${escapeHtml(c.date)} — ${c.hours} hrs)</h3>
                            <p><em>Embedded PDF File: ${escapeHtml(c.certAttachment.name)}</em></p>
                            <embed src="${c.certAttachment.dataUrl}" type="application/pdf" width="100%" height="800px" />
                        </div>
                    `;
                }
            }
        });

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CEU Audit Report - ${escapeHtml(appState.clinicianName || 'Clinician')}</title>
                <style>
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; margin: 0.75in; line-height: 1.4; }
                    h1, h2, h3 { margin-bottom: 0.25em; }
                    .meta-grid { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt; }
                    th, td { border: 1px solid #444; padding: 6px 8px; text-align: left; vertical-align: top; }
                    th { background: #eee; }
                    .cert-page { page-break-before: always; padding-top: 20px; text-align: center; }
                    .cert-page img { max-width: 100%; max-height: 8.5in; border: 1px solid #ccc; margin-top: 10px; }
                </style>
            </head>
            <body>
                <h1>Continuing Education (CEU) Audit Packet</h1>
                <div class="meta-grid">
                    <div>
                        <strong>Clinician:</strong> ${escapeHtml(appState.clinicianName || '________________________')}<br>
                        <strong>License #:</strong> ${escapeHtml(appState.licenseNumber || '________________________')}<br>
                        <strong>Credential:</strong> ${escapeHtml(rules ? rules.name : appState.licenseType)} (${escapeHtml(appState.state)})
                    </div>
                    <div>
                        <strong>Primary Cycle Window:</strong> ${primaryWindow.startDate} to ${primaryWindow.endDate}<br>
                        <strong>Total Cycle Spend:</strong> ${$('#totalCostDisplay').text()}<br>
                        <strong>Report Generated:</strong> ${new Date().toISOString().split('T')[0]}
                    </div>
                </div>

                <h2>Completed Course Log</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Course Title &amp; Provider</th>
                            <th>Hours</th>
                            <th>Mandates</th>
                            <th>Approval / Format</th>
                            <th>Cost</th>
                            <th>Certificate Reference</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml || '<tr><td colspan="7">No courses logged.</td></tr>'}
                    </tbody>
                </table>

                ${certsAppendixHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 400);
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
});