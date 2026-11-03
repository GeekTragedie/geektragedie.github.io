$(document).ready(function() {
    let planTemplates = [];
    let defaultHotlinesData = [];

    // Initialize Date to Today
    $('#planDate').val(new Date().toISOString().split('T')[0]);

    // Initialize Select2 with `tags: true` so clinicians/clients can select presets OR type custom items
    $('#warningSignsSelect').select2({
        placeholder: 'Select warning signs or type a custom one and press Enter...',
        allowClear: true,
        multiple: true,
        tags: true,
        width: '100%'
    });

    $('#copingStrategiesSelect').select2({
        placeholder: 'Select coping strategies or type a custom one and press Enter...',
        allowClear: true,
        multiple: true,
        tags: true,
        width: '100%'
    });

    // --- 1. Load Data from JSON ---
    $.getJSON('crisis-plan-data.json', function(data) {
        planTemplates = data.templates || [];
        defaultHotlinesData = data.defaultHotlines || [];

        // Populate Plan Templates Dropdown
        const select = $('#planTemplateSelect');
        select.empty();
        planTemplates.forEach(t => {
            select.append(new Option(t.name, t.id));
        });

        // Populate Warning Signs
        const wsSelect = $('#warningSignsSelect');
        wsSelect.empty();
        (data.warningSigns || []).forEach(ws => {
            wsSelect.append(new Option(ws, ws));
        });

        // Populate Coping Strategies
        const csSelect = $('#copingStrategiesSelect');
        csSelect.empty();
        (data.copingStrategies || []).forEach(cs => {
            csSelect.append(new Option(cs, cs));
        });

        // Initialize Default Contact Rows
        initDefaultContactLists();
        select.trigger('change');
    });

    function initDefaultContactLists() {
        $('#personalContactsList').empty();
        addPersonalContactRow({ enabled: true, name: '', relationship: '', phone: '' });
        addPersonalContactRow({ enabled: true, name: '', relationship: '', phone: '' });

        $('#professionalContactsList').empty();
        addProfessionalContactRow({ enabled: true, role: 'Primary Therapist / Clinician', name: '', phone: '' });
        addProfessionalContactRow({ enabled: true, role: 'Prescriber / Psychiatrist', name: '', phone: '' });
        addProfessionalContactRow({ enabled: true, role: 'Local Emergency Room / Urgent Care', name: '', phone: '' });

        $('#hotlinesList').empty();
        defaultHotlinesData.forEach((hl, idx) => {
            // Check 988 and Crisis Text Line by default; leave specialized lines unchecked until toggled
            const checkedByDefault = idx < 2;
            addHotlineRow({ enabled: checkedByDefault, name: hl.name, contact: hl.contact });
        });
    }

    // --- 2. Dynamic Contact Row Builders (Toggleable & Removable) ---
    function addPersonalContactRow(item = { enabled: true, name: '', relationship: '', phone: '' }) {
        const checked = item.enabled !== false ? 'checked' : '';
        const row = $(`
            <div class="contact-row personal-contact-row flex flex-wrap md:flex-nowrap items-center gap-2 p-2 border rounded-md">
                <input type="checkbox" class="contact-enable-cb cursor-pointer" title="Include in plan" ${checked}>
                <input type="text" class="contact-name flex-1 p-2 border rounded-md text-sm" placeholder="Name (e.g., Sam Rivera)" value="${escapeAttr(item.name)}">
                <input type="text" class="contact-rel flex-1 p-2 border rounded-md text-sm" placeholder="Relationship (e.g., Partner / Best Friend)" value="${escapeAttr(item.relationship)}">
                <input type="text" class="contact-phone flex-1 p-2 border rounded-md text-sm" placeholder="Phone / Contact Info" value="${escapeAttr(item.phone)}">
                <button type="button" class="remove-row-btn btn-link text-xs px-2">Remove</button>
            </div>
        `);
        $('#personalContactsList').append(row);
    }

    function addProfessionalContactRow(item = { enabled: true, role: '', name: '', phone: '' }) {
        const checked = item.enabled !== false ? 'checked' : '';
        const row = $(`
            <div class="contact-row professional-contact-row flex flex-wrap md:flex-nowrap items-center gap-2 p-2 border rounded-md">
                <input type="checkbox" class="contact-enable-cb cursor-pointer" title="Include in plan" ${checked}>
                <input type="text" class="contact-role flex-1 p-2 border rounded-md text-sm" placeholder="Role (e.g., Therapist, Local Hospital)" value="${escapeAttr(item.role)}">
                <input type="text" class="contact-name flex-1 p-2 border rounded-md text-sm" placeholder="Name / Location / Address" value="${escapeAttr(item.name)}">
                <input type="text" class="contact-phone flex-1 p-2 border rounded-md text-sm" placeholder="Phone / Pager / Hours" value="${escapeAttr(item.phone)}">
                <button type="button" class="remove-row-btn btn-link text-xs px-2">Remove</button>
            </div>
        `);
        $('#professionalContactsList').append(row);
    }

    function addHotlineRow(item = { enabled: true, name: '', contact: '' }) {
        const checked = item.enabled !== false ? 'checked' : '';
        const row = $(`
            <div class="contact-row hotline-contact-row flex flex-wrap md:flex-nowrap items-center gap-2 p-2 border rounded-md">
                <input type="checkbox" class="contact-enable-cb cursor-pointer" title="Include in plan" ${checked}>
                <input type="text" class="hotline-name flex-1 p-2 border rounded-md text-sm font-semibold" placeholder="Resource Name" value="${escapeAttr(item.name)}">
                <input type="text" class="hotline-contact flex-1 p-2 border rounded-md text-sm" placeholder="Phone / Text / Website" value="${escapeAttr(item.contact)}">
                <button type="button" class="remove-row-btn btn-link text-xs px-2">Remove</button>
            </div>
        `);
        $('#hotlinesList').append(row);
    }

    $('#addPersonalContactBtn').on('click', () => addPersonalContactRow());
    $('#addProfessionalContactBtn').on('click', () => addProfessionalContactRow());
    $('#addHotlineBtn').on('click', () => addHotlineRow());

    $(document).on('click', '.remove-row-btn', function() {
        $(this).closest('.contact-row').remove();
    });

    // --- 3. Template Switching & APA Citations ---
    $('#planTemplateSelect').on('change', function() {
        const selectedId = $(this).val();
        const selectedTemplate = planTemplates.find(t => t.id === selectedId);

        $('.plan-template-section').addClass('hidden');
        $(`#${selectedId}-fields`).removeClass('hidden');

        if (selectedTemplate) {
            $('#planTemplateDescription').text(selectedTemplate.description || '');
            renderCitations(selectedTemplate.citations);
        }
    });

    function renderCitations(citations) {
        const container = $('#sourcesContainer');
        const list = $('#sourcesList');
        list.empty();

        if (citations && citations.length > 0) {
            citations.forEach(citation => {
                list.append(`<p class="apa-citation">${citation}</p>`);
            });
            container.removeClass('hidden');
        } else {
            container.addClass('hidden');
        }
    }

    // --- 4. Collect All Current Form State ---
    function collectFormState() {
        const templateId = $('#planTemplateSelect').val();
        const selectedTemplate = planTemplates.find(t => t.id === templateId);

        const templateFields = {};
        $('#template-specific-fields-container').find('textarea, input').each(function() {
            if (this.id) templateFields[this.id] = $(this).val();
        });

        const personalContacts = [];
        $('.personal-contact-row').each(function() {
            personalContacts.push({
                enabled: $(this).find('.contact-enable-cb').is(':checked'),
                name: $(this).find('.contact-name').val().trim(),
                relationship: $(this).find('.contact-rel').val().trim(),
                phone: $(this).find('.contact-phone').val().trim()
            });
        });

        const professionalContacts = [];
        $('.professional-contact-row').each(function() {
            professionalContacts.push({
                enabled: $(this).find('.contact-enable-cb').is(':checked'),
                role: $(this).find('.contact-role').val().trim(),
                name: $(this).find('.contact-name').val().trim(),
                phone: $(this).find('.contact-phone').val().trim()
            });
        });

        const hotlines = [];
        $('.hotline-contact-row').each(function() {
            hotlines.push({
                enabled: $(this).find('.contact-enable-cb').is(':checked'),
                name: $(this).find('.hotline-name').val().trim(),
                contact: $(this).find('.hotline-contact').val().trim()
            });
        });

        return {
            template: templateId,
            templateName: selectedTemplate ? selectedTemplate.name : 'Crisis & Safety Plan',
            clientName: $('#clientName').val().trim(),
            planDate: $('#planDate').val(),
            clinicianName: $('#clinicianName').val().trim(),
            warningSigns: $('#warningSignsSelect').val() || [],
            warningSignsCustom: $('#warningSignsCustom').val().trim(),
            copingStrategies: $('#copingStrategiesSelect').val() || [],
            copingStrategiesCustom: $('#copingStrategiesCustom').val().trim(),
            templateFields: templateFields,
            personalContacts: personalContacts,
            professionalContacts: professionalContacts,
            hotlines: hotlines,
            printLayoutStyle: $('input[name="printLayoutStyle"]:checked').val() || 'clinical'
        };
    }

    // --- 5. Build Structured Plan Sections for Preview, Print & Text Export ---
    function buildPlanSections(state) {
        const sections = [];

        // Warning Signs
        const wsItems = [...state.warningSigns];
        if (state.warningSignsCustom) wsItems.push(state.warningSignsCustom);
        if (wsItems.length > 0) {
            sections.push({
                title: 'Warning Signs & Triggers',
                items: wsItems
            });
        }

        // Coping Strategies
        const csItems = [...state.copingStrategies];
        if (state.copingStrategiesCustom) csItems.push(state.copingStrategiesCustom);
        if (csItems.length > 0) {
            sections.push({
                title: 'Internal Coping & Grounding Strategies',
                items: csItems
            });
        }

        const tf = state.templateFields || {};
        switch (state.template) {
            case 'stanley-brown':
                if (tf['sb-social-distraction']) sections.push({ title: 'People & Social Settings for Distraction', text: tf['sb-social-distraction'] });
                if (tf['sb-environment-safety']) sections.push({ title: 'Making the Environment Safe (Lethal Means Restriction)', text: tf['sb-environment-safety'] });
                if (tf['sb-reasons-for-living']) sections.push({ title: 'Reasons for Living / What Matters Most', text: tf['sb-reasons-for-living'] });
                break;
            case 'wrap':
                if (tf['wrap-baseline']) sections.push({ title: 'Wellness Baseline & Daily Maintenance', text: tf['wrap-baseline'] });
                if (tf['wrap-breaking-down']) sections.push({ title: 'When Things Are Breaking Down (Immediate Action Steps)', text: tf['wrap-breaking-down'] });
                if (tf['wrap-crisis-care']) sections.push({ title: 'In a Crisis: How Supporters Can Help (and What to Avoid)', text: tf['wrap-crisis-care'] });
                if (tf['wrap-post-crisis']) sections.push({ title: 'Post-Crisis Recovery & Transition Plan', text: tf['wrap-post-crisis'] });
                break;
            case 'youth-caregiver':
                if (tf['youth-trusted-adults']) sections.push({ title: 'Trusted Adults I Can Reach Out To', text: tf['youth-trusted-adults'] });
                if (tf['youth-communication-signal']) sections.push({ title: 'Low-Pressure Signal / Code Word for Caregivers', text: tf['youth-communication-signal'] });
                if (tf['youth-caregiver-steps']) sections.push({ title: 'Caregiver Support & Validation Steps', text: tf['youth-caregiver-steps'] });
                if (tf['youth-home-safety']) sections.push({ title: 'Home Safety & Securing Lethal Means', text: tf['youth-home-safety'] });
                break;
            case 'dv-safety':
                if (tf['dv-safe-areas']) sections.push({ title: 'Safe Areas in the Home During an Incident', text: tf['dv-safe-areas'] });
                if (tf['dv-code-word']) sections.push({ title: 'Code Word / Signal with Trusted Contacts', text: tf['dv-code-word'] });
                if (tf['dv-gobag-checklist']) sections.push({ title: 'Emergency Go-Bag & Essential Documents', text: tf['dv-gobag-checklist'] });
                if (tf['dv-tech-privacy']) sections.push({ title: 'Digital, Phone & Location Privacy Steps', text: tf['dv-tech-privacy'] });
                break;
            case 'neurodivergent':
                if (tf['nd-sensory-environment']) sections.push({ title: 'Sensory De-Escalation Adjustments Needed Immediately', text: tf['nd-sensory-environment'] });
                if (tf['nd-communication-access']) sections.push({ title: 'Communication Access During Overload / Shutdown', text: tf['nd-communication-access'] });
                if (tf['nd-what-helps']) sections.push({ title: 'What Helps Me Regulate (Stims, Co-Regulation)', text: tf['nd-what-helps'] });
                if (tf['nd-what-worsens']) sections.push({ title: 'What Makes Overload Worse (Please Avoid)', text: tf['nd-what-worsens'] });
                break;
            case 'relapse-prevention':
                if (tf['rp-high-risk']) sections.push({ title: 'High-Risk Situations, Triggers & HALT States', text: tf['rp-high-risk'] });
                if (tf['rp-craving-surf']) sections.push({ title: 'Urge Surfing & 15-Minute Delay Plan', text: tf['rp-craving-surf'] });
                if (tf['rp-harm-reduction']) sections.push({ title: 'If a Slip Occurs (Harm Reduction & Reset Plan)', text: tf['rp-harm-reduction'] });
                break;
        }

        // Active Personal Contacts
        const activePersonal = (state.personalContacts || [])
            .filter(c => c.enabled && (c.name || c.phone))
            .map(c => `${c.name}${c.relationship ? ' (' + c.relationship + ')' : ''}${c.phone ? ' — ' + c.phone : ''}`);
        if (activePersonal.length > 0) {
            sections.push({
                title: 'Personal Support Network',
                items: activePersonal
            });
        }

        // Active Professional Contacts
        const activeProf = (state.professionalContacts || [])
            .filter(c => c.enabled && (c.name || c.phone))
            .map(c => `${c.role ? c.role + ': ' : ''}${c.name}${c.phone ? ' — ' + c.phone : ''}`);
        if (activeProf.length > 0) {
            sections.push({
                title: 'Clinicians, Prescribers & Local Urgent Care',
                items: activeProf
            });
        }

        // Active 24/7 Hotlines
        const activeHotlines = (state.hotlines || [])
            .filter(h => h.enabled && (h.name || h.contact))
            .map(h => `${h.name}: ${h.contact}`);
        if (activeHotlines.length > 0) {
            sections.push({
                title: '24/7 Emergency & Crisis Resources',
                items: activeHotlines,
                isEmergency: true
            });
        }

        return sections;
    }

    function renderPlanHtml(state) {
        const sections = buildPlanSections(state);
        const isCompact = state.printLayoutStyle === 'compact';

        let headerMeta = [];
        if (state.clientName) headerMeta.push(`<strong>Client:</strong> ${escapeHtml(state.clientName)}`);
        if (state.planDate) headerMeta.push(`<strong>Date:</strong> ${escapeHtml(state.planDate)}`);
        if (state.clinicianName) headerMeta.push(`<strong>Clinician:</strong> ${escapeHtml(state.clinicianName)}`);

        let bodyHtml = `<div class="plan-render-wrapper ${isCompact ? 'layout-compact' : 'layout-clinical'}">`;
        bodyHtml += `
            <div class="plan-header">
                <h2>${escapeHtml(state.templateName)}</h2>
                <div class="plan-meta">${headerMeta.join(' &nbsp;|&nbsp; ') || 'Collaborative Safety Plan'}</div>
            </div>
        `;

        // If Compact Fridge mode, highlight 24/7 Emergency numbers at the very top banner
        const emergencySec = sections.find(s => s.isEmergency);
        if (isCompact && emergencySec) {
            bodyHtml += `
                <div class="emergency-banner">
                    <strong>24/7 Immediate Crisis Support:</strong>
                    ${emergencySec.items.map(i => `<span>${escapeHtml(i)}</span>`).join(' &bull; ')}
                </div>
            `;
        }

        bodyHtml += `<div class="plan-sections-grid">`;
        sections.forEach(sec => {
            if (isCompact && sec.isEmergency) return; // Already shown in top banner
            bodyHtml += `<div class="plan-section-box ${sec.isEmergency ? 'emergency-box' : ''}">`;
            bodyHtml += `<h3>${escapeHtml(sec.title)}</h3>`;
            if (sec.items && sec.items.length > 0) {
                bodyHtml += `<ul>${sec.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
            }
            if (sec.text) {
                bodyHtml += `<p class="whitespace-pre-wrap">${escapeHtml(sec.text)}</p>`;
            }
            bodyHtml += `</div>`;
        });
        bodyHtml += `</div>`;

        if (!isCompact) {
            bodyHtml += `
                <div class="signature-block">
                    <div>Client / Youth Signature: ____________________________________ Date: ______________</div>
                    <div>Clinician / Support Signature: ______________________________ Date: ______________</div>
                </div>
            `;
        }

        bodyHtml += `</div>`;
        return bodyHtml;
    }

    function renderPlanPlainText(state) {
        const sections = buildPlanSections(state);
        let lines = [];
        lines.push(state.templateName.toUpperCase());
        lines.push('='.repeat(state.templateName.length));
        if (state.clientName) lines.push(`Client: ${state.clientName}`);
        if (state.planDate) lines.push(`Date: ${state.planDate}`);
        if (state.clinicianName) lines.push(`Clinician: ${state.clinicianName}`);
        lines.push('');

        sections.forEach(sec => {
            lines.push(`--- ${sec.title.toUpperCase()} ---`);
            if (sec.items && sec.items.length > 0) {
                sec.items.forEach(item => lines.push(`* ${item}`));
            }
            if (sec.text) {
                lines.push(sec.text);
            }
            lines.push('');
        });

        return lines.join('\n').trim();
    }

    // --- 6. Form Submit, Copy, Print, Export & Import Handlers ---
    $('#crisisForm').on('submit', function(e) {
        e.preventDefault();
        const state = collectFormState();
        const html = renderPlanHtml(state);
        $('#generatedPlanHtml').html(html);
        $('#generatedPlanContainer').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#generatedPlanContainer').offset().top - 20 }, 400);
    });

    $('input[name="printLayoutStyle"]').on('change', function() {
        if (!$('#generatedPlanContainer').hasClass('hidden')) {
            const state = collectFormState();
            $('#generatedPlanHtml').html(renderPlanHtml(state));
        }
    });

    $('#copyPlanButton').on('click', function() {
        const state = collectFormState();
        const text = renderPlanPlainText(state);
        navigator.clipboard.writeText(text).then(() => {
            alert('Crisis & Safety Plan copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy automatically. Please generate the preview and copy manually.');
        });
    });

    $('#printPlanButton').on('click', function() {
        const state = collectFormState();
        const planHtml = renderPlanHtml(state);
        const isCompact = state.printLayoutStyle === 'compact';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHtml(state.templateName)}</title>
                <style>
                    @page { margin: ${isCompact ? '0.4in' : '0.65in'}; }
                    body {
                        font-family: Georgia, "Times New Roman", serif;
                        color: #000;
                        background: #fff;
                        margin: 0;
                        font-size: ${isCompact ? '9.5pt' : '11pt'};
                        line-height: ${isCompact ? '1.3' : '1.5'};
                    }
                    .plan-header {
                        border-bottom: 2px solid #000;
                        padding-bottom: 6px;
                        margin-bottom: 10px;
                        display: flex;
                        justify-content: space-between;
                        align-items: baseline;
                        flex-wrap: wrap;
                    }
                    .plan-header h2 { margin: 0; font-size: ${isCompact ? '14pt' : '18pt'}; }
                    .plan-meta { font-size: ${isCompact ? '9pt' : '10pt'}; }
                    .emergency-banner {
                        border: 2px solid #000;
                        background: #f3f4f6;
                        padding: 6px 10px;
                        margin-bottom: 10px;
                        font-size: 9.5pt;
                    }
                    .layout-compact .plan-sections-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                    }
                    .layout-clinical .plan-sections-grid {
                        display: block;
                    }
                    .plan-section-box {
                        border: 1px solid #333;
                        border-radius: 4px;
                        padding: ${isCompact ? '6px 8px' : '10px 14px'};
                        margin-bottom: ${isCompact ? '0' : '12px'};
                        break-inside: avoid;
                    }
                    .emergency-box {
                        border: 2px solid #000;
                        background: #f9fafb;
                    }
                    .plan-section-box h3 {
                        margin: 0 0 4px 0;
                        font-size: ${isCompact ? '10pt' : '12pt'};
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 2px;
                    }
                    .plan-section-box ul {
                        margin: 4px 0 0 18px;
                        padding: 0;
                    }
                    .plan-section-box p {
                        margin: 4px 0 0 0;
                        white-space: pre-wrap;
                    }
                    .signature-block {
                        margin-top: 24px;
                        padding-top: 12px;
                        border-top: 1px solid #999;
                        display: flex;
                        justify-content: space-between;
                        gap: 20px;
                        font-size: 10pt;
                        break-inside: avoid;
                    }
                </style>
            </head>
            <body>
                ${planHtml}
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

    $('#exportTxtButton').on('click', function() {
        const state = collectFormState();
        const text = renderPlanPlainText(state);
        downloadFile(text, 'crisis_safety_plan.txt', 'text/plain;charset=utf-8');
    });

    $('#exportJsonButton').on('click', function() {
        const state = collectFormState();
        downloadFile(JSON.stringify(state, null, 2), 'crisis_safety_plan_data.json', 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', function() {
        $('#importJsonFile').click();
    });

    $('#importJsonFile').on('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            let data;
            try {
                data = JSON.parse(e.target.result);
            } catch (err) {
                alert('Invalid JSON file. Please ensure it is a valid Crisis & Safety Plan JSON file.');
                return;
            }
            document.getElementById('crisisForm').reset();
            setTimeout(() => applyImportedData(data), 0);
        };
        reader.readAsText(file);
        $(this).val('');
    });

    function ensureSelect2OptionsAndSet(selectSelector, values) {
        if (!Array.isArray(values)) return;
        const select = $(selectSelector);
        values.forEach(val => {
            if (select.find(`option[value="${escapeAttr(val)}"]`).length === 0) {
                select.append(new Option(val, val, true, true));
            }
        });
        select.val(values).trigger('change');
    }

    function applyImportedData(data) {
        if (data.template && planTemplates.some(t => t.id === data.template)) {
            $('#planTemplateSelect').val(data.template).trigger('change');
        }
        $('#clientName').val(data.clientName || '');
        $('#planDate').val(data.planDate || new Date().toISOString().split('T')[0]);
        $('#clinicianName').val(data.clinicianName || '');

        ensureSelect2OptionsAndSet('#warningSignsSelect', data.warningSigns || []);
        $('#warningSignsCustom').val(data.warningSignsCustom || '');

        ensureSelect2OptionsAndSet('#copingStrategiesSelect', data.copingStrategies || []);
        $('#copingStrategiesCustom').val(data.copingStrategiesCustom || '');

        if (data.templateFields) {
            Object.entries(data.templateFields).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) $(el).val(val);
            });
        }

        if (Array.isArray(data.personalContacts)) {
            $('#personalContactsList').empty();
            data.personalContacts.forEach(c => addPersonalContactRow(c));
        }

        if (Array.isArray(data.professionalContacts)) {
            $('#professionalContactsList').empty();
            data.professionalContacts.forEach(c => addProfessionalContactRow(c));
        }

        if (Array.isArray(data.hotlines)) {
            $('#hotlinesList').empty();
            data.hotlines.forEach(h => addHotlineRow(h));
        }

        if (data.printLayoutStyle) {
            $(`input[name="printLayoutStyle"][value="${escapeAttr(data.printLayoutStyle)}"]`).prop('checked', true);
        }

        // Automatically render preview on import
        $('#crisisForm').trigger('submit');
    }

    // Clear Form Handler
    $('#crisisForm').on('reset', function() {
        setTimeout(() => {
            $('#planDate').val(new Date().toISOString().split('T')[0]);
            $('#warningSignsSelect').val(null).trigger('change');
            $('#copingStrategiesSelect').val(null).trigger('change');
            initDefaultContactLists();
            $('#planTemplateSelect').trigger('change');
            $('#generatedPlanHtml').empty();
            $('#generatedPlanContainer').addClass('hidden');
        }, 0);
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