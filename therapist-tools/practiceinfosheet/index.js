$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_practice_info_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_practice_info_cache_enabled';

    let currentView = 'full'; // 'full' | 'therapist' | 'business' | 'tech'

    const DEFAULT_STANDARD_VOICEMAIL = `You've reached the voicemail of [Name, Credentials]. I am currently away from my phone or in session with a client.\n\nIf you are experiencing a mental health emergency, do not wait for a return call. Please dial 988 for the Suicide & Crisis Lifeline, call 911, or head to your nearest emergency room.\n\nIf you are a new caller, please leave your name, phone number, and a brief message regarding your call.\n\nFor current clients, please leave your message, and I will get back to you within 24 business hours. I'm typically in my office [Days/Hours, e.g., Tuesday through Friday 9 am to 5 pm].\n\nThank you, and I look forward to connecting.`;

    const DEFAULT_OOO_VOICEMAIL = `You have reached the voicemail of [Name, Credentials].\n\nI am currently away from the office on vacation from [Start Date] through [End Date]. I will not be checking voicemails or emails during this time.\n\nIf you are experiencing a mental health emergency or crisis, please hang up and dial 988, or proceed to your nearest emergency room.\n\nFor all other inquiries, please leave a brief message, and I will return your call when I resume normal office hours the week of [Return Date]. Thank you.`;

    // --- 1. Initialize Default Dynamic Rows & Voicemail Templates ---
    function initDefaults() {
        $('#licensesContainer').empty();
        addLicenseRow({ type: 'Primary State License (e.g., LMHC)', number: '', state: 'WA', expiration: '' });
        addLicenseRow({ type: 'Prior Associate / Secondary Credential', number: '', state: 'WA', expiration: '' });

        $('#financeAdminContainer').empty();
        addFinanceRow({ name: 'Business Banking Institution', role: 'Checking / Savings', notes: '' });
        addFinanceRow({ name: 'Accounting Software (e.g., QuickBooks Online)', role: 'Bookkeeping, Invoicing, Cash-Basis P&L', notes: 'Monthly reconciling' });
        addFinanceRow({ name: 'State Dept. of Revenue (e.g., WA My DOR)', role: 'State B&O Tax Filings (Gross Income) & DBA', notes: 'Quarterly' });
        addFinanceRow({ name: 'IRS (EFTPS / Direct Pay)', role: 'Federal Estimated Tax Payments (Net Income)', notes: 'Quarterly' });

        $('#domainsContainer').empty();
        addDomainRow({ domain: '', registrar: 'Registrar / Billing (e.g., Cloudflare / Squarespace)', dns: 'DNS & Email Routing (e.g., Cloudflare -> Google Workspace)' });

        $('#clinicalTechContainer').empty();
        addTechToolRow({ name: 'EHR & Billing Platform (e.g., Headway / SimplePractice)', purpose: 'EHR, Insurance Billing, Client Portal, Scheduling', baaSigned: true, notes: '' });
        addTechToolRow({ name: 'Email & Cloud Docs (e.g., Google Workspace)', purpose: 'Admin Hub, Email, Drive, Calendar', baaSigned: true, notes: 'HIPAA BAA signed' });
        addTechToolRow({ name: 'Business Phone / SMS (e.g., Google Voice)', purpose: 'Client Calls, Voicemail & SMS', baaSigned: true, notes: '' });
        addTechToolRow({ name: 'Referral Directory (e.g., Psychology Today)', purpose: 'New Inquiry Intake', baaSigned: false, notes: '' });

        if (!$('#standardVoicemail').val()) $('#standardVoicemail').val(DEFAULT_STANDARD_VOICEMAIL);
        if (!$('#oooVoicemail').val()) $('#oooVoicemail').val(DEFAULT_OOO_VOICEMAIL);
    }

    // --- 2. Dynamic Row Builders ---
    function addLicenseRow(item = { type: '', number: '', state: '', expiration: '' }) {
        const row = $(`
            <div class="dynamic-row license-row flex flex-wrap md:flex-nowrap items-center gap-2 p-2 border rounded-md">
                <input type="text" class="lic-type flex-1 p-2 border rounded-md text-sm" placeholder="License / Credential Type (e.g., LMHC, MC Associate, RDT)" value="${escapeAttr(item.type)}">
                <input type="text" class="lic-num flex-1 p-2 border rounded-md text-sm font-semibold" placeholder="License # (e.g., LH00000000)" value="${escapeAttr(item.number)}">
                <input type="text" class="lic-state w-20 p-2 border rounded-md text-sm" placeholder="State" value="${escapeAttr(item.state)}">
                <input type="text" class="lic-exp w-44 p-2 border rounded-md text-sm" placeholder="Exp Date (MM/DD/YYYY)" value="${escapeAttr(item.expiration)}">
                <button type="button" class="remove-row-btn btn-link text-xs px-2">Remove</button>
            </div>
        `);
        $('#licensesContainer').append(row);
    }

    function addFinanceRow(item = { name: '', role: '', notes: '' }) {
        const row = $(`
            <div class="dynamic-row finance-row flex flex-wrap md:flex-nowrap items-center gap-2 p-2 border rounded-md">
                <input type="text" class="fin-name flex-1 p-2 border rounded-md text-sm font-semibold" placeholder="Institution / Agency / Consultant" value="${escapeAttr(item.name)}">
                <input type="text" class="fin-role flex-1 p-2 border rounded-md text-sm" placeholder="Core Function (e.g., Banking, B&O Taxes, Accounting)" value="${escapeAttr(item.role)}">
                <input type="text" class="fin-notes flex-1 p-2 border rounded-md text-sm" placeholder="Cadence / Notes (e.g., Quarterly, Monthly reconciling)" value="${escapeAttr(item.notes)}">
                <button type="button" class="remove-row-btn btn-link text-xs px-2">Remove</button>
            </div>
        `);
        $('#financeAdminContainer').append(row);
    }

    function addDomainRow(item = { domain: '', registrar: '', dns: '' }) {
        const row = $(`
            <div class="dynamic-row domain-row flex flex-wrap md:flex-nowrap items-center gap-2 p-2 border rounded-md">
                <input type="text" class="dom-name flex-1 p-2 border rounded-md text-sm font-semibold" placeholder="Domain / Site (e.g., example.com)" value="${escapeAttr(item.domain)}">
                <input type="text" class="dom-reg flex-1 p-2 border rounded-md text-sm" placeholder="Registrar & Billing (e.g., Google Domains / Cloudflare)" value="${escapeAttr(item.registrar)}">
                <input type="text" class="dom-dns flex-1 p-2 border rounded-md text-sm" placeholder="DNS, Hosting & Email Connection" value="${escapeAttr(item.dns)}">
                <button type="button" class="remove-row-btn btn-link text-xs px-2">Remove</button>
            </div>
        `);
        $('#domainsContainer').append(row);
    }

    function addTechToolRow(item = { name: '', purpose: '', baaSigned: false, notes: '' }) {
        const checked = item.baaSigned ? 'checked' : '';
        const row = $(`
            <div class="dynamic-row tech-row flex flex-wrap md:flex-nowrap items-center gap-2 p-2 border rounded-md">
                <input type="text" class="tech-name flex-1 p-2 border rounded-md text-sm font-semibold" placeholder="Platform / Tool (e.g., Headway, Google Workspace)" value="${escapeAttr(item.name)}">
                <input type="text" class="tech-purpose flex-1 p-2 border rounded-md text-sm" placeholder="Clinical / Operational Use" value="${escapeAttr(item.purpose)}">
                <label class="inline-flex items-center text-xs whitespace-nowrap px-2 cursor-pointer" title="Check if a HIPAA Business Associate Agreement (BAA) is signed and on file">
                    <input type="checkbox" class="tech-baa mr-1" ${checked}> BAA Signed
                </label>
                <input type="text" class="tech-notes flex-1 p-2 border rounded-md text-sm" placeholder="Consent or Admin Notes" value="${escapeAttr(item.notes)}">
                <button type="button" class="remove-row-btn btn-link text-xs px-2">Remove</button>
            </div>
        `);
        $('#clinicalTechContainer').append(row);
    }

    $('#addLicenseRowBtn').on('click', () => addLicenseRow());
    $('#addFinanceRowBtn').on('click', () => addFinanceRow());
    $('#addDomainRowBtn').on('click', () => addDomainRow());
    $('#addTechToolRowBtn').on('click', () => addTechToolRow());

    $(document).on('click', '.remove-row-btn', function() {
        $(this).closest('.dynamic-row').remove();
        saveToLocalCacheIfEnabled();
    });

    // Taxonomy Quick-Fill
    $('#taxonomyPreset').on('change', function() {
        const val = $(this).val();
        if (!val) return;
        const current = $('#primaryTaxonomy').val().trim();
        $('#primaryTaxonomy').val(current ? `${current}; ${val}` : val);
        $(this).val('');
        saveToLocalCacheIfEnabled();
    });

    $('#loadSampleBtn').on('click', function() {
        $('#standardVoicemail').val(DEFAULT_STANDARD_VOICEMAIL);
        $('#oooVoicemail').val(DEFAULT_OOO_VOICEMAIL);
        saveToLocalCacheIfEnabled();
    });

    // --- 3. View Switcher Logic (Full, Therapist, Business, Tech) ---
    $('.view-tab-btn').on('click', function() {
        currentView = $(this).data('view');
        $('.view-tab-btn').removeClass('btn-primary');
        $(this).addClass('btn-primary');

        if (currentView === 'full') {
            $('.view-section').removeClass('hidden');
        } else {
            $('.view-section').addClass('hidden');
            $(`#section-${currentView}`).removeClass('hidden');
        }

        if (!$('#generatedSheetContainer').hasClass('hidden')) {
            const state = collectFormState();
            $('#generatedSheetHtml').html(renderSheetHtml(state, currentView));
        }
    });

    // --- 4. Collect & Apply State ---
    function collectFormState() {
        const licenses = [];
        $('.license-row').each(function() {
            licenses.push({
                type: $(this).find('.lic-type').val().trim(),
                number: $(this).find('.lic-num').val().trim(),
                state: $(this).find('.lic-state').val().trim(),
                expiration: $(this).find('.lic-exp').val().trim()
            });
        });

        const financeItems = [];
        $('.finance-row').each(function() {
            financeItems.push({
                name: $(this).find('.fin-name').val().trim(),
                role: $(this).find('.fin-role').val().trim(),
                notes: $(this).find('.fin-notes').val().trim()
            });
        });

        const domains = [];
        $('.domain-row').each(function() {
            domains.push({
                domain: $(this).find('.dom-name').val().trim(),
                registrar: $(this).find('.dom-reg').val().trim(),
                dns: $(this).find('.dom-dns').val().trim()
            });
        });

        const techTools = [];
        $('.tech-row').each(function() {
            techTools.push({
                name: $(this).find('.tech-name').val().trim(),
                purpose: $(this).find('.tech-purpose').val().trim(),
                baaSigned: $(this).find('.tech-baa').is(':checked'),
                notes: $(this).find('.tech-notes').val().trim()
            });
        });

        return {
            therapist: {
                clinicianFullName: $('#clinicianFullName').val().trim(),
                npiType1: $('#npiType1').val().trim(),
                npiType2: $('#npiType2').val().trim(),
                primaryTaxonomy: $('#primaryTaxonomy').val().trim(),
                licenses: licenses,
                caqhId: $('#caqhId').val().trim(),
                caqhAttestDate: $('#caqhAttestDate').val(),
                providerOneId: $('#providerOneId').val().trim(),
                providerOneNotes: $('#providerOneNotes').val().trim(),
                malpracticeCarrier: $('#malpracticeCarrier').val().trim(),
                malpracticePolicyNum: $('#malpracticePolicyNum').val().trim(),
                malpracticeCoverage: $('#malpracticeCoverage').val().trim(),
                malpracticeRenewal: $('#malpracticeRenewal').val(),
                standardVoicemail: $('#standardVoicemail').val().trim(),
                oooVoicemail: $('#oooVoicemail').val().trim()
            },
            business: {
                legalBusinessName: $('#legalBusinessName').val().trim(),
                tradeDbaName: $('#tradeDbaName').val().trim(),
                entityStructure: $('#entityStructure').val().trim(),
                businessPhone: $('#businessPhone').val().trim(),
                businessEmail: $('#businessEmail').val().trim(),
                businessWebsite: $('#businessWebsite').val().trim(),
                businessAddress: $('#businessAddress').val().trim(),
                registeredAgentInfo: $('#registeredAgentInfo').val().trim(),
                einNumber: $('#einNumber').val().trim(),
                ubiNumber: $('#ubiNumber').val().trim(),
                cityLicenseNumber: $('#cityLicenseNumber').val().trim(),
                naicsCode: $('#naicsCode').val().trim(),
                financeItems: financeItems
            },
            tech: {
                domains: domains,
                techTools: techTools,
                recoveryAndSecurityNotes: $('#recoveryAndSecurityNotes').val().trim()
            }
        };
    }

    function applyImportedState(data) {
        if (!data || typeof data !== 'object') return;
        const t = data.therapist || {};
        const b = data.business || {};
        const k = data.tech || {};

        $('#clinicianFullName').val(t.clinicianFullName || '');
        $('#npiType1').val(t.npiType1 || '');
        $('#npiType2').val(t.npiType2 || '');
        $('#primaryTaxonomy').val(t.primaryTaxonomy || '');
        $('#caqhId').val(t.caqhId || '');
        $('#caqhAttestDate').val(t.caqhAttestDate || '');
        $('#providerOneId').val(t.providerOneId || '');
        $('#providerOneNotes').val(t.providerOneNotes || '');
        $('#malpracticeCarrier').val(t.malpracticeCarrier || '');
        $('#malpracticePolicyNum').val(t.malpracticePolicyNum || '');
        $('#malpracticeCoverage').val(t.malpracticeCoverage || '');
        $('#malpracticeRenewal').val(t.malpracticeRenewal || '');
        $('#standardVoicemail').val(t.standardVoicemail || '');
        $('#oooVoicemail').val(t.oooVoicemail || '');

        if (Array.isArray(t.licenses)) {
            $('#licensesContainer').empty();
            t.licenses.forEach(l => addLicenseRow(l));
        }

        $('#legalBusinessName').val(b.legalBusinessName || '');
        $('#tradeDbaName').val(b.tradeDbaName || '');
        $('#entityStructure').val(b.entityStructure || '');
        $('#businessPhone').val(b.businessPhone || '');
        $('#businessEmail').val(b.businessEmail || '');
        $('#businessWebsite').val(b.businessWebsite || '');
        $('#businessAddress').val(b.businessAddress || '');
        $('#registeredAgentInfo').val(b.registeredAgentInfo || '');
        $('#einNumber').val(b.einNumber || '');
        $('#ubiNumber').val(b.ubiNumber || '');
        $('#cityLicenseNumber').val(b.cityLicenseNumber || '');
        $('#naicsCode').val(b.naicsCode || '');

        if (Array.isArray(b.financeItems)) {
            $('#financeAdminContainer').empty();
            b.financeItems.forEach(f => addFinanceRow(f));
        }

        if (Array.isArray(k.domains)) {
            $('#domainsContainer').empty();
            k.domains.forEach(d => addDomainRow(d));
        }

        if (Array.isArray(k.techTools)) {
            $('#clinicalTechContainer').empty();
            k.techTools.forEach(tool => addTechToolRow(tool));
        }

        $('#recoveryAndSecurityNotes').val(k.recoveryAndSecurityNotes || '');
        saveToLocalCacheIfEnabled();
    }

    // --- 5. Render Clean HTML & Plain Text Output (Respecting Current View) ---
    function renderSheetHtml(state, viewMode) {
        const showTherapist = viewMode === 'full' || viewMode === 'therapist';
        const showBusiness = viewMode === 'full' || viewMode === 'business';
        const showTech = viewMode === 'full' || viewMode === 'tech';

        const titleMap = {
            full: 'Private Practice Master Info Sheet (Full Practice View)',
            therapist: 'Clinical & Credentialing Quick Reference (Therapist View)',
            business: 'Business Entity, Tax & Admin Quick Reference (Business View)',
            tech: 'Tech & Admin Stack Directory (Tech Stack View)'
        };

        const headerTitle = state.business.legalBusinessName || state.therapist.clinicianFullName || 'Private Practice Reference Sheet';
        const subtitle = titleMap[viewMode] || titleMap.full;

        let html = `
            <div class="sheet-render-wrapper">
                <div class="sheet-header">
                    <h2>${escapeHtml(headerTitle)}</h2>
                    <div class="sheet-subtitle">${escapeHtml(subtitle)}</div>
                </div>
        `;

        // 1. THERAPIST VIEW BLOCK
        if (showTherapist) {
            const t = state.therapist;
            const activeLicenses = (t.licenses || []).filter(l => l.type || l.number);

            html += `
                <div class="sheet-section">
                    <h3>1. Therapist &amp; Clinical Credentialing</h3>
                    <div class="kv-grid">
                        <div><strong>Clinician:</strong> ${escapeHtml(t.clinicianFullName || '—')}</div>
                        <div><strong>Individual NPI (Type 1):</strong> ${escapeHtml(t.npiType1 || '—')}</div>
                        <div><strong>Group NPI (Type 2):</strong> ${escapeHtml(t.npiType2 || '—')}</div>
                        <div><strong>Taxonomy Code(s):</strong> ${escapeHtml(t.primaryTaxonomy || '—')}</div>
                        <div><strong>CAQH ID:</strong> ${escapeHtml(t.caqhId || '—')} ${t.caqhAttestDate ? `(Last Attested: ${escapeHtml(t.caqhAttestDate)})` : ''}</div>
                        <div><strong>Medicaid / ProviderOne:</strong> ${escapeHtml(t.providerOneId || '—')}</div>
                    </div>
                    ${t.providerOneNotes ? `<div class="note-callout"><strong>Portal Login / Reset Note:</strong> ${escapeHtml(t.providerOneNotes)}</div>` : ''}
            `;

            if (activeLicenses.length > 0) {
                html += `
                    <h4>Licenses &amp; Credentials</h4>
                    <table class="sheet-table">
                        <thead>
                            <tr><th>Credential / Type</th><th>License Number</th><th>State</th><th>Expiration Date</th></tr>
                        </thead>
                        <tbody>
                            ${activeLicenses.map(l => `
                                <tr>
                                    <td>${escapeHtml(l.type)}</td>
                                    <td><strong>${escapeHtml(l.number)}</strong></td>
                                    <td>${escapeHtml(l.state)}</td>
                                    <td>${escapeHtml(l.expiration)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            if (t.malpracticeCarrier || t.malpracticePolicyNum) {
                html += `
                    <h4>Professional Liability / Malpractice Insurance</h4>
                    <div class="kv-grid">
                        <div><strong>Carrier:</strong> ${escapeHtml(t.malpracticeCarrier || '—')}</div>
                        <div><strong>Policy #:</strong> ${escapeHtml(t.malpracticePolicyNum || '—')}</div>
                        <div><strong>Limits:</strong> ${escapeHtml(t.malpracticeCoverage || '—')}</div>
                        <div><strong>Renewal:</strong> ${escapeHtml(t.malpracticeRenewal || '—')}</div>
                    </div>
                `;
            }

            if (t.standardVoicemail || t.oooVoicemail) {
                html += `<div class="voicemail-grid">`;
                if (t.standardVoicemail) {
                    html += `
                        <div class="script-box">
                            <h4>Standard Voicemail Script</h4>
                            <p>${escapeHtml(t.standardVoicemail)}</p>
                        </div>
                    `;
                }
                if (t.oooVoicemail) {
                    html += `
                        <div class="script-box">
                            <h4>Out-of-Office (OOO) Voicemail Script</h4>
                            <p>${escapeHtml(t.oooVoicemail)}</p>
                        </div>
                    `;
                }
                html += `</div>`;
            }
            html += `</div>`;
        }

        // 2. BUSINESS VIEW BLOCK
        if (showBusiness) {
            const b = state.business;
            const activeFin = (b.financeItems || []).filter(f => f.name || f.role);

            html += `
                <div class="sheet-section">
                    <h3>2. Business Entity, Tax &amp; Contact Info</h3>
                    <div class="kv-grid">
                        <div><strong>Legal Business Name:</strong> ${escapeHtml(b.legalBusinessName || '—')}</div>
                        <div><strong>Trade Name / DBA:</strong> ${escapeHtml(b.tradeDbaName || '—')}</div>
                        <div><strong>Entity Structure:</strong> ${escapeHtml(b.entityStructure || '—')}</div>
                        <div><strong>Federal EIN:</strong> <strong>${escapeHtml(b.einNumber || '—')}</strong></div>
                        <div><strong>State UBI / Tax #:</strong> <strong>${escapeHtml(b.ubiNumber || '—')}</strong></div>
                        <div><strong>City License #:</strong> ${escapeHtml(b.cityLicenseNumber || '—')}</div>
                        <div><strong>NAICS Code:</strong> ${escapeHtml(b.naicsCode || '—')}</div>
                        <div><strong>Phone:</strong> ${escapeHtml(b.businessPhone || '—')}</div>
                        <div><strong>Email:</strong> ${escapeHtml(b.businessEmail || '—')}</div>
                        <div><strong>Website:</strong> ${escapeHtml(b.businessWebsite || '—')}</div>
                        <div><strong>Address:</strong> ${escapeHtml(b.businessAddress || '—')}</div>
                        <div><strong>Registered Agent / SOS:</strong> ${escapeHtml(b.registeredAgentInfo || '—')}</div>
                    </div>
            `;

            if (activeFin.length > 0) {
                html += `
                    <h4>Financial, Accounting &amp; Tax Cadence</h4>
                    <table class="sheet-table">
                        <thead>
                            <tr><th>Institution / Agency</th><th>Function</th><th>Cadence &amp; Notes</th></tr>
                        </thead>
                        <tbody>
                            ${activeFin.map(f => `
                                <tr>
                                    <td><strong>${escapeHtml(f.name)}</strong></td>
                                    <td>${escapeHtml(f.role)}</td>
                                    <td>${escapeHtml(f.notes)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
            html += `</div>`;
        }

        // 3. TECH STACK VIEW BLOCK
        if (showTech) {
            const k = state.tech;
            const activeDomains = (k.domains || []).filter(d => d.domain || d.registrar || d.dns);
            const activeTools = (k.techTools || []).filter(t => t.name || t.purpose);

            html += `<div class="sheet-section"><h3>3. Tech &amp; Admin Stack Directory</h3>`;

            if (activeDomains.length > 0) {
                html += `
                    <h4>Domain &amp; Web Architecture</h4>
                    <table class="sheet-table">
                        <thead>
                            <tr><th>Domain / Site</th><th>Registrar &amp; Billing</th><th>DNS, Hosting &amp; Pipeline</th></tr>
                        </thead>
                        <tbody>
                            ${activeDomains.map(d => `
                                <tr>
                                    <td><strong>${escapeHtml(d.domain)}</strong></td>
                                    <td>${escapeHtml(d.registrar)}</td>
                                    <td>${escapeHtml(d.dns)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            if (activeTools.length > 0) {
                html += `
                    <h4>Clinical &amp; Practice Operations Software</h4>
                    <table class="sheet-table">
                        <thead>
                            <tr><th>Platform / Service</th><th>Operational Role</th><th>HIPAA BAA</th><th>Notes</th></tr>
                        </thead>
                        <tbody>
                            ${activeTools.map(tool => `
                                <tr>
                                    <td><strong>${escapeHtml(tool.name)}</strong></td>
                                    <td>${escapeHtml(tool.purpose)}</td>
                                    <td>${tool.baaSigned ? '✅ BAA Signed' : '—'}</td>
                                    <td>${escapeHtml(tool.notes)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            if (k.recoveryAndSecurityNotes) {
                html += `
                    <div class="note-callout">
                        <strong>Recovery Keys &amp; Pipeline Notes:</strong><br>
                        <span class="whitespace-pre-wrap">${escapeHtml(k.recoveryAndSecurityNotes)}</span>
                    </div>
                `;
            }

            html += `</div>`;
        }

        html += `</div>`;
        return html;
    }

    function renderPlainText(state, viewMode) {
        const showTherapist = viewMode === 'full' || viewMode === 'therapist';
        const showBusiness = viewMode === 'full' || viewMode === 'business';
        const showTech = viewMode === 'full' || viewMode === 'tech';

        const lines = [];
        lines.push((state.business.legalBusinessName || state.therapist.clinicianFullName || 'PRACTICE INFO SHEET').toUpperCase());
        lines.push('==================================================');
        lines.push('');

        if (showTherapist) {
            const t = state.therapist;
            lines.push('1. THERAPIST & CLINICAL CREDENTIALING VIEW');
            lines.push('------------------------------------------');
            if (t.clinicianFullName) lines.push(`Clinician: ${t.clinicianFullName}`);
            if (t.npiType1) lines.push(`NPI (Type 1 - Individual): ${t.npiType1}`);
            if (t.npiType2) lines.push(`NPI (Type 2 - Group/Org): ${t.npiType2}`);
            if (t.primaryTaxonomy) lines.push(`Taxonomy Code(s): ${t.primaryTaxonomy}`);
            if (t.caqhId) lines.push(`CAQH ID: ${t.caqhId}${t.caqhAttestDate ? ' (Last Attested: ' + t.caqhAttestDate + ')' : ''}`);
            if (t.providerOneId) lines.push(`Medicaid / ProviderOne: ${t.providerOneId}`);
            if (t.providerOneNotes) lines.push(`ProviderOne Notes: ${t.providerOneNotes}`);
            (t.licenses || []).forEach(l => {
                if (l.type || l.number) lines.push(`License (${l.type || 'Credential'}): ${l.number} | ${l.state} | Exp: ${l.expiration}`);
            });
            if (t.malpracticeCarrier || t.malpracticePolicyNum) {
                lines.push(`Malpractice Insurance: ${t.malpracticeCarrier} | Policy #: ${t.malpracticePolicyNum} | Limits: ${t.malpracticeCoverage} | Renews: ${t.malpracticeRenewal}`);
            }
            if (t.standardVoicemail) lines.push(`\nStandard Voicemail:\n${t.standardVoicemail}`);
            if (t.oooVoicemail) lines.push(`\nOOO Voicemail:\n${t.oooVoicemail}`);
            lines.push('');
        }

        if (showBusiness) {
            const b = state.business;
            lines.push('2. BUSINESS ENTITY, TAX & CONTACT VIEW');
            lines.push('--------------------------------------');
            if (b.legalBusinessName) lines.push(`Business Name: ${b.legalBusinessName}`);
            if (b.tradeDbaName) lines.push(`Trade Name / DBA: ${b.tradeDbaName}`);
            if (b.entityStructure) lines.push(`Entity Structure: ${b.entityStructure}`);
            if (b.einNumber) lines.push(`EIN: ${b.einNumber}`);
            if (b.ubiNumber) lines.push(`UBI / State Tax #: ${b.ubiNumber}`);
            if (b.cityLicenseNumber) lines.push(`City Business License #: ${b.cityLicenseNumber}`);
            if (b.naicsCode) lines.push(`NAICS Code: ${b.naicsCode}`);
            if (b.businessPhone) lines.push(`Phone: ${b.businessPhone}`);
            if (b.businessEmail) lines.push(`Email: ${b.businessEmail}`);
            if (b.businessWebsite) lines.push(`Website: ${b.businessWebsite}`);
            if (b.businessAddress) lines.push(`Address: ${b.businessAddress}`);
            if (b.registeredAgentInfo) lines.push(`Registered Agent / SOS: ${b.registeredAgentInfo}`);
            (b.financeItems || []).forEach(f => {
                if (f.name || f.role) lines.push(`* ${f.name}: ${f.role}${f.notes ? ' (' + f.notes + ')' : ''}`);
            });
            lines.push('');
        }

        if (showTech) {
            const k = state.tech;
            lines.push('3. TECH & ADMIN STACK DIRECTORY');
            lines.push('-------------------------------');
            (k.domains || []).forEach(d => {
                if (d.domain || d.registrar) lines.push(`* Domain ${d.domain}: ${d.registrar} | ${d.dns}`);
            });
            (k.techTools || []).forEach(tool => {
                if (tool.name || tool.purpose) {
                    lines.push(`* ${tool.name}: ${tool.purpose}${tool.baaSigned ? ' [BAA Signed]' : ''}${tool.notes ? ' — ' + tool.notes : ''}`);
                }
            });
            if (k.recoveryAndSecurityNotes) lines.push(`\nRecovery / Security Notes:\n${k.recoveryAndSecurityNotes}`);
        }

        return lines.join('\n').trim();
    }

    // --- 6. Local Cache Option ---
    function checkLocalCacheOnLoad() {
        const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
        $('#localCacheToggle').prop('checked', isEnabled);
        if (isEnabled) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    applyImportedState(JSON.parse(raw));
                    return;
                } catch (e) {
                    console.error('Error loading cached practice sheet:', e);
                }
            }
        }
        initDefaults();
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormState()));
        }
    }

    $('#practiceInfoForm').on('input change', 'input, textarea, select', function() {
        saveToLocalCacheIfEnabled();
    });

    // --- 7. Submit, Print, Copy, Export & Import Handlers ---
    $('#practiceInfoForm').on('submit', function(e) {
        e.preventDefault();
        const state = collectFormState();
        $('#generatedSheetHtml').html(renderSheetHtml(state, currentView));
        $('#generatedSheetContainer').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#generatedSheetContainer').offset().top - 20 }, 400);
    });

    $('#printSheetButton').on('click', function() {
        const state = collectFormState();
        const html = renderSheetHtml(state, currentView);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Practice Info Sheet</title>
                <style>
                    @page { margin: 0.55in; }
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; background: #fff; font-size: 10pt; line-height: 1.4; margin: 0; }
                    .sheet-header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 14px; }
                    .sheet-header h2 { margin: 0; font-size: 16pt; }
                    .sheet-subtitle { font-size: 9.5pt; color: #444; }
                    .sheet-section { margin-bottom: 18px; break-inside: avoid; }
                    .sheet-section h3 { font-size: 12.5pt; border-bottom: 1px solid #000; padding-bottom: 3px; margin: 12px 0 8px 0; }
                    .sheet-section h4 { font-size: 10.5pt; margin: 10px 0 4px 0; }
                    .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 8px; }
                    .sheet-table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 8px; font-size: 9.5pt; }
                    .sheet-table th, .sheet-table td { border: 1px solid #444; padding: 5px 7px; text-align: left; vertical-align: top; }
                    .sheet-table th { background: #eee; }
                    .note-callout { border: 1px solid #555; background: #f9fafb; padding: 6px 10px; border-radius: 4px; margin-top: 6px; font-size: 9.5pt; }
                    .voicemail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
                    .script-box { border: 1px solid #444; padding: 8px 10px; border-radius: 4px; break-inside: avoid; }
                    .script-box h4 { margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
                    .script-box p { white-space: pre-wrap; margin: 4px 0 0 0; font-size: 9pt; }
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

    $('#copySheetButton').on('click', function() {
        const text = renderPlainText(collectFormState(), currentView);
        navigator.clipboard.writeText(text).then(() => {
            alert('Practice Info Sheet copied to clipboard!');
        });
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
        const text = renderPlainText(collectFormState(), currentView);
        downloadFile(text, `practice_info_${currentView}.txt`, 'text/plain;charset=utf-8');
    });

    $('#exportJsonButtonTop, #exportJsonButtonBottom').on('click', function() {
        const state = collectFormState();
        downloadFile(JSON.stringify(state, null, 2), 'practice_master_info.json', 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', function() {
        $('#importJsonFile').click();
    });

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                applyImportedState(parsed);
                $('#practiceInfoForm').trigger('submit');
            } catch (err) {
                alert('Invalid JSON file. Please upload a valid Practice Info Sheet .json file.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#clearFormButton').on('click', function() {
        if (!confirm('Clear all fields on the Practice Info Sheet? Make sure you have exported your .json backup first.')) return;
        document.getElementById('practiceInfoForm').reset();
        $('#standardVoicemail').val('');
        $('#oooVoicemail').val('');
        localStorage.removeItem(STORAGE_KEY);
        initDefaults();
        $('#generatedSheetContainer').addClass('hidden');
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