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
    let statesData = { list: [], states: {} };
    const SEEN_KEY = 'geektragedie_referral_db_seen';
    const NATIONAL_DIRECTORIES = [
        { id: 'pt', name: 'Psychology Today therapist directory', url: 'https://www.psychologytoday.com/us/therapists', on: true },
        { id: 'openpath', name: 'Open Path Collective (lower-cost therapy)', url: 'https://openpathcollective.org', on: false },
        { id: 'findtreatment', name: 'FindTreatment.gov (SAMHSA)', url: 'https://findtreatment.gov', on: false },
        { id: '211', name: '211 (local community services)', url: 'https://www.211.org', on: false }
    ];
    const SAMPLE_PROVIDER = {
        id: 'ref_sample', sample: true, name: 'Sample Provider (delete me)', pronouns: 'they/them', languages: 'English, Spanish',
        practice: 'Example Counseling', role: 'Psychotherapist / Counselor', phone: '(555) 010-0123', email: 'intake@example.com',
        website: 'https://example.com', websites: ['https://example.com'], location: 'Springfield', modality: 'Both In-Person & Telehealth',
        availability: 'Accepting New Clients', feeRange: '$150/session; sliding scale', lastVerified: '', insurances: ['Aetna', 'Out-of-Network (Provides Superbill)'],
        specialties: ['EMDR'], populations: ['Adults'], publicBio: 'This is a made-up example so you can see how the list works. Delete it once you add your own providers.',
        privateNotes: 'Private notes never appear in client emails or handouts.'
    };

    // Older entries kept pronouns and languages in one box ("they/them | English") and one website.
    function normalizeReferral(r) {
        const out = { ...r };
        if (out.languages === undefined) {
            const parts = String(out.pronouns || '').split('|');
            out.pronouns = parts[0].trim();
            out.languages = parts.slice(1).join('|').trim();
        }
        if (!Array.isArray(out.websites)) out.websites = out.website ? [out.website] : [];
        out.websites = out.websites.map(w => String(w).trim()).filter(Boolean);
        out.website = out.websites[0] || '';
        return out;
    }
    const toUrl = (w) => (/^https?:\/\//i.test(w) ? w : `https://${w}`);
    function linkLabel(w, i) {
        try { return new URL(toUrl(w)).hostname.replace(/^www\./, ''); } catch (e) { return `Link ${i + 1}`; }
    }

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

    $('#refLastVerified').val(localDateISO());

    $('#toggleFormCollapseBtn').on('click', function() {
        $('#referralForm').toggleClass('hidden');
    });


    // --- 2. Filter & Search Ongoing Referral List ---
    function getFilteredReferrals() {
        const kw = ($('#searchKeyword').val() || '').toLowerCase().trim();
        const roleFilter = $('#filterRole').val();
        const modFilter = $('#filterModality').val();
        const availFilter = $('#filterAvailability').val();
        const insFilter = $('#filterInsurance').val() || 'ALL';
        const ageFilter = $('#filterAge').val() || 'ALL';

        return appState.referrals.filter(r => {
            if (roleFilter !== 'ALL' && r.role !== roleFilter) return false;
            if (modFilter === 'In-Person' && !String(r.modality).includes('In-Person')) return false;
            if (modFilter === 'Telehealth' && !String(r.modality).includes('Telehealth')) return false;
            if (availFilter !== 'ALL' && r.availability !== availFilter) return false;
            if (insFilter !== 'ALL' && !(r.insurances || []).includes(insFilter)) return false;
            if (ageFilter !== 'ALL' && !(r.populations || []).some(pop => pop.toLowerCase().includes(ageFilter))) return false;

            if (kw) {
                const haystack = [
                    r.name, r.pronouns, r.languages, r.practice, r.role, r.location, r.phone, r.email, ...(r.websites || []),
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
        populateInsuranceFilter();
        const filtered = getFilteredReferrals();
        $('#referralCountBadge').text(`${filtered.length} of ${appState.referrals.length} Providers Shown`);
        $('#selectedCartCount').text(selectedHandoutIds.size);

        const container = $('#referralCardsContainer');
        container.empty();

        if (filtered.length === 0) {
            container.append(`
                <div class="subpanel p-6 rounded-md text-center muted">
                    No providers match these filters. Add a provider above, or use <strong>Import .json</strong> in the tool menu to load your saved list.
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

                const websiteHtml = (ref.websites || []).map((w, i) => `<a href="${escapeAttr(toUrl(w))}" target="_blank" rel="noopener" class="btn-link text-xs">${escapeHtml(linkLabel(w, i))}</a>`).join(' · ');

                container.append(`
                    <div class="subpanel p-4 rounded-md border referral-card ${isSelected ? 'selected-for-handout' : ''}">
                        <div class="flex flex-wrap justify-between items-start gap-2 pb-2 border-b">
                            <div>
                                <label class="inline-flex items-center cursor-pointer mr-2" title="Check to include this provider in the Client Referral Email below">
                                    <input type="checkbox" class="handout-select-cb mr-2" data-id="${ref.id}" ${isSelected ? 'checked' : ''}>
                                    <span class="text-lg font-bold">${escapeHtml(ref.name)}</span>
                                </label>
                                ${ref.pronouns ? `<span class="muted text-xs">(${escapeHtml(ref.pronouns)})</span>` : ''}
                                ${ref.sample ? '<span class="sample-badge">Sample</span>' : ''}
                                ${ref.languages ? `<div class="text-xs muted">Languages: ${escapeHtml(ref.languages)}</div>` : ''}
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
        (ref.websites || []).forEach(w => contactOrLink.push(w));
        if (ref.phone) contactOrLink.push(ref.phone);
        if (ref.email) contactOrLink.push(ref.email);

        if (contactOrLink.length > 0) {
            primaryParts.push(contactOrLink.join(' | '));
        }

        let bullet = `- ${primaryParts.join(' / ')}`;

        if (includeDetails) {
            const subDetails = [];
            if (ref.modality) subDetails.push(ref.modality);
            if (ref.languages) subDetails.push(`Languages: ${ref.languages}`);
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

    const DISCLAIMER_TEXT = 'Please note: I can’t guarantee that any provider listed here has openings, takes your insurance, or will be the right fit. Please contact them directly to confirm. If you are in crisis, call or text 988 (the Suicide and Crisis Lifeline), and in an emergency call 911.';
    function directoryList() {
        const code = $('#refState').val();
        const st = (statesData.states || {})[code];
        const stateDirs = (st && st.directories ? st.directories : []).map((d, i) => ({ id: `state_${code}_${i}`, name: d.name, url: d.url, on: true }));
        return [...NATIONAL_DIRECTORIES, ...stateDirs];
    }
    function renderDirectoryChecks() {
        const box = $('#directoryChecks');
        const checked = new Set(box.find('input:checked').map(function() { return this.value; }).get());
        const first = !box.children().length;
        box.empty();
        directoryList().forEach(d => {
            const on = first || !box.data('init') ? d.on : (checked.has(d.id) || (d.id.startsWith('state_') && !box.data(`seen_${d.id}`) && d.on));
            box.data(`seen_${d.id}`, true);
            box.append(`<label><input type="checkbox" class="directory-cb" value="${escapeAttr(d.id)}" ${on ? 'checked' : ''}> ${escapeHtml(d.name)}</label>`);
        });
        box.data('init', true);
    }
    function selectedDirectories() {
        const ids = $('.directory-cb:checked').map(function() { return this.value; }).get();
        return directoryList().filter(d => ids.includes(d.id));
    }
    function populateInsuranceFilter() {
        const select = $('#filterInsurance');
        const cur = select.val() || 'ALL';
        const all = new Set(PRESET_INSURANCES);
        appState.referrals.forEach(r => (r.insurances || []).forEach(i => all.add(i)));
        select.empty().append(new Option('Any insurance or payment', 'ALL'));
        [...all].sort((a, b) => a.localeCompare(b)).forEach(i => select.append(new Option(i, i)));
        select.val(all.has(cur) ? cur : 'ALL');
    }

    function renderClientReferralEmail() {
        const subject = $('#emailSubjectLine').val().trim() || 'Re: Therapy Inquiry';
        const greeting = $('#clientInquiryName').val().trim();
        const currentClient = $('#currentClientMode').is(':checked');
        const reasons = $('.reason-cb:checked').map(function() { return this.value; }).get();
        const scopeFocus = $('#customScopeFocus').val().trim() || 'supporting neurodivergence';
        const extraDirectory = $('#extraDirectoryBullet').val().trim();
        const signOff = $('#clinicianSignOff').val().trim();
        const includeDetails = $('#includeDetailedBulletInfo').is(':checked');

        const picked = getPickedProviders();
        const lines = [];

        lines.push(`Subject: ${subject}`);
        lines.push('');

        if (greeting) {
            lines.push(greeting);
            lines.push('');
        }

        if (!currentClient) {
            lines.push('Thank you for reaching out and sharing a bit about your mental health journey so far.');
            lines.push('');
        }

        const REASON_CLAUSES = {
            capacity: 'I’m at full capacity and not taking new clients',
            insurance: 'my practice isn’t a match for your insurance or budget',
            scheduling: 'my openings don’t match the times you need',
            modality: 'I don’t offer the session format you’re looking for',
            levelOfCare: 'it sounds like you may benefit from a different level of care than I can provide, such as more frequent or more intensive support',
            diagnosis: `my practice focuses on ${scopeFocus}, not the specialty you’re looking for`
        };
        if (!currentClient && reasons.length === 1 && reasons[0] === 'capacity') {
            lines.push('I am currently at full capacity and unable to take on new clients at this time.');
            lines.push('');
        } else if (!currentClient && reasons.length) {
            lines.push(`Unfortunately, I’m not the best fit for your care right now because ${TTShared.listJoin(reasons.map(r => REASON_CLAUSES[r]))}. I want you to work with someone who can give you what you need.`);
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

        selectedDirectories().forEach(d => lines.push(`- ${d.name}: ${d.url}`));
        if (extraDirectory) {
            lines.push(`- ${extraDirectory}`);
        }

        lines.push('');
        lines.push('I wish you the very best on your path to finding the right care! If you still struggle to find a good fit for yourself, please feel free to reach back out, and I can continue to find other recommendations that may be of interest.');

        if (signOff) {
            lines.push('');
            lines.push(signOff);
        }

        if ($('#includeDisclaimer').is(':checked')) {
            lines.push('');
            lines.push(DISCLAIMER_TEXT);
        }

        $('#generatedEmailText').val(lines.join('\n'));
    }

    // Live Email Listeners
    $('#clientInquiryName, #emailSubjectLine, #clinicianSignOff, #customScopeFocus, #extraDirectoryBullet').on('input change', renderClientReferralEmail);
    $(document).on('change', '.reason-cb, #currentClientMode, #includeDetailedBulletInfo, #includeDisclaimer, .directory-cb', renderClientReferralEmail);
    $('#refState').on('change', function() { renderDirectoryChecks(); renderClientReferralEmail(); });
    $('#filterInsurance, #filterAge').on('change', renderAll);
    TTShared.loadStates().then(states => {
        statesData = states;
        const st = $('#refState').empty().append(new Option('Choose…', ''));
        (statesData.list || []).forEach(([code, name]) => st.append(new Option(name, code)));
        if (window.TTPractice) window.TTPractice.fill();
        renderDirectoryChecks();
        renderClientReferralEmail();
    }).catch(() => renderDirectoryChecks());
    $('#addWebsiteBtn').on('click', function() { addWebsiteInput(''); });
    $(document).on('click', '.remove-website-btn', function() { $(this).closest('.extra-website-row').remove(); });
    function addWebsiteInput(value) {
        $('#refExtraWebsites').append(`<div class="extra-website-row flex gap-2"><input type="text" class="ref-extra-website w-full p-2 border rounded-md text-sm" placeholder="Another link" value="${escapeAttr(value)}"><button type="button" class="btn-link text-xs remove-website-btn" aria-label="Remove link">Remove</button></div>`);
    }

    // --- 5. Add / Edit / Delete Referral Handlers ---
    $('#referralForm').on('submit', function(e) {
        e.preventDefault();
        const editingId = $('#editingReferralId').val();

        const refObj = {
            id: editingId || 'ref_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: $('#refName').val().trim(),
            pronouns: $('#refPronouns').val().trim(),
            languages: $('#refLanguages').val().trim(),
            practice: $('#refPractice').val().trim(),
            role: $('#refRole').val(),
            phone: $('#refPhone').val().trim(),
            email: $('#refEmail').val().trim(),
            websites: [$('#refWebsite').val().trim(), ...$('.ref-extra-website').map(function() { return this.value.trim(); }).get()].filter(Boolean),
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

        refObj.website = refObj.websites[0] || '';
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
        $('#refLastVerified').val(localDateISO());
        $('#refExtraWebsites').empty();
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
        $('#refLanguages').val(ref.languages || '');
        $('#refPractice').val(ref.practice);
        $('#refRole').val(ref.role);
        $('#refPhone').val(ref.phone);
        $('#refEmail').val(ref.email);
        $('#refWebsite').val((ref.websites || [])[0] || '');
        $('#refExtraWebsites').empty();
        (ref.websites || []).slice(1).forEach(w => addWebsiteInput(w));
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
                        <strong>${escapeHtml(r.name)}</strong> ${r.pronouns ? `(${escapeHtml(r.pronouns)})` : ''}${r.languages ? ` &middot; Languages: ${escapeHtml(r.languages)}` : ''}
                        ${r.practice ? ` — <em>${escapeHtml(r.practice)}</em>` : ''}
                    </div>
                    <div>${escapeHtml(r.role)}</div>
                </div>
                <div class="print-meta">
                    ${r.phone ? `<strong>Phone:</strong> ${escapeHtml(r.phone)} &nbsp;|&nbsp; ` : ''}
                    ${r.email ? `<strong>Email:</strong> ${escapeHtml(r.email)} &nbsp;|&nbsp; ` : ''}
                    ${(r.websites || []).length ? `<strong>Links:</strong> ${(r.websites || []).map(w => escapeHtml(w)).join(' | ')}<br>` : '<br>'}
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
                    .print-disclaimer { margin-top: 14px; font-size: 9.5pt; border-top: 1px solid #999; padding-top: 6px; }
                    .print-private { margin-top: 6px; padding: 6px; background: #f3f4f6; border-left: 3px solid #000; font-size: 9pt; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                ${emailSectionHtml}
                ${cardsHtml ? `<h2>Provider Details</h2>${cardsHtml}` : ''}
                ${$('#includeDisclaimer').is(':checked') && cardsHtml && !emailSectionHtml ? `<p class="print-disclaimer">${escapeHtml(DISCLAIMER_TEXT)}</p>` : ''}
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
                        appState.referrals = parsed.referrals.map(normalizeReferral);
                    }
                } catch (e) {
                    console.error('Failed to parse cached referral database:', e);
                }
            }
        }
        if (!appState.referrals.length && !localStorage.getItem(SEEN_KEY)) {
            appState.referrals = [{ ...SAMPLE_PROVIDER }];
        }
        localStorage.setItem(SEEN_KEY, '1');
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
        if (!confirm('Delete every provider from your Personal Referral Database? Export a .json backup first if you want to keep them.')) return;
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
                    appState.referrals = parsed.referrals.map(normalizeReferral);
                } else if (Array.isArray(parsed.recommendedProviders)) {
                    appState.referrals = parsed.recommendedProviders.map(normalizeReferral);
                } else if (Array.isArray(parsed)) {
                    appState.referrals = parsed.map(normalizeReferral);
                }
                selectedHandoutIds.clear();
                renderAll();
            } catch (err) {
                alert('Invalid JSON file. Please choose a Personal Referral Database .json backup.');
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
            'Name', 'Pronouns', 'Languages', 'Practice Name', 'Role', 'Availability', 'Last Verified',
            'Phone', 'Email', 'Websites', 'Location/States', 'Modality', 'Fee Range',
            'Insurances', 'Specialties/Modalities', 'Populations Served', 'Client Summary', 'Private Clinician Notes'
        ];

        const rows = appState.referrals.map(r => [
            r.name || '', r.pronouns || '', r.languages || '', r.practice || '', r.role || '', r.availability || '', r.lastVerified || '',
            r.phone || '', r.email || '', (r.websites || []).join(' | '), r.location || '', r.modality || '', r.feeRange || '',
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

    // Today's date in the user's time zone (toISOString would use UTC and can be a day off)
    function localDateISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function escapeAttr(str) {
        return escapeHtml(str);
    }

    // Boot
    checkLocalCacheOnLoad();
});