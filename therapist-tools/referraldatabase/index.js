$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_referral_db_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_referral_db_cache_enabled';

    const PRESET_INSURANCES = [
        'Aetna',
        'Premera Blue Cross',
        'Regence BlueShield',
        'First Choice Health (FCHN)',
        'UnitedHealthcare / Optum',
        'Cigna / Evernorth',
        'Kaiser Permanente',
        'Apple Health / WA Medicaid (ProviderOne)',
        'Molina (Medicaid / Marketplace)',
        'Coordinated Care (Ambetter / Medicaid)',
        'Community Health Plan of WA (CHPW)',
        'Wellpoint / Amerigroup',
        'Medicare',
        'Tricare / VA',
        'Lyra / Modern Health / Spring Health (EAP)',
        'Out-of-Network (Provides Superbill)',
        'Sliding Scale Available',
        'Open Path Collective',
        'Private Pay Only'
    ];

    const PRESET_SPECIALTIES = [
        'Complex Trauma / C-PTSD',
        'EMDR',
        'Brainspotting',
        'Somatic Experiencing / Sensorimotor',
        'Internal Family Systems (IFS / Parts Work)',
        'Drama Therapy / Expressive Arts',
        'Play Therapy / Sandtray',
        'DBT (Dialectical Behavior Therapy)',
        'CBT / ACT (Acceptance & Commitment)',
        'OCD / ERP (Exposure & Response Prevention)',
        'Eating Disorders / HAES / Intuitive Eating',
        'ADHD / Executive Functioning Coaching',
        'Autism / Late-Identified Neurodivergence',
        'Substance Use / Harm Reduction / Recovery',
        'Grief, Loss & Bereavement',
        'Chronic Illness, Pain & Medical Trauma',
        'Perinatal / Postpartum Mental Health',
        'Dissociative Disorders',
        'Religious Trauma / Spiritual Deconstruction',
        'Gottman Method / EFT (Couples)'
    ];

    const PRESET_POPULATIONS = [
        'Neurodivergent-Affirming (Autism / ADHD / AuDHD)',
        'LGBTQIA+ & Queer-Affirming',
        'Trans & Gender-Affirming (Writes GAS Letters)',
        'BIPOC-Affirming / Culturally Responsive',
        'Polyamorous / ENM / Kink-Affirming',
        'Body-Liberation / Fat-Positive / HAES',
        'Children (Under 12)',
        'Teens & Adolescents (13–17)',
        'Young Adults / College (18–25)',
        'Adults',
        'Older Adults / Seniors (65+)',
        'Couples & Partnerships',
        'Families & Co-Parents',
        'Healthcare Workers / First Responders / Therapists'
    ];

    let appState = {
        referrals: []
    };

    // Tracks which provider IDs the clinician checked for the current client email
    let selectedHandoutIds = new Set();

    // --- 1. Initialize Select2 Dropdowns ---
    function initSelect2Dropdown(selector, items, placeholder) {
        const el = $(selector);
        el.empty();
        items.forEach(item => el.append(new Option(item, item)));
        el.select2({
            placeholder: placeholder,
            allowClear: true,
            multiple: true,
            tags: true,
            width: '100%'
        });
    }

    initSelect2Dropdown('#refInsurancesSelect', PRESET_INSURANCES, 'Select insurances or type custom...');
    initSelect2Dropdown('#refSpecialtiesSelect', PRESET_SPECIALTIES, 'Select clinical specialties/modalities...');
    initSelect2Dropdown('#refPopulationsSelect', PRESET_POPULATIONS, 'Select populations & affirming identities...');

    $('#refLastVerified').val(new Date().toISOString().split('T')[0]);

    $('#toggleFormCollapseBtn').on('click', function() {
        $('#referralForm').toggleClass('hidden');
    });

    $('#jumpToEmailBtn').on('click', function() {
        $('html, body').animate({ scrollTop: $('#client-email-section').offset().top - 20 }, 400);
    });

    // --- 2. Filter & Search Ongoing Referral List ---
    function getFilteredReferrals() {
        const kw = ($('#searchKeyword').val() || '').toLowerCase().trim();
        const roleFilter = $('#filterRole').val();
        const modFilter = $('#filterModality').val();
        const availFilter = $('#filterAvailability').val();

        return appState.referrals.filter(r => {
            if (roleFilter !== 'ALL' && r.role !== roleFilter) return false;
            if (modFilter === 'In-Person' && !String(r.modality).includes('In-Person')) return false;
            if (modFilter === 'Telehealth' && !String(r.modality).includes('Telehealth')) return false;
            if (availFilter !== 'ALL' && r.availability !== availFilter) return false;

            if (kw) {
                const haystack = [
                    r.name, r.pronouns, r.practice, r.role, r.location, r.phone, r.email,
                    r.feeRange, r.publicBio, r.privateNotes,
                    ...(r.insurances || []),
                    ...(r.specialties || []),
                    ...(r.populations || [])
                ].join(' ').toLowerCase();
                if (!haystack.includes(kw)) return false;
            }
            return true;
        });
    }

    function getPickedProviders() {
        return appState.referrals.filter(r => selectedHandoutIds.has(r.id));
    }

    // --- 3. Render Directory Cards & Live Referral Email ---
    function renderAll() {
        const filtered = getFilteredReferrals();
        $('#referralCountBadge').text(`${filtered.length} of ${appState.referrals.length} Providers Shown`);
        $('#selectedCartCount').text(selectedHandoutIds.size);

        const container = $('#referralCardsContainer');
        container.empty();

        if (filtered.length === 0) {
            container.append(`
                <div class="subpanel p-6 rounded-md text-center muted">
                    No providers in your list match the current filter. Log a provider above or click <strong>Import Master .json</strong> to load your saved list.
                </div>
            `);
        } else {
            const sorted = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            sorted.forEach(ref => {
                const isSelected = selectedHandoutIds.has(ref.id);
                const availBadge = getAvailabilityBadgeHtml(ref.availability);

                const insTags = (ref.insurances || []).map(i => `<span class="ref-tag tag-ins">${escapeHtml(i)}</span>`).join(' ');
                const specTags = (ref.specialties || []).map(s => `<span class="ref-tag tag-spec">${escapeHtml(s)}</span>`).join(' ');
                const popTags = (ref.populations || []).map(p => `<span class="ref-tag tag-pop">${escapeHtml(p)}</span>`).join(' ');

                let websiteHtml = '';
                if (ref.website) {
                    const url = /^https?:\/\//i.test(ref.website) ? ref.website : 'https://' + ref.website;
                    websiteHtml = `<a href="${escapeAttr(url)}" target="_blank" rel="noopener" class="btn-link text-xs">Website / Profile</a>`;
                }

                container.append(`
                    <div class="subpanel p-4 rounded-md border referral-card ${isSelected ? 'selected-for-handout' : ''}">
                        <div class="flex flex-wrap justify-between items-start gap-2 pb-2 border-b">
                            <div>
                                <label class="inline-flex items-center cursor-pointer mr-2" title="Check to include this provider in the Client Referral Email below">
                                    <input type="checkbox" class="handout-select-cb mr-2" data-id="${ref.id}" ${isSelected ? 'checked' : ''}>
                                    <span class="text-lg font-bold">${escapeHtml(ref.name)}</span>
                                </label>
                                ${ref.pronouns ? `<span class="muted text-xs">(${escapeHtml(ref.pronouns)})</span>` : ''}
                                <div class="text-xs font-semibold mt-1">
                                    ${escapeHtml(ref.role)}
                                    ${ref.practice ? ` &bull; <span class="muted">${escapeHtml(ref.practice)}</span>` : ''}
                                </div>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                ${availBadge}
                                <button type="button" class="btn-link text-xs edit-referral-btn ml-2" data-id="${ref.id}">Edit</button>
                                <button type="button" class="btn-link text-xs delete-referral-btn" data-id="${ref.id}">Delete</button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 py-3 text-xs border-b">
                            <div>
                                <strong>Contact:</strong><br>
                                ${ref.phone ? `📞 ${escapeHtml(ref.phone)}<br>` : ''}
                                ${ref.email ? `✉️ <a href="mailto:${escapeAttr(ref.email)}" class="btn-link">${escapeHtml(ref.email)}</a><br>` : ''}
                                ${websiteHtml}
                            </div>
                            <div>
                                <strong>Location &amp; Modality:</strong><br>
                                📍 ${escapeHtml(ref.location || 'Unspecified')}<br>
                                💻 ${escapeHtml(ref.modality || 'Both In-Person & Telehealth')}
                            </div>
                            <div>
                                <strong>Fees &amp; Last Verified:</strong><br>
                                💲 ${escapeHtml(ref.feeRange || 'Contact for rates')}<br>
                                <span class="muted">Verified: ${escapeHtml(ref.lastVerified || '—')}</span>
                            </div>
                        </div>

                        <div class="py-2 space-y-2 text-xs">
                            ${insTags ? `<div><strong class="mr-1">Insurance / Pay:</strong> ${insTags}</div>` : ''}
                            ${specTags ? `<div><strong class="mr-1">Specialties:</strong> ${specTags}</div>` : ''}
                            ${popTags ? `<div><strong class="mr-1">Populations / Identity:</strong> ${popTags}</div>` : ''}
                        </div>

                        ${ref.publicBio ? `
                            <div class="mt-2 pt-2 border-t text-xs">
                                <strong>Client Summary:</strong> ${escapeHtml(ref.publicBio)}
                            </div>
                        ` : ''}

                        ${ref.privateNotes ? `
                            <div class="mt-2 p-2 rounded-md private-note-box text-xs">
                                <strong>🔒 Private Clinician Note (Excluded from Client Emails/Exports):</strong> ${escapeHtml(ref.privateNotes)}
                            </div>
                        ` : ''}
                    </div>
                `);
            });
        }

        renderClientReferralEmail();
        saveToLocalCacheIfEnabled();
    }

    function getAvailabilityBadgeHtml(status) {
        if (status === 'Accepting New Clients') {
            return `<span class="avail-badge avail-open">🟢 Accepting New Clients</span>`;
        } else if (status === 'Waitlist Only') {
            return `<span class="avail-badge avail-wait">🟡 Waitlist Only</span>`;
        } else if (status === 'Full / Not Accepting') {
            return `<span class="avail-badge avail-full">🔴 Full / Closed</span>`;
        }
        return `<span class="avail-badge avail-unknown">⚪ Verify Availability</span>`;
    }

    // --- 4. Build the Rendered Client Referral Out Email ---
    function formatProviderBullet(ref, includeDetails) {
        // Core format: - [Referral Name / Practice / Link]
        const primaryParts = [ref.name];
        if (ref.practice) primaryParts.push(ref.practice);

        const contactOrLink = [];
        if (ref.website) contactOrLink.push(ref.website);
        if (ref.phone) contactOrLink.push(ref.phone);
        if (ref.email) contactOrLink.push(ref.email);

        if (contactOrLink.length > 0) {
            primaryParts.push(contactOrLink.join(' | '));
        }

        let bullet = `- ${primaryParts.join(' / ')}`;

        if (includeDetails) {
            const subDetails = [];
            if (ref.modality) subDetails.push(ref.modality);
            if (ref.location) subDetails.push(ref.location);
            if (ref.insurances && ref.insurances.length > 0) subDetails.push(`Insurance/Pay: ${ref.insurances.join(', ')}`);
            if (ref.specialties && ref.specialties.length > 0) subDetails.push(`Specialties: ${ref.specialties.join(', ')}`);
            if (ref.publicBio) subDetails.push(ref.publicBio);
            if (subDetails.length > 0) {
                bullet += `\n  (${subDetails.join(' — ')})`;
            }
        }
        return bullet;
    }

    function renderClientReferralEmail() {
        const subject = $('#emailSubjectLine').val().trim() || 'Re: Therapy Inquiry';
        const greeting = $('#clientInquiryName').val().trim();
        const reasonOption = $('input[name="referralReasonOption"]:checked').val();
        const scopeFocus = $('#customScopeFocus').val().trim() || 'supporting neurodivergence';
        const extraDirectory = $('#extraDirectoryBullet').val().trim();
        const signOff = $('#clinicianSignOff').val().trim();
        const includeDetails = $('#includeDetailedBulletInfo').is(':checked');

        $('#scopePreviewText').text(scopeFocus);

        const picked = getPickedProviders();
        const lines = [];

        lines.push(`Subject: ${subject}`);
        lines.push('');

        if (greeting) {
            lines.push(greeting);
            lines.push('');
        }

        if (reasonOption !== 'currentClient') {
            lines.push('Thank you for reaching out and sharing a bit about your mental health journey so far.');
            lines.push('');
        }

        const optionAText = 'I am currently at full capacity and unable to take on new clients at this time.';
        const optionBText = `While your goals are deeply important, my practice currently focuses primarily on ${scopeFocus}, so I want to make sure you get connected with someone who specializes directly in what you're looking for.`;

        if (reasonOption === 'optionA') {
            lines.push(optionAText);
            lines.push('');
        } else if (reasonOption === 'optionB') {
            lines.push(optionBText);
            lines.push('');
        } else if (reasonOption === 'bothAB') {
            lines.push(`${optionAText} ${optionBText}`);
            lines.push('');
        }

        lines.push('To support your search, I’ve included a few recommended resources and colleagues below who may have availability:');
        lines.push('');

        if (picked.length > 0) {
            picked.forEach(ref => {
                lines.push(formatProviderBullet(ref, includeDetails));
            });
        } else {
            lines.push('- [Check the box next to any provider in your Referral List above to insert them here]');
        }

        if (extraDirectory) {
            lines.push(`- ${extraDirectory}`);
        }

        lines.push('');
        lines.push('I wish you the very best on your path to finding the right care! If you still struggle to find a good fit for yourself, please feel free to reach back out, and I can continue to find other recommendations that may be of interest.');

        if (signOff) {
            lines.push('');
            lines.push(signOff);
        }

        $('#generatedEmailText').val(lines.join('\n'));
    }

    // Live Email Listeners
    $('#clientInquiryName, #emailSubjectLine, #clinicianSignOff, #customScopeFocus, #extraDirectoryBullet').on('input change', renderClientReferralEmail);
    $('input[name="referralReasonOption"], #includeDetailedBulletInfo').on('change', renderClientReferralEmail);

    // --- 5. Add / Edit / Delete Referral Handlers ---
    $('#referralForm').on('submit', function(e) {
        e.preventDefault();
        const editingId = $('#editingReferralId').val();

        const refObj = {
            id: editingId || 'ref_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: $('#refName').val().trim(),
            pronouns: $('#refPronouns').val().trim(),
            practice: $('#refPractice').val().trim(),
            role: $('#refRole').val(),
            phone: $('#refPhone').val().trim(),
            email: $('#refEmail').val().trim(),
            website: $('#refWebsite').val().trim(),
            location: $('#refLocation').val().trim(),
            modality: $('#refModality').val(),
            availability: $('#refAvailability').val(),
            feeRange: $('#refFeeRange').val().trim(),
            lastVerified: $('#refLastVerified').val(),
            insurances: $('#refInsurancesSelect').val() || [],
            specialties: $('#refSpecialtiesSelect').val() || [],
            populations: $('#refPopulationsSelect').val() || [],
            publicBio: $('#refPublicBio').val().trim(),
            privateNotes: $('#refPrivateNotes').val().trim()
        };

        if (editingId) {
            const idx = appState.referrals.findIndex(r => r.id === editingId);
            if (idx > -1) appState.referrals[idx] = refObj;
        } else {
            appState.referrals.push(refObj);
        }

        resetReferralForm();
        renderAll();
    });

    function resetReferralForm() {
        document.getElementById('referralForm').reset();
        $('#editingReferralId').val('');
        $('#refLastVerified').val(new Date().toISOString().split('T')[0]);
        $('#refInsurancesSelect').val(null).trigger('change');
        $('#refSpecialtiesSelect').val(null).trigger('change');
        $('#refPopulationsSelect').val(null).trigger('change');
        $('#saveReferralBtn').text('Add Provider to Ongoing List');
        $('#cancelReferralEditBtn').addClass('hidden');
    }

    $('#cancelReferralEditBtn').on('click', resetReferralForm);

    function ensureSelect2Values(selector, values) {
        if (!Array.isArray(values)) return;
        const el = $(selector);
        values.forEach(val => {
            if (el.find(`option[value="${escapeAttr(val)}"]`).length === 0) {
                el.append(new Option(val, val, true, true));
            }
        });
        el.val(values).trigger('change');
    }

    $(document).on('click', '.edit-referral-btn', function() {
        const id = $(this).data('id');
        const ref = appState.referrals.find(r => r.id === id);
        if (!ref) return;

        $('#referralForm').removeClass('hidden');
        $('#editingReferralId').val(ref.id);
        $('#refName').val(ref.name);
        $('#refPronouns').val(ref.pronouns);
        $('#refPractice').val(ref.practice);
        $('#refRole').val(ref.role);
        $('#refPhone').val(ref.phone);
        $('#refEmail').val(ref.email);
        $('#refWebsite').val(ref.website);
        $('#refLocation').val(ref.location);
        $('#refModality').val(ref.modality);
        $('#refAvailability').val(ref.availability);
        $('#refFeeRange').val(ref.feeRange);
        $('#refLastVerified').val(ref.lastVerified);

        ensureSelect2Values('#refInsurancesSelect', ref.insurances || []);
        ensureSelect2Values('#refSpecialtiesSelect', ref.specialties || []);
        ensureSelect2Values('#refPopulationsSelect', ref.populations || []);

        $('#refPublicBio').val(ref.publicBio);
        $('#refPrivateNotes').val(ref.privateNotes);

        $('#saveReferralBtn').text('Update Provider');
        $('#cancelReferralEditBtn').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#referralForm').offset().top - 30 }, 400);
    });

    $(document).on('click', '.delete-referral-btn', function() {
        const id = $(this).data('id');
        if (!confirm('Remove this provider from your referral database?')) return;
        appState.referrals = appState.referrals.filter(r => r.id !== id);
        selectedHandoutIds.delete(id);
        renderAll();
    });

    $('#searchKeyword, #filterRole, #filterModality, #filterAvailability').on('input change', renderAll);

    // --- 6. Picking Providers & Client-Specific Exports ---
    $(document).on('change', '.handout-select-cb', function() {
        const id = $(this).data('id');
        if ($(this).is(':checked')) {
            selectedHandoutIds.add(id);
        } else {
            selectedHandoutIds.delete(id);
        }
        renderAll();
    });

    $('#selectAllFilteredBtn').on('click', function() {
        getFilteredReferrals().forEach(r => selectedHandoutIds.add(r.id));
        renderAll();
    });

    $('#clearCartSelectionBtn').on('click', function() {
        selectedHandoutIds.clear();
        renderAll();
    });

    // Copy Rendered Email to Clipboard
    $('#copyEmailButton').on('click', function() {
        const emailContent = $('#generatedEmailText').val();
        if (!emailContent) return;
        navigator.clipboard.writeText(emailContent).then(() => {
            alert('Referral email copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy automatically. Please select the text in the box and copy.');
        });
    });

    function getClientSlug() {
        const raw = $('#clientInquiryName').val().trim().replace(/^(hi|hello|dear)\s+/i, '');
        const clean = raw.replace(/[^a-z0-9]/gi, '_').toLowerCase().replace(/^_+|_+$/g, '');
        return clean || 'client';
    }

    // Export Client-Specific .txt
    $('#exportClientTxtButton').on('click', function() {
        const emailContent = $('#generatedEmailText').val();
        const slug = getClientSlug();
        downloadFile(emailContent, `referral_email_${slug}.txt`, 'text/plain;charset=utf-8');
    });

    // Export Client-Specific .json (Sanitized — No Private Clinician Notes!)
    $('#exportClientJsonButton').on('click', function() {
        const picked = getPickedProviders().map(r => {
            const copy = { ...r };
            delete copy.privateNotes; // Strip private clinician notes for client-specific export
            return copy;
        });

        const clientPacket = {
            exportedDate: new Date().toISOString().split('T')[0],
            clientGreeting: $('#clientInquiryName').val().trim(),
            subjectLine: $('#emailSubjectLine').val().trim(),
            renderedEmail: $('#generatedEmailText').val(),
            recommendedProviders: picked
        };

        const slug = getClientSlug();
        downloadFile(JSON.stringify(clientPacket, null, 2), `client_referrals_${slug}.json`, 'application/json;charset=utf-8');
    });

    // Print / Save PDF for This Specific Client
    $('#printClientPacketButton').on('click', function() {
        const picked = getPickedProviders();
        const emailText = $('#generatedEmailText').val();
        openPrintWindow(picked, false, emailText);
    });

    // Print Full Clinician Directory (Includes Private Notes)
    $('#printFullDirectoryBtn').on('click', function() {
        const list = getFilteredReferrals();
        if (list.length === 0) {
            alert('No providers in your list to print.');
            return;
        }
        openPrintWindow(list, true, '');
    });

    function openPrintWindow(list, includePrivateNotes, emailHeaderText) {
        const cardsHtml = list.map(r => `
            <div class="print-card">
                <div class="print-card-header">
                    <div>
                        <strong>${escapeHtml(r.name)}</strong> ${r.pronouns ? `(${escapeHtml(r.pronouns)})` : ''}
                        ${r.practice ? ` — <em>${escapeHtml(r.practice)}</em>` : ''}
                    </div>
                    <div>${escapeHtml(r.role)}</div>
                </div>
                <div class="print-meta">
                    ${r.phone ? `<strong>Phone:</strong> ${escapeHtml(r.phone)} &nbsp;|&nbsp; ` : ''}
                    ${r.email ? `<strong>Email:</strong> ${escapeHtml(r.email)} &nbsp;|&nbsp; ` : ''}
                    ${r.website ? `<strong>Website:</strong> ${escapeHtml(r.website)}<br>` : '<br>'}
                    <strong>Location:</strong> ${escapeHtml(r.location || '—')} &nbsp;|&nbsp;
                    <strong>Modality:</strong> ${escapeHtml(r.modality || '—')} &nbsp;|&nbsp;
                    <strong>Fees:</strong> ${escapeHtml(r.feeRange || 'Contact provider')}
                </div>
                ${(r.insurances && r.insurances.length) ? `<div class="print-tags"><strong>Insurance / Payment:</strong> ${escapeHtml(r.insurances.join(', '))}</div>` : ''}
                ${(r.specialties && r.specialties.length) ? `<div class="print-tags"><strong>Specialties &amp; Modalities:</strong> ${escapeHtml(r.specialties.join(', '))}</div>` : ''}
                ${(r.populations && r.populations.length) ? `<div class="print-tags"><strong>Populations Served:</strong> ${escapeHtml(r.populations.join(', '))}</div>` : ''}
                ${r.publicBio ? `<div class="print-bio"><strong>Summary:</strong> ${escapeHtml(r.publicBio)}</div>` : ''}
                ${(includePrivateNotes && r.privateNotes) ? `<div class="print-private"><strong>🔒 Internal Clinician Note:</strong> ${escapeHtml(r.privateNotes)}</div>` : ''}
            </div>
        `).join('');

        const title = includePrivateNotes
            ? 'Master Clinical Referral Directory (Clinician Copy)'
            : 'Recommended Therapy Referrals & Resources';

        const emailSectionHtml = (!includePrivateNotes && emailHeaderText)
            ? `<div class="email-print-box">${escapeHtml(emailHeaderText)}</div>`
            : '';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    @page { margin: 0.6in; }
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; font-size: 10.5pt; line-height: 1.45; margin: 0; }
                    h1 { font-size: 16pt; margin: 0 0 8px 0; border-bottom: 2px solid #000; padding-bottom: 6px; }
                    h2 { font-size: 13pt; margin: 16px 0 8px 0; }
                    .email-print-box { white-space: pre-wrap; border: 1px solid #444; padding: 12px 14px; border-radius: 4px; margin-bottom: 18px; background: #fafafa; }
                    .print-card { border: 1px solid #333; border-radius: 4px; padding: 10px 12px; margin-bottom: 12px; break-inside: avoid; }
                    .print-card-header { display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 6px; font-size: 11pt; }
                    .print-meta, .print-tags, .print-bio { margin-top: 4px; font-size: 9.5pt; }
                    .print-private { margin-top: 6px; padding: 6px; background: #f3f4f6; border-left: 3px solid #000; font-size: 9pt; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                ${emailSectionHtml}
                ${cardsHtml ? `<h2>Provider Details</h2>${cardsHtml}` : ''}
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 250);
    }

    // --- 7. Local Cache & Master JSON / CSV Import & Export ---
    function checkLocalCacheOnLoad() {
        const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
        $('#localCacheToggle').prop('checked', isEnabled);
        if (isEnabled) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed && Array.isArray(parsed.referrals)) {
                        appState.referrals = parsed.referrals;
                    }
                } catch (e) {
                    console.error('Failed to parse cached referral database:', e);
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
        if (!confirm('Wipe all providers from your Referral Database? Make sure you have exported your Master .json backup first.')) return;
        appState.referrals = [];
        selectedHandoutIds.clear();
        localStorage.removeItem(STORAGE_KEY);
        resetReferralForm();
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
        downloadFile(JSON.stringify(appState, null, 2), 'clinical_referral_database.json', 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', () => $('#importJsonFile').click());

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (Array.isArray(parsed.referrals)) {
                    appState.referrals = parsed.referrals;
                } else if (Array.isArray(parsed.recommendedProviders)) {
                    appState.referrals = parsed.recommendedProviders;
                } else if (Array.isArray(parsed)) {
                    appState.referrals = parsed;
                }
                selectedHandoutIds.clear();
                renderAll();
            } catch (err) {
                alert('Invalid JSON file. Please select a valid Referral Database .json backup.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#exportCsvButton').on('click', function() {
        if (appState.referrals.length === 0) {
            alert('No providers in database to export.');
            return;
        }
        const headers = [
            'Name', 'Pronouns/Languages', 'Practice Name', 'Role', 'Availability', 'Last Verified',
            'Phone', 'Email', 'Website', 'Location/States', 'Modality', 'Fee Range',
            'Insurances', 'Specialties/Modalities', 'Populations Served', 'Client Summary', 'Private Clinician Notes'
        ];

        const rows = appState.referrals.map(r => [
            r.name || '', r.pronouns || '', r.practice || '', r.role || '', r.availability || '', r.lastVerified || '',
            r.phone || '', r.email || '', r.website || '', r.location || '', r.modality || '', r.feeRange || '',
            (r.insurances || []).join('; '),
            (r.specialties || []).join('; '),
            (r.populations || []).join('; '),
            r.publicBio || '', r.privateNotes || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        downloadFile(csvContent, 'clinical_referrals_export.csv', 'text/csv;charset=utf-8');
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