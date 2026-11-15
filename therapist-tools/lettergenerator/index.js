// Client Therapy Letter Generator
// The letter is rebuilt from its JSON template on every change and shown in a live
// preview. Templates (templates/*.json) are lists of sections:
//   { type: "paragraph", content: "...[PLACEHOLDER]...", when: "flag" | "!flag" }
//   { type: "list", key: "ITEMS_KEY" }        -> a bulleted list built here
//   { type: "signature" }                      -> the clinician's signature block
//   { type: "signature-lines" }                -> blank signature lines (ROI form)
// Every user value is HTML-escaped before it goes into a placeholder; only the
// template's own markup is trusted.
$(function () {
    'use strict';

    let letterTypes = [];
    let statesData = { list: [], states: { _default: {} } };
    let diagnoses = { ICD: [], DSM: [], byCode: {} };
    let accommodationSuggestions = {};
    let selectedAccommodations = [];
    let animals = [newAnimal()];
    let signatureImageData = '';
    const templateCache = {};

    // Fields whose placeholder may be empty without being flagged as missing.
    const OPTIONAL = new Set(['CLIENT_DOB_PAREN', 'TREATMENT_LENGTH_PAREN', 'GA_LEGAL_NAME_PAREN', 'GA_PRONOUNS_PAREN']);
    const LABELS = {
        CLIENT_FIRST_NAME: 'client’s first name', CLIENT_FULL_NAME: 'client’s name', CLIENT_DOB: 'client’s date of birth',
        A_LICENSE_TYPE: 'your license type', LICENSE_STATE_PHRASE: 'your license state', LICENSE_NUMBER: 'license number',
        ESA_START_DATE: 'client since', ACCOM_START_DATE: 'client since', REFERRAL_START_DATE: 'client since', GA_START_DATE: 'client since',
        CLINICIAN_NAME_CREDS: 'your name', CLINICIAN_CONTACT: 'your phone or email', INSTITUTION_NAME: 'school or institution',
        DIAGNOSIS_LIST: 'diagnosis', REFERRED_TO_PROVIDER: 'provider you’re referring to', GA_CARE_LIST: 'care requested',
        GA_ASSESSMENT_BASIS: 'basis of your assessment', ROI_EXPIRATION: 'expiration date or event', ROI_PURPOSE: 'purpose',
        SAFETY_LINE: 'safety concerns', ANIMAL_ITEMS: 'animal details'
    };

    // ---------- Small helpers ----------
    const esc = (str) => String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const val = (sel) => String($(sel).val() ?? '').trim();
    const missing = (label) => `<mark class="missing">[${esc(label)}]</mark>`;
    const listJoin = (items, conj) => TTShared.listJoin(items, conj);
    const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    const article = (word) => (/^[aeiou]/i.test(word || '') ? 'an' : 'a');
    const multiline = (s) => esc(s).replace(/\n/g, '<br>');
    function todayIso() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function longDate(iso) {
        if (!iso) return '';
        const d = new Date(`${iso}T00:00:00`);
        return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    function monthYear(ym) {
        if (!ym) return '';
        const d = new Date(`${ym}-01T00:00:00`);
        return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    function treatmentLength(ym) {
        if (!ym) return '';
        const start = new Date(`${ym}-01T00:00:00`);
        const now = new Date();
        let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (Number.isNaN(months) || months < 0) return '';
        if (months === 0) return 'less than one month';
        const years = Math.floor(months / 12);
        months %= 12;
        const parts = [];
        if (years) parts.push(`${years} year${years === 1 ? '' : 's'}`);
        if (months) parts.push(`${months} month${months === 1 ? '' : 's'}`);
        return `about ${parts.join(' and ')}`;
    }
    function checkedValues(container, otherInput) {
        const values = [];
        $(container).find('input[type="checkbox"]:checked').each(function () {
            if (this.value === '__other') {
                const other = otherInput ? val(otherInput) : '';
                if (other) values.push(other);
            } else {
                values.push(this.value);
            }
        });
        return values;
    }
    function newAnimal() {
        return { name: '', species: '', description: '' };
    }

    // ---------- Data loading ----------
    $('#letterTypeSelect').select2({ placeholder: 'Choose a letter...', allowClear: true, width: '100%' });
    $('#licenseTypeSelect').select2({ placeholder: 'Choose your license...', allowClear: true, width: '100%' });
    $('#diagnosisSelect').select2({ placeholder: 'Search diagnoses...', allowClear: true, width: '100%', closeOnSelect: false });

    const getJSON = (url) => Promise.resolve($.getJSON(url));
    Promise.all([
        getJSON('letter-types.json'),
        getJSON('../shared/license-types.json'),
        TTShared.loadDiagnoses().catch(() => { TTShared.showLoadError('#diagnosisSelect', 'diagnosis list'); return { ICD: [], DSM: [], byCode: {} }; }),
        getJSON('accommodations.json').catch(() => ({})),
        TTShared.loadStates().catch(() => statesData)
    ]).then(([types, licenses, dx, accom, states]) => {
        letterTypes = types.letterTypes;
        diagnoses = dx;
        // accommodations.json stores each accommodation once (library) and lists ids per code (byCode)
        accommodationSuggestions = accom && accom.byCode
            ? Object.fromEntries(Object.entries(accom.byCode).map(([code, ids]) => [code, ids.map((id) => accom.library[id]).filter(Boolean)]))
            : accom;
        statesData = states;

        const typeSelect = $('#letterTypeSelect').append('<option value=""></option>');
        letterTypes.forEach((lt) => typeSelect.append(new Option(lt.name, lt.id)));
        const licenseSelect = $('#licenseTypeSelect').append('<option value=""></option>');
        licenses.licenseTypes.forEach((t) => licenseSelect.append(new Option(t, t)));
        const stateSelect = $('#licenseState').append(new Option('Select your state', ''));
        (statesData.list || []).forEach(([code, name]) => stateSelect.append(new Option(name, code)));

        $('#licenseExpiration').attr('min', todayIso());
        populateDiagnoses();
        renderAnimalRows();

        const requested = new URLSearchParams(window.location.search).get('type');
        if (requested && letterTypes.some((lt) => lt.id === requested)) {
            typeSelect.val(requested);
        }
        typeSelect.trigger('change');
        if (window.TTPractice) window.TTPractice.onLoad(applyPracticeData);
    }).catch((err) => {
        console.error(err);
        alert('The letter templates couldn’t be loaded. Check your connection and refresh the page.');
    });

    function currentSystem() {
        return $('input[name="codingSystem"]:checked').val() || 'DSM';
    }
    function populateDiagnoses() {
        const select = $('#diagnosisSelect');
        const selected = select.val() || [];
        select.empty();
        (diagnoses[currentSystem()] || []).forEach((d) => select.append(new Option(`${d.name} (${d.code})`, d.code)));
        select.val(selected).trigger('change.select2');
    }
    function diagnosisNames() {
        const system = currentSystem();
        return ($('#diagnosisSelect').val() || []).map((code) => {
            const d = diagnoses.byCode && diagnoses.byCode[code];
            const name = d ? (system === 'DSM' ? d.dsm : d.icd) : code;
            return `${name} (${code})`;
        });
    }

    // Practice data: split "Jordan Rivera, MA, LMHC" into first/last and match the license type.
    function applyPracticeData(data) {
        const t = (data && data.therapist) || {};
        const full = (t.clinicianFullName || '').split(',')[0].trim();
        if (full) {
            const parts = full.split(/\s+/);
            if (!val('#clinicianFirstName')) $('#clinicianFirstName').val(parts[0]);
            if (!val('#clinicianLastName')) $('#clinicianLastName').val(parts.slice(1).join(' '));
        }
        const lic = Array.isArray(t.licenses) && t.licenses[0];
        if (lic && lic.type && !$('#licenseTypeSelect').val()) {
            const abbr = lic.type.trim().toUpperCase();
            const match = $('#licenseTypeSelect option').filter(function () {
                return new RegExp(`\\((?:[^)]*\\b)?${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(this.value);
            }).first();
            if (match.length) $('#licenseTypeSelect').val(match.val()).trigger('change');
        }
        render();
    }

    // ---------- Visibility ----------
    function applyVisibility(typeId) {
        $('#formFields').toggleClass('hidden', !typeId);
        $('[data-show-for]').each(function () {
            const show = !!typeId && this.dataset.showFor.split(' ').includes(typeId);
            $(this).toggleClass('hidden', !show);
        });
        const lt = letterTypes.find((x) => x.id === typeId);
        $('#draftNotice').toggleClass('hidden', !(lt && lt.draft));
        $('#customLicenseTypeWrapper').toggleClass('hidden', $('#licenseTypeSelect').val() !== 'Other');
        $('#referralGoalsBlock').toggleClass('hidden', ($('#diagnosisSelect').val() || []).length === 0);
        $('#safetyConcernsBlock').toggleClass('hidden', $('input[name="safetyStatus"]:checked').val() !== 'concerns');
        $('#lifeActivityOther').toggleClass('hidden', !$('#lifeActivityOtherCheck').is(':checked'));
        $('#gaCareOther').toggleClass('hidden', !$('#gaCareOtherCheck').is(':checked'));
        $('#roiInfoOther').toggleClass('hidden', !$('#roiInfoOtherCheck').is(':checked'));
        $('#roiPurposeOther').toggleClass('hidden', !$('#roiPurposeOtherCheck').is(':checked'));
        $('#gaDiagnosis').prop('disabled', !$('#gaIncludeDiagnosis').is(':checked'));
    }

    function stateInfo() {
        const code = $('#licenseState').val();
        const all = statesData.states || {};
        const name = (statesData.list || []).find(([c]) => c === code);
        return { code, name: name ? name[1] : '', data: all[code] || null, fallback: all._default || {} };
    }

    function renderCitations(lt) {
        const list = $('#sourcesList').empty();
        if (!lt) {
            $('#sourcesContainer').addClass('hidden');
            return;
        }
        const citations = [...(lt.citations || [])];
        const st = stateInfo();
        if (lt.stateLaw && st.data && st.data[lt.stateLaw] && st.data[lt.stateLaw].cite) {
            const law = st.data[lt.stateLaw];
            citations.push(`${esc(law.short)}. ${esc(law.cite)}.${law.url ? ` ${esc(law.url)}` : ''}`);
        }
        citations.forEach((c) => list.append(`<p>${c}</p>`));
        $('#sourcesContainer').toggleClass('hidden', citations.length === 0);
    }

    // ---------- Building the letter ----------
    function licenseTypeText() {
        return $('#licenseTypeSelect').val() === 'Other' ? val('#customLicenseType') : val('#licenseTypeSelect');
    }
    function licenseAbbr(type) {
        const m = (type || '').match(/\(([^)]+)\)/);
        return m ? m[1] : type;
    }
    function expirationStatus() {
        const exp = val('#licenseExpiration');
        const expired = !!exp && exp < todayIso();
        $('#licenseExpirationError').toggleClass('hidden', !expired);
        $('#licenseExpiration').attr('aria-invalid', expired ? 'true' : null);
        return { exp, expired };
    }

    function collectData(typeId) {
        const st = stateInfo();
        const first = val('#clientFirstName');
        const last = val('#clientLastName');
        const fullName = [first, last].filter(Boolean).join(' ');
        const dob = longDate(val('#clientDOB'));
        const since = monthYear(val('#clientStartDate'));
        const licType = licenseTypeText();
        const abbr = licenseAbbr(licType);
        const clinicianName = [val('#clinicianFirstName'), val('#clinicianLastName')].filter(Boolean).join(' ');
        const phone = val('#clinicianPhone');
        const email = val('#clinicianEmail');
        const contact = listJoin([phone, email].filter(Boolean).map(esc), 'or');
        const { exp, expired } = expirationStatus();

        const d = {
            DATE_GENERATED: esc(longDate(todayIso())),
            CLIENT_FIRST_NAME: esc(first),
            CLIENT_FULL_NAME: esc(fullName),
            CLIENT_DOB: esc(dob),
            CLIENT_DOB_PAREN: dob ? ` (DOB: ${esc(dob)})` : '',
            A_LICENSE_TYPE: licType ? `${article(licType)} ${esc(licType)}` : '',
            LICENSE_STATE_PHRASE: st.name ? (st.code === 'DC' ? 'the District of Columbia' : `the state of ${esc(st.name)}`) : '',
            LICENSE_NUMBER: esc(val('#licenseNumber')),
            ESA_START_DATE: esc(since), ACCOM_START_DATE: esc(since), REFERRAL_START_DATE: esc(since), GA_START_DATE: esc(since),
            CLINICIAN_NAME_CREDS: clinicianName ? esc(abbr ? `${clinicianName}, ${abbr}` : clinicianName) : '',
            CLINICIAN_CONTACT: contact
        };
        const flags = {};

        // Verification clause, on every letter except the ROI form.
        const stateWords = st.name ? `${esc(st.name)} state` : 'state';
        d.VERIFICATION_CLAUSE = `Should you need to verify the authenticity of this letter, please contact my office at ${contact || missing('your phone or email')}. Please note that under HIPAA and ${stateWords} confidentiality laws, I can only confirm that this letter is valid; I cannot share any further information without a signed Release of Information (ROI) from my client.`;

        if (typeId === 'esa') buildEsa(d, flags, st);
        if (typeId === 'accommodation') buildAccommodation(d, flags);
        if (typeId === 'referral') buildReferral(d, flags, first, fullName, dob);
        if (typeId === 'gender') buildGender(d, flags);
        if (typeId === 'roi') buildRoi(d, flags, st);

        d.__signature = { clinicianName, abbr, licType, stateName: st.name, number: val('#licenseNumber'), exp, expired,
            npi: val('#clinicianNpi'), address: val('#clinicianAddress'), phone, email };
        return { d, flags };
    }

    function buildEsa(d, flags, st) {
        const list = animals.filter((a) => a.name.trim() || a.species.trim());
        const many = list.length > 1;
        d.ANIMAL_PHRASE = many ? 'emotional support animals' : 'an emotional support animal';
        d.ANIMAL_INTRO = many ? 'The emotional support animals are:' : 'The emotional support animal is:';
        d.ANIMAL_ITEMS = list.map((a) => {
            const species = a.species.trim();
            const name = a.name.trim() ? `<strong>${esc(a.name.trim())}</strong>, ` : '';
            const kind = species ? `${article(species)} ${esc(species)}` : missing('species');
            const desc = a.description.trim() ? ` (${esc(a.description.trim())})` : '';
            return `${name}${kind}${desc}`;
        });
        d.ANIMAL_NOT_SERVICE = many
            ? 'These animals are emotional support animals, not service animals as defined under the Americans with Disabilities Act (ADA).'
            : 'This animal is an emotional support animal, not a service animal as defined under the Americans with Disabilities Act (ADA).';
        d.ANIMAL_POSSESSIVE = many ? 'their emotional support animals' : 'their emotional support animal';
        d.ANIMAL_NECESSARY = many ? 'the animals are' : 'the animal is';
        d.ANIMAL_PROVIDE = many ? 'provide' : 'provides';

        const activities = checkedValues('#lifeActivityChecks', '#lifeActivityOther');
        flags.hasLifeActivities = activities.length > 0;
        d.MAJOR_LIFE_ACTIVITIES = listJoin(activities.map(esc));

        const laws = ['the Fair Housing Act (FHA, 42 U.S.C. § 3601 et seq.)', 'Section 504 of the Rehabilitation Act of 1973'];
        if (st.data && st.data.antiDiscrimination) {
            laws.push(`the ${esc(st.data.antiDiscrimination.short)}`);
        } else if (st.name) {
            laws.push(`applicable ${esc(st.name)} fair housing law ${missing("check your state's rules")}`);
        }
        d.DISABILITY_LAWS = listJoin(laws);
    }

    function buildAccommodation(d, flags) {
        d.INSTITUTION_NAME = esc(val('#institutionName'));
        const length = val('#treatmentLength') || treatmentLength(val('#clientStartDate'));
        d.TREATMENT_LENGTH_PAREN = length ? ` (${esc(length)})` : '';
        d.DIAGNOSIS_LIST = listJoin(diagnosisNames().map(esc));
        flags.includeDiagnosis = $('#includeDiagnosis').is(':checked');
        const impact = val('#functionalImpact');
        flags.hasFunctionalImpact = !!impact;
        d.FUNCTIONAL_IMPACT = multiline(impact);
        d.ACCOMMODATION_ITEMS = selectedAccommodations.map((a) => {
            const why = flags.includeDiagnosis && a.reason ? ` <em>Rationale: ${esc(a.reason)}</em>` : '';
            return `<strong>${esc(a.name)}:</strong> ${esc(a.recommendation)}${why}`;
        });
    }

    function buildReferral(d, flags, first, fullName, dob) {
        d.REFERRED_TO_PROVIDER = esc(val('#referredToProvider'));
        const type = $('input[name="referralType"]:checked').val() || 'cotreatment';
        const who = `${esc(fullName) || missing('client’s name')}${dob ? ` (DOB: ${esc(dob)})` : ''}`;
        const name = esc(first) || missing('client’s first name');
        d.REFERRAL_TYPE_TITLE = { cotreatment: 'Referral for Co-Treatment', transfer: 'Transfer of Care', assessment: 'Referral for Assessment' }[type];
        d.REFERRAL_OPENING = {
            cotreatment: `I am writing to refer my client, ${who}, to you for co-treatment. I plan to continue as ${name}’s therapist and would welcome coordinating care with you.`,
            transfer: `I am writing to refer my client, ${who}, to you for ongoing care, as we are transferring ${name}’s treatment to a new provider.`,
            assessment: `I am writing to refer my client, ${who}, to you for an assessment. I will continue to provide therapy and would appreciate a copy of your findings, with ${name}’s permission.`
        }[type];
        const dx = diagnosisNames();
        flags.hasDiagnosis = dx.length > 0;
        d.DIAGNOSIS_LIST = listJoin(dx.map(esc));
        const goals = flags.hasDiagnosis ? checkedValues('#referralGoalChecks') : [];
        flags.hasReferralGoals = goals.length > 0;
        d.REFERRAL_GOAL_ITEMS = goals.map((g) => esc(capFirst(g)));
        const reason = val('#reasonForReferral');
        flags.hasReason = !!reason;
        d.REASON_FOR_REFERRAL = multiline(reason);
        const worked = val('#whatWorked');
        flags.hasWhatWorked = !!worked;
        d.WHAT_WORKED = multiline(worked);
        const safety = $('input[name="safetyStatus"]:checked').val() || 'none';
        flags.hasSafety = safety !== 'omit';
        if (safety === 'none') {
            d.SAFETY_LINE = 'At the time of this referral, there are no current safety concerns.';
        } else if (safety === 'concerns') {
            const concerns = checkedValues('#safetyConcernChecks');
            const details = val('#safetyDetails');
            d.SAFETY_LINE = concerns.length
                ? `Please note the following current safety considerations: ${listJoin(concerns.map(esc))}.${details ? ` ${multiline(details)}` : ''}`
                : (details ? multiline(details) : '');
        }
    }

    function buildGender(d, flags) {
        const recipient = val('#gaRecipient');
        flags.hasGaRecipient = !!recipient;
        d.GA_RECIPIENT = esc(recipient);
        const legal = val('#clientLegalName');
        d.GA_LEGAL_NAME_PAREN = legal ? ` (legal name: ${esc(legal)})` : '';
        const pronouns = val('#clientPronouns');
        d.GA_PRONOUNS_PAREN = pronouns ? ` (${esc(pronouns)})` : '';
        d.GA_CARE_LIST = listJoin(checkedValues('#gaCareChecks', '#gaCareOther').map(esc));
        d.GA_ASSESSMENT_BASIS = esc(val('#gaAssessmentBasis'));
        flags.hasGaDiagnosis = $('#gaIncludeDiagnosis').is(':checked');
        d.GA_DIAGNOSIS = esc($('#gaDiagnosis').val());
        d.GA_CRITERIA_ITEMS = checkedValues('#gaCriteriaChecks');
        const extra = val('#gaAdditional');
        flags.hasGaAdditional = !!extra;
        d.GA_ADDITIONAL = multiline(extra);
    }

    function buildRoi(d, flags, st) {
        const direction = $('input[name="roiDirection"]:checked').val() || 'release';
        const practice = val('#roiDisclosingParty') ? `<strong>${esc(val('#roiDisclosingParty'))}</strong>` : missing('your practice');
        const other = val('#roiRecipient') ? `<strong>${esc(val('#roiRecipient'))}</strong>` : missing('other person or organization');
        const contact = val('#roiRecipientContact') ? ` (${esc(val('#roiRecipientContact'))})` : '';
        d.ROI_DIRECTION_TITLE = { release: 'RELEASE', obtain: 'OBTAIN', exchange: 'EXCHANGE' }[direction];
        d.ROI_AUTHORIZE_LINE = {
            release: `I authorize ${practice} to release my protected health information to ${other}${contact}.`,
            obtain: `I authorize ${other}${contact} to release my protected health information to ${practice}.`,
            exchange: `I authorize ${practice} and ${other}${contact} to exchange my protected health information with each other.`
        }[direction];
        d.ROI_INFO_ITEMS = checkedValues('#roiInfoChecks', '#roiInfoOther').map(esc);
        d.ROI_PURPOSE = esc(capFirst(listJoin(checkedValues('#roiPurposeChecks', '#roiPurposeOther'))));
        const expDate = longDate(val('#roiExpiration'));
        const expEvent = val('#roiExpirationEvent');
        d.ROI_EXPIRATION = expDate && expEvent ? `${esc(expDate)} or when ${esc(expEvent)}, whichever comes first`
            : esc(expDate || (expEvent ? `when ${expEvent}` : ''));
        flags.roiPart2 = $('#roiPart2').is(':checked');
        const holder = val('#roiDisclosingParty') ? esc(val('#roiDisclosingParty')) : 'the provider named above';
        d.ROI_RIGHTS_ITEMS = [
            `I may revoke this authorization at any time by giving written notice to ${holder}, except to the extent that action has already been taken in reliance on it.`,
            'My treatment, payment, enrollment, or eligibility for benefits will not be conditioned on whether I sign this authorization.',
            'Information disclosed under this authorization may be redisclosed by the recipient and may no longer be protected by federal privacy rules.',
            'I may refuse to sign this authorization, and I have the right to receive a copy of it.'
        ];
        const law = st.data && st.data.confidentiality;
        flags.hasStateLawNote = !!st.name;
        d.STATE_LAW_NOTE = law
            ? `This authorization is also intended to meet the requirements of the ${esc(law.short)}.`
            : `${missing("check your state's rules for any additional authorization requirements")}`;
    }

    function fill(content, d) {
        return content.replace(/\[([A-Z0-9_]+)\]/g, (match, key) => {
            if (!(key in d)) return match;
            const v = d[key];
            if (v === '' || v === undefined || v === null) {
                return OPTIONAL.has(key) ? '' : missing(LABELS[key] || key.toLowerCase().replace(/_/g, ' '));
            }
            return v;
        });
    }

    function signatureBlock(s) {
        const lines = [];
        const nameLine = s.clinicianName ? esc(s.abbr ? `${s.clinicianName}, ${s.abbr}` : s.clinicianName) : missing('your name');
        lines.push(nameLine);
        if (s.licType || s.number) {
            const where = s.stateName ? `${esc(s.stateName)} ` : '';
            let lic = `${esc(s.licType || 'License')}${s.number ? `, ${where}License No. ${esc(s.number)}` : ''}`;
            if (s.exp) lic += s.expired ? ` (expires ${missing('expired: check date')})` : ` (expires ${esc(longDate(s.exp))})`;
            lines.push(lic);
        }
        if (s.npi) lines.push(`NPI: ${esc(s.npi)}`);
        if (s.address) s.address.split('\n').map((l) => l.trim()).filter(Boolean).forEach((l) => lines.push(esc(l)));
        const contact = [s.phone, s.email].filter(Boolean).map(esc).join(' | ');
        if (contact) lines.push(contact);
        const img = signatureImageData ? `<img class="signature-img" src="${signatureImageData}" alt="Signature">` : '';
        return `${img}<p>${lines.join('<br>')}</p>`;
    }

    function roiSignatureLines() {
        const rep = $('#roiRepresentative').is(':checked');
        const line = (label) => `<div class="sig-line">${esc(label)}</div>`;
        let html = `<div class="sig-grid">${line('Client signature')}${line('Date')}</div>`;
        if (rep) {
            html += `<div class="sig-grid">${line('Signature of parent, guardian, or legal representative')}${line('Date')}</div>`;
            html += `<div class="sig-grid">${line('Printed name and relationship to client')}${line('Authority to act (e.g., parent, guardian, POA)')}</div>`;
        }
        return html;
    }

    function sectionVisible(section, flags) {
        if (!section.when) return true;
        const neg = section.when.startsWith('!');
        const on = !!flags[neg ? section.when.slice(1) : section.when];
        return neg ? !on : on;
    }

    function buildLetterHtml(template, typeId) {
        const { d, flags } = collectData(typeId);
        let html = '';
        template.sections.forEach((section) => {
            if (!sectionVisible(section, flags)) return;
            if (section.type === 'paragraph') {
                html += `<p>${fill(section.content, d)}</p>`;
            } else if (section.type === 'list') {
                const items = d[section.key] || [];
                const rendered = items.length ? items.map((it) => fill(it, d)) : [missing(LABELS[section.key] || 'details')];
                html += `<ul>${rendered.map((it) => `<li>${it}</li>`).join('')}</ul>`;
            } else if (section.type === 'signature') {
                html += signatureBlock(d.__signature);
            } else if (section.type === 'signature-lines') {
                html += roiSignatureLines();
            }
        });
        return html;
    }

    function loadTemplate(lt) {
        if (!templateCache[lt.id]) templateCache[lt.id] = getJSON(lt.templatePath);
        return templateCache[lt.id];
    }

    let renderQueued = false;
    function render() {
        if (renderQueued) return;
        renderQueued = true;
        requestAnimationFrame(() => {
            renderQueued = false;
            const typeId = $('#letterTypeSelect').val();
            const lt = letterTypes.find((x) => x.id === typeId);
            applyVisibility(typeId);
            renderCitations(lt);
            $('#printLetterButton, #copyLetterButton').prop('disabled', !lt);
            if (!lt) {
                $('#generatedLetterContainer').addClass('hidden');
                return;
            }
            $('#generatedLetterContainer').removeClass('hidden');
            loadTemplate(lt).then((template) => {
                if ($('#letterTypeSelect').val() !== typeId) return;
                $('#generatedLetter').html(buildLetterHtml(template, typeId));
            }).catch(() => {
                $('#generatedLetter').html('<p class="empty-state">This template couldn’t be loaded. Check your connection and refresh the page.</p>');
            });
        });
    }

    // ---------- Accommodations ----------
    function refreshSuggestions() {
        const select = $('#suggestionSelect').empty();
        const codes = $('#diagnosisSelect').val() || [];
        const seen = new Set(selectedAccommodations.map((a) => a.name));
        const options = [];
        codes.forEach((code) => (accommodationSuggestions[code] || []).forEach((s, i) => {
            if (!options.some((o) => o.s.name === s.name)) options.push({ key: `${code}::${i}`, s });
        }));
        if (!codes.length) {
            select.prop('disabled', true).append('<option value="">Select a diagnosis first</option>');
        } else if (!options.length) {
            select.prop('disabled', true).append('<option value="">No suggestions for these diagnoses; write your own below</option>');
        } else {
            select.prop('disabled', false).append('<option value="">Choose a suggestion</option>');
            options.forEach((o) => select.append(new Option(`${o.s.name}${seen.has(o.s.name) ? ' (added)' : ''}`, o.key)));
        }
        $('#addAccommodationButton').prop('disabled', true);
    }
    function renderSelectedAccommodations() {
        const container = $('#selectedAccommodations').empty();
        if (!selectedAccommodations.length) {
            container.html('<p class="muted">No accommodations added yet.</p>');
            return;
        }
        selectedAccommodations.forEach((a) => {
            container.append(`<div class="subpanel accommodation-card">
                <div><h4>${esc(a.name)}</h4><p>${esc(a.recommendation)}</p>${a.reason ? `<p class="muted"><em>Rationale:</em> ${esc(a.reason)}</p>` : ''}</div>
                <button type="button" class="btn-link danger-text remove-accommodation" data-id="${esc(a.id)}" aria-label="Remove ${esc(a.name)}">Remove</button>
            </div>`);
        });
    }

    // ---------- ESA animal rows ----------
    const DESCRIPTION_EXAMPLES = ['a small, house-trained dog', 'an indoor cat', 'crate-trained and up to date on vaccinations', 'about 20 lb', 'kept in an enclosure'];
    function renderAnimalRows() {
        const wrap = $('#animalRows').empty();
        animals.forEach((a, i) => {
            wrap.append(`<div class="animal-row" data-index="${i}">
                <div class="animal-row-head"><strong>Animal ${animals.length > 1 ? i + 1 : ''}</strong>${animals.length > 1 ? `<button type="button" class="btn-link danger-text remove-animal" data-index="${i}">Remove</button>` : ''}</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block font-semibold mb-1" for="animalName${i}">Name</label><input type="text" id="animalName${i}" class="w-full p-2 border rounded-md animal-field" data-field="name" value="${esc(a.name)}" placeholder="e.g., Biscuit"></div>
                    <div><label class="block font-semibold mb-1" for="animalSpecies${i}">Species</label><input type="text" id="animalSpecies${i}" class="w-full p-2 border rounded-md animal-field" data-field="species" value="${esc(a.species)}" placeholder="e.g., dog, cat, rabbit" list="speciesList"></div>
                </div>
                <div class="mt-2"><label class="block font-semibold mb-1" for="animalDesc${i}">Description <span class="muted text-sm">(optional)</span></label>
                    <input type="text" id="animalDesc${i}" class="w-full p-2 border rounded-md animal-field" data-field="description" value="${esc(a.description)}" placeholder="e.g., a small, house-trained terrier mix">
                    <div class="example-chips" data-animal-chips="${i}">${DESCRIPTION_EXAMPLES.map((x) => `<button type="button" class="example-chip">${esc(x)}</button>`).join('')}</div>
                </div>
            </div>`);
        });
        if (!$('#speciesList').length) {
            $('body').append('<datalist id="speciesList"><option value="dog"><option value="cat"><option value="rabbit"><option value="guinea pig"><option value="bird"><option value="ferret"></datalist>');
        }
    }

    // ---------- Signature pad ----------
    const pad = document.getElementById('signaturePad');
    const padCtx = pad.getContext('2d');
    let drawing = false;
    let hasInk = false;
    function padPoint(e) {
        const r = pad.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (pad.width / r.width), y: (e.clientY - r.top) * (pad.height / r.height) };
    }
    function clearPad() {
        padCtx.fillStyle = '#fff';
        padCtx.fillRect(0, 0, pad.width, pad.height);
        hasInk = false;
    }
    clearPad();
    pad.addEventListener('pointerdown', (e) => {
        drawing = true;
        pad.setPointerCapture(e.pointerId);
        const p = padPoint(e);
        padCtx.beginPath();
        padCtx.moveTo(p.x, p.y);
    });
    pad.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        const p = padPoint(e);
        padCtx.lineWidth = 2.6;
        padCtx.lineCap = 'round';
        padCtx.lineJoin = 'round';
        padCtx.strokeStyle = '#111';
        padCtx.lineTo(p.x, p.y);
        padCtx.stroke();
        hasInk = true;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => pad.addEventListener(type, () => { drawing = false; }));
    function setSignature(dataUrl) {
        signatureImageData = dataUrl || '';
        $('#signaturePreview').attr('src', signatureImageData || 'data:,');
        $('#signaturePreviewWrap').toggleClass('hidden', !signatureImageData);
        render();
    }
    $('#clearSignaturePad').on('click', clearPad);
    $('#useDrawnSignature').on('click', () => {
        if (!hasInk) return alert('Draw your signature in the box first.');
        setSignature(pad.toDataURL('image/png'));
    });
    $('#removeSignature').on('click', () => { setSignature(''); $('#signatureUpload').val(''); });
    $('[data-sig-mode]').on('click', function () {
        const mode = this.dataset.sigMode;
        $('[data-sig-mode]').attr('aria-selected', function () { return String(this.dataset.sigMode === mode); });
        $('[data-sig-panel]').each(function () { $(this).toggleClass('hidden', this.dataset.sigPanel !== mode); });
    });
    $('#signatureUpload').on('change', function () {
        const file = this.files && this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setSignature(e.target.result);
        reader.readAsDataURL(file);
    });

    // ---------- Events ----------
    $('#letterGeneratorForm').on('input change', render);
    $('#letterGeneratorForm').on('submit', (e) => e.preventDefault());
    $('input[name="codingSystem"]').on('change', () => { populateDiagnoses(); render(); });
    $('#diagnosisSelect').on('change', () => { refreshSuggestions(); render(); });
    $('#suggestionSelect').on('change', function () { $('#addAccommodationButton').prop('disabled', !$(this).val()); });

    $('#addAccommodationButton').on('click', () => {
        const key = $('#suggestionSelect').val();
        if (!key) return;
        const [code, index] = key.split('::');
        const s = (accommodationSuggestions[code] || [])[Number(index)];
        if (!s) return;
        if (selectedAccommodations.some((a) => a.name === s.name)) return alert('That accommodation is already in the letter.');
        selectedAccommodations.push({ ...s, id: `a${Date.now()}` });
        renderSelectedAccommodations();
        refreshSuggestions();
        render();
    });
    $('#addCustomAccommodationButton').on('click', () => {
        const name = val('#customAccomName');
        const recommendation = val('#customAccomDesc');
        if (!name || !recommendation) return alert('Enter both the accommodation and what it looks like.');
        selectedAccommodations.push({ name, recommendation, id: `a${Date.now()}` });
        $('#customAccomName, #customAccomDesc').val('');
        renderSelectedAccommodations();
        render();
    });
    $('#selectedAccommodations').on('click', '.remove-accommodation', function () {
        const id = String($(this).data('id'));
        selectedAccommodations = selectedAccommodations.filter((a) => String(a.id) !== id);
        renderSelectedAccommodations();
        refreshSuggestions();
        render();
    });

    $('#animalRows').on('input', '.animal-field', function () {
        const i = Number($(this).closest('.animal-row').data('index'));
        animals[i][this.dataset.field] = this.value;
    });
    $('#animalRows').on('click', '.remove-animal', function () {
        animals.splice(Number($(this).data('index')), 1);
        renderAnimalRows();
        render();
    });
    $('#animalRows').on('click', '[data-animal-chips] .example-chip', function () {
        const i = Number($(this).parent().data('animalChips'));
        const input = $(`#animalDesc${i}`);
        const cur = input.val().trim();
        input.val(cur ? `${cur}, ${$(this).text()}` : $(this).text()).trigger('input');
    });
    $('#addAnimalButton').on('click', () => {
        animals.push(newAnimal());
        renderAnimalRows();
        $(`#animalName${animals.length - 1}`).trigger('focus');
        render();
    });
    $(document).on('click', '[data-example-target] .example-chip', function () {
        const target = $($(this).parent().data('exampleTarget'));
        const cur = target.val().trim();
        target.val(cur ? `${cur} ${$(this).text()}` : $(this).text()).trigger('input');
    });

    // ---------- Print, copy, save, import ----------
    function missingCount() {
        return $('#generatedLetter mark.missing').length;
    }
    $('#printLetterButton').on('click', () => {
        const n = missingCount();
        if (n && !confirm(`${n} highlighted detail${n === 1 ? ' is' : 's are'} still missing. Print anyway?`)) return;
        const content = $('#generatedLetter').html();
        const win = window.open('', '_blank');
        if (!win) return alert('Your browser blocked the print window. Allow pop-ups for this site and try again.');
        win.document.write(`<!DOCTYPE html><html><head><title>Letter</title><style>
            body{font-family:Georgia,'Times New Roman',serif;line-height:1.6;color:#000;margin:0}
            .letter{max-width:7in;margin:0.9in auto;padding:0 0.25in}
            p,ul{margin:0 0 1em}ul{padding-left:22px}li{margin-bottom:.4em}
            .signature-img{display:block;max-height:60px;margin-bottom:4px}
            .sig-line{margin-top:34px;border-top:1px solid #000;padding-top:2px;font-size:.9em}
            .sig-grid{display:grid;grid-template-columns:2fr 1fr;gap:0 24px}
            mark.missing{background:#fde68a}
            @page{margin:0.6in}
        </style></head><body><div class="letter">${content}</div></body></html>`);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); }, 250);
    });
    $('#copyLetterButton').on('click', () => {
        const text = document.getElementById('generatedLetter').innerText;
        const done = () => alert('Letter copied. Paste it into your document or EHR.');
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
        } else {
            fallbackCopy(text, done);
        }
    });
    function fallbackCopy(text, done) {
        const t = document.createElement('textarea');
        t.value = text;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
        done();
    }

    const SIMPLE_FIELDS = ['clientFirstName', 'clientLastName', 'clientDOB', 'clientStartDate', 'clientPronouns', 'clientLegalName',
        'clinicianFirstName', 'clinicianLastName', 'customLicenseType', 'licenseState', 'licenseNumber', 'licenseExpiration',
        'clinicianNpi', 'clinicianPhone', 'clinicianEmail', 'clinicianAddress', 'lifeActivityOther', 'institutionName',
        'treatmentLength', 'functionalImpact', 'referredToProvider', 'reasonForReferral', 'whatWorked', 'safetyDetails',
        'gaRecipient', 'gaCareOther', 'gaAssessmentBasis', 'gaDiagnosis', 'gaAdditional', 'roiDisclosingParty', 'roiRecipient',
        'roiRecipientContact', 'roiInfoOther', 'roiPurposeOther', 'roiExpiration', 'roiExpirationEvent'];
    const CHECK_GROUPS = ['lifeActivityChecks', 'referralGoalChecks', 'safetyConcernChecks', 'gaCareChecks', 'gaCriteriaChecks', 'roiInfoChecks', 'roiPurposeChecks'];
    const TOGGLES = ['includeDiagnosis', 'gaIncludeDiagnosis', 'roiPart2', 'roiRepresentative'];
    const RADIOS = ['codingSystem', 'referralType', 'safetyStatus', 'roiDirection'];

    function collectState() {
        const state = { version: 2, letterType: $('#letterTypeSelect').val(), licenseType: $('#licenseTypeSelect').val() };
        SIMPLE_FIELDS.forEach((id) => { state[id] = $(`#${id}`).val(); });
        CHECK_GROUPS.forEach((id) => { state[id] = $(`#${id} input:checked`).map(function () { return this.value; }).get(); });
        TOGGLES.forEach((id) => { state[id] = $(`#${id}`).is(':checked'); });
        RADIOS.forEach((name) => { state[name] = $(`input[name="${name}"]:checked`).val(); });
        state.diagnosisCodes = $('#diagnosisSelect').val() || [];
        state.animals = animals;
        state.selectedAccommodations = selectedAccommodations;
        return state;
    }

    function applyState(data) {
        if (!data || typeof data !== 'object') throw new Error('Not a letter file');
        // Older files used separate start-date fields and a single animal.
        if (!data.clientStartDate && data.startDate) data.clientStartDate = data.startDate;
        if (!data.animals && (data.animalType || data.petDescription)) {
            data.animals = [{ name: '', species: data.animalType || '', description: data.petDescription || '' }];
        }
        if (!data.diagnosisCodes && data.diagnosisCode) data.diagnosisCodes = [data.diagnosisCode];
        if (!data.clientDOB && data.clientDOB !== '') data.clientDOB = '';

        RADIOS.forEach((name) => {
            if (data[name]) $(`input[name="${name}"][value="${data[name]}"]`).prop('checked', true);
        });
        populateDiagnoses();
        $('#letterTypeSelect').val(data.letterType || '').trigger('change');
        $('#licenseTypeSelect').val(data.licenseType || '').trigger('change');
        SIMPLE_FIELDS.forEach((id) => { if (data[id] !== undefined) $(`#${id}`).val(data[id]); });
        CHECK_GROUPS.forEach((id) => {
            if (!Array.isArray(data[id])) return;
            $(`#${id} input`).each(function () { this.checked = data[id].includes(this.value); });
        });
        TOGGLES.forEach((id) => { if (typeof data[id] === 'boolean') $(`#${id}`).prop('checked', data[id]); });
        $('#diagnosisSelect').val(data.diagnosisCodes || []).trigger('change');
        animals = Array.isArray(data.animals) && data.animals.length ? data.animals.map((a) => ({ ...newAnimal(), ...a })) : [newAnimal()];
        selectedAccommodations = Array.isArray(data.selectedAccommodations) ? data.selectedAccommodations : [];
        renderAnimalRows();
        renderSelectedAccommodations();
        refreshSuggestions();
        render();
    }

    $('#exportJsonButton').on('click', () => {
        const blob = new Blob([JSON.stringify(collectState(), null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'letter_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    $('#importJsonButton').on('click', () => $('#importJsonFile').click());
    $('#importJsonFile').on('change', function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                applyState(JSON.parse(e.target.result));
            } catch (err) {
                console.error(err);
                alert('That file isn’t a Letter Generator .json.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#letterGeneratorForm').on('reset', () => {
        setTimeout(() => {
            animals = [newAnimal()];
            selectedAccommodations = [];
            setSignature('');
            clearPad();
            $('#letterTypeSelect, #licenseTypeSelect, #diagnosisSelect').val(null).trigger('change');
            renderAnimalRows();
            renderSelectedAccommodations();
            refreshSuggestions();
            render();
        }, 0);
    });
});
