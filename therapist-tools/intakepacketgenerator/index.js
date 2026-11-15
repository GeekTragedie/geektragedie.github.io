// Intake Packet Generator
// Every packet section is generated from the settings form plus the clinician's state
// (../shared/states.json). A section's wording can be edited by hand; edited sections
// stop updating until they're reset. The packet preview updates as you type.
$(function () {
    'use strict';

    const STORAGE_KEY = 'geektragedie_intake_packet_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_intake_packet_cache_enabled';

    const SECTIONS = [
        { key: 'welcome', title: 'Welcome and What to Expect', check: 'Welcome and what to expect', on: true },
        { key: 'disclosure', title: 'Professional Disclosure Statement', check: 'Professional disclosure statement', on: true },
        { key: 'consent', title: 'Informed Consent and Limits of Confidentiality', check: 'Informed consent and limits of confidentiality', on: true },
        { key: 'policies', title: 'Practice Policies', check: 'Practice policies (billing, cancellations, communication)', on: true },
        { key: 'telehealth', title: 'Telehealth Consent and Safety', check: 'Telehealth consent and safety', on: true },
        { key: 'hipaa', title: 'Your Privacy Rights (HIPAA Summary)', check: 'Privacy rights summary (HIPAA)', on: true },
        { key: 'gfe', title: 'Good Faith Estimate', check: 'Good Faith Estimate worksheet (No Surprises Act)', on: true },
        { key: 'questionnaire', title: 'Intake Questionnaire', check: 'Intake questionnaire', on: true },
        { key: 'assessments', title: 'Screening Questionnaires', check: 'Assessments to complete', on: false },
        { key: 'custom', title: '', check: 'Your own section (upload or paste)', on: false },
        { key: 'signatures', title: 'Acknowledgment and Signatures', check: 'Signature page', on: true }
    ];
    const PAGE_BREAK = new Set(['gfe', 'questionnaire', 'assessments', 'signatures']);

    let statesData = { list: [], states: { _default: {} } };
    let assessments = [];
    let customized = {};

    const val = (sel) => String($(sel).val() ?? '').trim();
    const join = (items, conj) => TTShared.listJoin(items, conj);
    const ph = (label) => `[${label}]`;
    const esc = (str) => String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

    // ---------- Setup ----------
    const sectionChecks = $('#sectionChecks');
    SECTIONS.forEach((s) => sectionChecks.append(`<label><input type="checkbox" class="pkt-section-cb" value="${s.key}"${s.on ? ' checked' : ''}> ${esc(s.check)}</label>`));
    SECTIONS.forEach((s) => $('#sectionEditors').append(`
        <details id="editor-${s.key}" class="pkt-editor-block collapsible help">
            <summary><span>${esc(s.title || 'Your own section')} <span class="edited-badge hidden">Edited</span></span><span class="chevron" aria-hidden="true">▾</span></summary>
            <div class="collapsible-body">
                <p class="muted text-sm">This text updates from your settings. Edit it here to make it your own; edited sections stop updating until you reset them.</p>
                <textarea id="text-${s.key}" aria-label="${esc(s.title || 'Your own section')} wording" rows="10" class="pkt-textarea w-full p-3 border rounded-md text-sm" data-section="${s.key}"></textarea>
                <button type="button" class="btn btn-sm reset-section hidden" data-section="${s.key}">Reset to generated wording</button>
            </div>
        </details>`));
    $('#sectionEditors').prepend('<h2 class="text-xl font-semibold">Section wording</h2>');

    const getJSON = (url) => Promise.resolve($.getJSON(url));
    Promise.all([
        getJSON('../shared/license-types.json').catch(() => ({ licenseTypes: [] })),
        TTShared.loadStates().catch(() => statesData),
        getJSON('../assessmentdatabase/assessments-data.json').catch(() => ({ assessments: [] }))
    ]).then(([licenses, states, assessData]) => {
        statesData = states;
        const lt = $('#pktLicenseType').append(new Option('Choose…', ''));
        licenses.licenseTypes.forEach((t) => lt.append(new Option(t, t)));
        const st = $('#pktLicenseState').append(new Option('Choose…', ''));
        (statesData.list || []).forEach(([code, name]) => st.append(new Option(name, code)));
        assessments = assessData.assessments || [];
        $('#assessmentChecks').html(assessments.map((a) => `<label><input type="checkbox" class="pkt-assessment-cb" value="${esc(a.id)}"> <span><strong>${esc(a.acronym)}</strong> ${esc(a.fullName)}</span></label>`).join('') || '<p class="muted text-sm">The Assessment Database couldn’t be loaded.</p>');
        checkLocalCacheOnLoad();
        if (window.TTPractice) window.TTPractice.onLoad(applyPracticeData);
        render();
    });

    function applyPracticeData(data) {
        const lic = data && data.therapist && Array.isArray(data.therapist.licenses) && data.therapist.licenses[0];
        if (lic && lic.type && !$('#pktLicenseType').val()) {
            const abbr = lic.type.trim().toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const match = $('#pktLicenseType option').filter(function () { return new RegExp(`\\(${abbr}[,)]`).test(this.value); }).first();
            if (match.length) $('#pktLicenseType').val(match.val());
        }
        render();
    }

    // ---------- Settings ----------
    function stateInfo() {
        const code = $('#pktLicenseState').val();
        const name = (statesData.list || []).find(([c]) => c === code);
        return { code, name: name ? name[1] : '', data: (statesData.states || {})[code] || null };
    }
    function vars() {
        const st = stateInfo();
        const licenseType = val('#pktLicenseType');
        const abbr = (licenseType.match(/\(([^)]+)\)/) || [])[1] || licenseType;
        const degree = val('#pktDegree');
        return {
            st,
            practiceName: val('#pktPracticeName') || ph('Practice name'),
            clinicianName: val('#pktClinicianName') || ph('Your name and credentials'),
            degree: degree && degree !== 'Other' ? degree : '',
            degreeField: val('#pktDegreeField'),
            approach: val('#pktEducationApproach'),
            licenseType,
            licenseLine: `${abbr || ph('License type')}, ${st.name ? `${st.name} ` : ''}License No. ${val('#pktLicenseNumber') || ph('License number')}`,
            isAssociate: /associate/i.test(licenseType),
            supName: val('#pktSupervisorName') || ph('Supervisor’s name and credentials'),
            supLicense: val('#pktSupervisorLicense'),
            supContact: val('#pktSupervisorContact'),
            npi: val('#pktNpiNumber') || ph('NPI'),
            phone: val('#pktPhone') || ph('Phone'),
            email: val('#pktEmail') || ph('Email'),
            website: val('#pktWebsite'),
            address: val('#pktAddress') || ph('Office address'),
            intakeFee: val('#pktIntakeFee'),
            assessmentFee: val('#pktAssessmentFee'),
            standardFee: val('#pktStandardFee'),
            shortFee: val('#pktShortFee'),
            sliding: $('input[name="feeModel"]:checked').val() === 'sliding',
            slidingRange: val('#pktSlidingRange'),
            insurance: $('input[name="insuranceModel"]:checked').val() || 'oon',
            panels: val('#pktPanels'),
            superbills: $('#pktSuperbills').is(':checked'),
            medicaid: $('#pktMedicaid').is(':checked'),
            billingPlatform: val('#pktBillingPlatform'),
            paymentMethods: val('#pktPaymentMethods'),
            cancelHours: val('#pktCancelHours') || '24',
            cancelFee: val('#pktCancelFee'),
            aiUse: $('input[name="aiUse"]:checked').val() || 'none',
            aiTool: val('#pktAiTool'),
            aiData: val('#pktAiData'),
            retention: $('#pktRetention').is(':checked'),
            minors: $('#pktMinorConsent').is(':checked'),
            noForensic: $('#pktNoForensic').is(':checked')
        };
    }
    function enabled() {
        return $('.pkt-section-cb:checked').map(function () { return this.value; }).get();
    }
    function feeLines(v) {
        const lines = [];
        lines.push(`• Initial intake evaluation (CPT 90791): ${v.intakeFee || ph('Intake fee')}`);
        if (v.assessmentFee) lines.push(`• Assessment: ${v.assessmentFee}`);
        lines.push(`• Individual session, 53 minutes or more (CPT 90837): ${v.standardFee || ph('Session fee')}`);
        if (v.shortFee) lines.push(`• Individual session, 38–52 minutes (CPT 90834): ${v.shortFee}`);
        if (v.sliding) lines.push(`A limited number of sliding-scale spots are available${v.slidingRange ? ` (${v.slidingRange})` : ''}, based on financial need. Ask me about it at any time.`);
        return lines.join('\n');
    }

    // ---------- Section text ----------
    function sectionText(key, v) {
        const st = v.st;
        const wa = st.data;
        const stateLabel = st.name || ph('your state');
        const check = ph("check your state's rules");
        const on = enabled();
        switch (key) {
        case 'welcome':
            return `Welcome to ${v.practiceName}! Starting therapy, especially for the first time, can feel hopeful and a little intimidating. This guide explains what to expect so your first session holds fewer surprises.

HOW YOUR FIRST SESSION WORKS
Your first appointment (about 50 to 60 minutes) is a collaborative “get to know you” session. You never have to share everything at once or talk about painful memories before you’re ready. Together, we will:
• Review this paperwork and answer your questions about privacy and confidentiality.
• Talk about what brought you to therapy now and what you’d like to feel different.
• Touch on your background, daily life, strengths, sensory or communication preferences, and supports.
• Agree on first goals and a comfortable pace.

YOU’RE IN CHARGE OF YOUR PACE
• You can pass on any question. Just say, “I’d like to skip that for now.”
• Bring what helps you feel comfortable: water, a fidget, notes, a blanket, or comfy clothes.
• You don’t need to make eye contact or sit still. Stim, stretch, doodle, or adjust the lighting as you need.
• Fit matters most. If you’d like a different style or specialty, tell me. I’m glad to adjust my approach or help you find a referral.`;

        case 'disclosure': {
            const parts = [];
            parts.push(`PROFESSIONAL DISCLOSURE STATEMENT${wa && wa.disclosure ? `\nThis statement is provided under ${wa.disclosure.cite.replace('Wash. Admin. Code §', 'WAC')}.` : ''}`);
            parts.push(`Practitioner: ${v.clinicianName}\nLicense: ${v.licenseLine} | NPI: ${v.npi}\nPractice: ${v.practiceName}\nAddress: ${v.address}\nContact: ${[v.phone, v.email, v.website].filter(Boolean).join(' | ')}`);
            const edu = v.degree ? `I hold a ${v.degree}${v.degreeField ? ` in ${v.degreeField}` : ''}.` : `${ph('Your degree')}`;
            parts.push(`EDUCATION, TRAINING, AND APPROACH\n${edu}${v.approach ? ` My approach is ${v.approach}.` : ''} I see you as a partner in this work and respect your lived experience and choices.`);
            parts.push('COURSE OF TREATMENT\nIn our first sessions we will agree on goals together. I will describe the approaches I suggest and about how often we will meet, and we will revisit the plan as things change.');
            parts.push(`FEES AND BILLING\n${feeLines(v)}\nPayment is due at the time of service. I don’t require payment in advance for sessions that haven’t happened; if you ever pay ahead, I will refund any unused amount. Billing details and the cancellation policy are in Practice Policies.`);
            let rights = 'YOUR RIGHTS AS A CLIENT\n• You may choose a counselor who fits your needs, ask about any approach I suggest, and refuse any treatment or end therapy at any time.';
            if (wa && wa.board) {
                rights += `\n• I am licensed by the ${wa.board.name} under ${wa.licensingLaw || wa.disclosure.licensingLaw}. Licensure does not mean the state endorses a particular approach or guarantees that a treatment will work.`;
            } else {
                rights += `\n• I am licensed in ${stateLabel}${v.licenseType ? ` as a ${v.licenseType}` : ''}. Licensure does not mean the state endorses a particular approach or guarantees that a treatment will work. ${check}`;
            }
            if (v.isAssociate) rights += `\n• I am a licensed associate and practice under the supervision of ${v.supName}${v.supLicense ? ` (License No. ${v.supLicense})` : ''}.${v.supContact ? ` You may contact my supervisor at ${v.supContact}.` : ''} My supervisor may review my work with you to support your care and is also bound by confidentiality.`;
            parts.push(rights);
            if (wa && wa.board) {
                parts.push(`FILING A COMPLAINT\nIf you believe I have engaged in unprofessional conduct, you may contact the ${wa.board.name}${wa.disclosure && wa.disclosure.unprofessionalConduct ? `, which can also give you the list of unprofessional conduct under ${wa.disclosure.unprofessionalConduct}` : ''}.\nPhone: ${wa.board.phone} | ${wa.board.url.replace(/^https?:\/\//, '')}`);
            } else {
                parts.push(`FILING A COMPLAINT\nIf you believe I have engaged in unprofessional conduct, you may contact the licensing board for my profession in ${stateLabel}. ${check}`);
            }
            return parts.join('\n\n');
        }

        case 'consent': {
            const parts = ['INFORMED CONSENT FOR PSYCHOTHERAPY'];
            parts.push('RISKS AND BENEFITS\nTherapy can help reduce distress, build coping skills, improve relationships, and deepen self-understanding. Because it can involve difficult emotions or life changes, you may sometimes feel temporarily uncomfortable or notice shifts in your relationships as part of the process.');
            const laws = wa && wa.privilege && wa.confidentiality
                ? `HIPAA, ${wa.privilege.short.replace(' counselor privilege', '')}, and the ${wa.confidentiality.short}`
                : `HIPAA and ${st.name ? `${st.name} law` : 'state law'}`;
            const report = wa && wa.reporting
                ? `I am required by law to report it to ${wa.reporting.child} for children, or to ${wa.reporting.adult} for vulnerable adults.`
                : `I am required by law to report it to the appropriate protective services agency. ${st.name ? '' : check}`.trim();
            const exceptions = [
                '• Danger to yourself or others: if there is a clear, immediate risk of serious harm to you or an identifiable person, I am ethically and legally required to take steps to keep everyone safe.',
                `• Abuse or neglect: if I have reasonable cause to believe a child, an older adult, or a vulnerable adult is being abused or neglected, ${report}`,
                '• Court orders: if a judge orders records, or as otherwise required by law. I will tell you first whenever the law allows.'
            ];
            if (v.insurance !== 'none') exceptions.push('• Insurance billing: if you use insurance, your plan receives basic information such as dates of service, procedure codes, and a diagnosis code.');
            exceptions.push('• Consultation: I may consult with other professionals without sharing your name or identifying details.');
            parts.push(`CONFIDENTIALITY AND ITS LIMITS\nWhat you share in therapy, including the fact that you’re my client, is protected by ${laws}. I won’t release information without your written authorization (a Release of Information), except in these situations:\n${exceptions.join('\n')}`);
            if (v.minors) {
                const age = wa && wa.minorConsentAge
                    ? `${wa.minorConsentAge.text} (${wa.minorConsentAge.cite.replace('Wash. Rev. Code §', 'RCW')})`
                    : `The age at which a minor can consent to their own mental health care depends on state law. ${check}`;
                parts.push(`CLIENTS UNDER 18\n${age} When a parent or guardian consents to a minor’s care, I will talk with everyone at the start about what I will and won’t share with parents, so the young person can trust that therapy is a safe space.`);
            }
            if (v.retention) {
                const keep = wa && wa.recordRetention
                    ? `I keep clinical records ${wa.recordRetention.text} (${wa.recordRetention.cite.replace('Wash. Admin. Code §', 'WAC')}).`
                    : `I keep clinical records for the period required by law and my professional code of ethics. ${check}`;
                parts.push(`RECORDS\n${keep} Records are stored securely, and you may ask for a copy of yours at any time.`);
            }
            if (v.noForensic) parts.push('FORENSIC AND CUSTODY MATTERS\nI do not provide forensic evaluations, custody evaluations, or parenting-time recommendations, and I do not serve as an expert witness. If you need these services, I can refer you to a qualified evaluator.');
            return parts.join('\n\n');
        }

        case 'policies': {
            const parts = ['PRACTICE POLICIES'];
            const pay = [];
            if (!on.includes('disclosure')) pay.push(feeLines(v));
            pay.push('Payment is due at the time of service.');
            if (v.paymentMethods) pay.push(`I accept ${v.paymentMethods}.`);
            if (v.billingPlatform) pay.push(`Billing is handled through ${v.billingPlatform}.`);
            if (v.insurance === 'innetwork') pay.push(`I am in network with ${v.panels || ph('insurance plans')}. You are responsible for any copay, coinsurance, or deductible, and for checking your plan’s mental health benefits.`);
            if (v.insurance === 'oon') pay.push('I am not in network with insurance plans.');
            if (v.insurance === 'none') pay.push('I am a private-pay practice and do not bill insurance.');
            if (v.superbills && v.insurance !== 'none') pay.push('I can give you a superbill (an itemized receipt) to send to your insurance for possible out-of-network reimbursement. Reimbursement isn’t guaranteed, so check your plan’s benefits.');
            if (v.medicaid) pay.push(`I accept ${wa && wa.medicaid ? `${wa.medicaid.name} (Medicaid)` : 'Medicaid'}.`);
            parts.push(`FEES AND PAYMENT\n${pay.join(' ')}`);
            let cancel = `Your appointment time is reserved just for you. Please give at least ${v.cancelHours} hours’ notice if you need to cancel or reschedule. Late cancellations and missed appointments ${v.cancelFee ? `are charged ${v.cancelFee}` : 'may be charged a fee'}. Insurance does not pay for missed appointments.`;
            if (v.medicaid) cancel += wa && wa.medicaid && wa.medicaid.noShowNote ? ` ${wa.medicaid.noShowNote}` : ` If you have Medicaid, fees for missed appointments may not be allowed. ${check}`;
            parts.push(`CANCELLATIONS AND MISSED APPOINTMENTS\n${cancel}`);
            parts.push(`COMMUNICATION\nYou can reach me by secure portal message, email (${v.email}), or phone (${v.phone}). I check messages during business hours and reply within one to two business days. Let me know on the intake questionnaire how you’d like me to contact you.`);
            parts.push('EMERGENCIES\nI don’t provide 24-hour crisis services. In a life-threatening emergency or mental health crisis, call or text 988 (the Suicide and Crisis Lifeline), call 911, or go to your nearest emergency room.');
            parts.push('SOCIAL MEDIA AND RUNNING INTO EACH OTHER\nTo protect your privacy, I don’t accept friend or follow requests from current or former clients. If we run into each other in public, I’ll follow your lead and won’t greet you first.');
            const tool = v.aiTool ? ` (${v.aiTool})` : '';
            const ai = {
                none: 'I do not use artificial intelligence (AI) tools with your information.',
                admin: 'I may use AI-assisted tools for administrative tasks, such as scheduling or billing, but never with the content of our sessions. Any tool that handles your information is covered by a business associate agreement (BAA) as HIPAA requires.',
                documentation: `With your separate written consent, I may use an AI note-assist tool${tool} to help draft my session notes. I review and edit every note myself.${v.aiData ? ` How it handles your information: ${v.aiData}.` : ` ${ph('How the tool stores and deletes recordings or transcripts')}`} You can decline or withdraw consent at any time, and it won’t affect your care. I never record a session without your consent.`
            }[v.aiUse];
            parts.push(`USE OF AI TOOLS\n${ai}`);
            return parts.join('\n\n');
        }

        case 'telehealth':
            return `TELEHEALTH CONSENT AND SAFETY

HOW TELEHEALTH WORKS
Telehealth sessions use live video (or phone) on a HIPAA-compliant platform. Telehealth makes care easier to reach, but technical problems can happen, and privacy depends partly on where you join from.

EVERY SESSION
• Location: because of licensing laws, you need to be physically in ${stateLabel} (or another state where I’m licensed) during each session.
• Safety: at the start of each session we’ll confirm where you are and a local emergency contact, in case of an urgent medical or safety need.
• Privacy: please join from a private, quiet place, and never while driving. If we get disconnected, I’ll try to reconnect within two to three minutes, or call you at the number on file.`;

        case 'hipaa': {
            let text = `YOUR PRIVACY RIGHTS (HIPAA SUMMARY)
Under the Health Insurance Portability and Accountability Act (HIPAA), you have the right to:
• Get a copy of your record, and ask me to correct information you believe is wrong.
• Ask for confidential communication, such as whether I may leave voicemails or send reminders by text or email.
• Get a list of certain disclosures of your health information made outside of treatment, payment, and health care operations.
• Get a full paper or digital copy of my Notice of Privacy Practices at any time.`;
            if (!on.includes('gfe')) {
                text += '\n\nGOOD FAITH ESTIMATE\nUnder the No Surprises Act, if you don’t have insurance or choose not to use it, you have the right to a Good Faith Estimate of the cost of your care before it starts. If you’re billed at least $400 more than your estimate, you can dispute the bill.';
            }
            return text;
        }

        case 'gfe':
            return `GOOD FAITH ESTIMATE FOR HEALTH CARE ITEMS AND SERVICES
Under the No Surprises Act, if you don’t have insurance or aren’t using insurance, you have the right to receive a Good Faith Estimate of the expected cost of your care.

Client name: ________________________________   Date of birth: ______________
Date of this estimate: ______________   Expected start date of services: ______________
Provider: ${v.clinicianName} | NPI: ${v.npi} | Tax ID: ______________
Practice and location: ${v.practiceName}, ${v.address}
Diagnosis code(s), if known: ______________

ESTIMATED SERVICES
• Initial intake evaluation (CPT 90791), 1 session × ${v.intakeFee || ph('Intake fee')} = ______________
• Individual psychotherapy (CPT 90837), ______ sessions × ${v.standardFee || ph('Session fee')} = ______________
${v.shortFee ? `• Individual psychotherapy (CPT 90834), ______ sessions × ${v.shortFee} = ______________\n` : ''}Estimated total for the next ______ months: ______________

PLEASE NOTE
• This is an estimate, not a contract, and it doesn’t require you to get these services. Your actual costs may differ if your needs change.
• If you’re billed at least $400 more than this estimate, you have the right to dispute the bill. Keep a copy of this estimate.
• For questions or to start a dispute, visit www.cms.gov/nosurprises or call 1-800-985-3059.`;

        case 'questionnaire': {
            let text = `INTAKE QUESTIONNAIRE
Answer only what feels comfortable today. We can talk through the rest together.

ABOUT YOU
• Legal name: ____________________________   Name you use: ____________________________
• Pronouns: ______________   Date of birth: ______________
• Phone: __________________   Email: ______________________________
• Address where you’ll be during sessions: _____________________________________________
• Emergency contact (name, relationship, and phone): ____________________________________

HOW YOU’D LIKE ME TO CONTACT YOU
• Best way to reach you:  ☐ Phone call   ☐ Text   ☐ Email   ☐ Client portal
• May I leave a voicemail?  ☐ Yes   ☐ No        May I text appointment reminders?  ☐ Yes   ☐ No
• May I email you about scheduling and billing?  ☐ Yes   ☐ No
`;
            if (v.minors) text += `
PARENT OR GUARDIAN (for clients under 18)
• Name and relationship: __________________________________   Phone: __________________
• Who has legal authority to consent to treatment? ____________________________________
`;
            text += `
WHAT BRINGS YOU HERE
• What brings you to therapy now, and what would you most like to get out of our work together?
  _____________________________________________________________________________
  _____________________________________________________________________________
• Have you been in therapy before? What helped, and what didn’t?
  _____________________________________________________________________________
• Are there sensory, communication, accessibility, or pacing needs that help you feel comfortable?
  _____________________________________________________________________________
• Current medications, medical conditions, and your primary care provider or prescriber:
  _____________________________________________________________________________
• What are some of your strengths, values, interests, or sources of support?
  _____________________________________________________________________________`;
            return text;
        }

        case 'assessments': {
            const picked = $('.pkt-assessment-cb:checked').map(function () { return this.value; }).get()
                .map((id) => assessments.find((a) => a.id === id)).filter(Boolean);
            if (!picked.length) return `SCREENING QUESTIONNAIRES\n${ph('Choose assessments to include')}`;
            const lines = picked.map((a) => `• ${a.acronym}: ${a.fullName}${a.itemsTime ? ` (${a.itemsTime})` : ''}`);
            return `SCREENING QUESTIONNAIRES\nPlease complete the following questionnaires before your first session. They help us understand how you’re doing now and track progress over time. There are no right or wrong answers, and you can skip any question.\n${lines.join('\n')}\n\nThe questionnaire forms are attached separately.`;
        }

        case 'custom':
            return `${(val('#pktCustomTitle') || ph('Your section title')).toUpperCase()}\n${val('#pktCustomText') || ph('Your section text')}`;

        case 'signatures': {
            const included = SECTIONS.filter((s) => on.includes(s.key) && !['signatures', 'questionnaire', 'assessments', 'gfe', 'welcome'].includes(s.key))
                .map((s) => (s.key === 'custom' ? (val('#pktCustomTitle') || 'the additional section') : s.title));
            let text = `ACKNOWLEDGMENT AND CONSENT
By signing below, I acknowledge that I have received and read (or had explained to me) the ${included.length ? join(included) : ph('sections in this packet')} for ${v.practiceName} (${v.clinicianName}). I have had the chance to ask questions, and I voluntarily consent to counseling services.`;
            if (v.aiUse === 'documentation') text += '\n\nAI NOTE-ASSIST TOOL (see Practice Policies)\n☐ I consent   ☐ I do not consent   to the use of an AI note-assist tool for my session notes.';
            text += `

Client printed name: ______________________________________________

Client signature: ________________________________________   Date: ______________`;
            if (v.minors) text += `

Parent or guardian printed name and relationship: _________________________________

Parent or guardian signature: _____________________________   Date: ______________`;
            text += `

Clinician signature (${v.clinicianName}): ______________________________   Date: ______________`;
            return text;
        }
        default:
            return '';
        }
    }

    // ---------- Rendering ----------
    function sectionTitle(s) {
        return s.key === 'custom' ? (val('#pktCustomTitle') || 'Additional Information') : s.title;
    }
    function textFor(key, v) {
        return customized[key] !== undefined ? customized[key] : sectionText(key, v);
    }
    function markMissing(html) {
        return html.replace(/\[([^\]\n]{2,80})\]/g, '<mark class="missing">[$1]</mark>');
    }
    function buildPacketHtml(forPrint) {
        const v = vars();
        const on = enabled();
        let html = `<div class="packet-document"><div class="packet-doc-header"><h1>${esc(v.practiceName)}</h1>
            <div class="packet-doc-sub"><strong>${esc(v.clinicianName)}</strong> &bull; ${esc(v.licenseLine)} &bull; NPI: ${esc(v.npi)}<br>${esc(v.address)} &bull; ${esc(v.phone)} &bull; ${esc(v.email)}</div></div>`;
        SECTIONS.forEach((s) => {
            if (!on.includes(s.key)) return;
            const content = textFor(s.key, v);
            if (!content.trim()) return;
            html += `<div class="packet-section${PAGE_BREAK.has(s.key) ? ' page-break-section' : ''}"><h2>${esc(sectionTitle(s))}</h2><div class="packet-body-text">${esc(content)}</div></div>`;
        });
        html += '</div>';
        return forPrint ? html : markMissing(html);
    }
    function buildPacketPlainText() {
        const v = vars();
        const lines = [v.practiceName.toUpperCase(), `${v.clinicianName} | ${v.licenseLine} | NPI: ${v.npi}`, `${v.address} | ${v.phone} | ${v.email}`, '='.repeat(70), ''];
        SECTIONS.forEach((s) => {
            if (!enabled().includes(s.key)) return;
            const content = textFor(s.key, v).trim();
            if (content) lines.push(content, '', '-'.repeat(70), '');
        });
        return lines.join('\n').trim();
    }

    let queued = false;
    function render() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            const v = vars();
            const on = enabled();
            $('#supervisorBlock').toggleClass('hidden', !v.isAssociate);
            $('#pktPanels').toggleClass('hidden', v.insurance !== 'innetwork');
            $('#pktSlidingRange').prop('disabled', !v.sliding);
            $('#aiDetailsBlock').toggleClass('hidden', v.aiUse !== 'documentation');
            $('#assessmentPicker').toggleClass('hidden', !on.includes('assessments'));
            $('#customSectionBlock').toggleClass('hidden', !on.includes('custom'));
            const wa = v.st.data;
            $('#medicaidNameHint').text(wa && wa.medicaid ? `(${wa.medicaid.name} in ${v.st.name})` : '');
            $('#retentionHint').text(wa && wa.recordRetention ? `(${v.st.name}: ${wa.recordRetention.text})` : '');
            $('#minorHint').text(wa && wa.minorConsentAge ? `(${v.st.name}: age ${wa.minorConsentAge.age}+ can consent)` : '');
            SECTIONS.forEach((s) => {
                const editor = $(`#editor-${s.key}`);
                editor.toggleClass('hidden', !on.includes(s.key));
                const label = editor.find('summary > span:first-child')[0];
                if (label && label.firstChild) label.firstChild.nodeValue = `${sectionTitle(s)} `;
                const ta = $(`#text-${s.key}`);
                const isCustom = customized[s.key] !== undefined;
                if (!isCustom && document.activeElement !== ta[0]) ta.val(sectionText(s.key, v));
                editor.find('.edited-badge').toggleClass('hidden', !isCustom);
                editor.find('.reset-section').toggleClass('hidden', !isCustom);
            });
            $('#packetPreviewHtml').html(buildPacketHtml(false));
            saveToLocalCacheIfEnabled();
        });
    }

    // ---------- Events ----------
    $('#packetForm').on('input change', (e) => {
        const ta = e.target.closest && e.target.closest('.pkt-textarea');
        if (ta && e.type === 'input') customized[ta.dataset.section] = ta.value;
        render();
    });
    $('#packetForm').on('submit', (e) => e.preventDefault());
    $('#sectionEditors').on('click', '.reset-section', function () {
        delete customized[this.dataset.section];
        render();
    });
    $('#resetDefaultTemplatesBtn').on('click', () => {
        if (!Object.keys(customized).length) return alert('No sections have been edited.');
        if (!confirm('Reset every edited section to the generated wording? Your edits will be lost.')) return;
        customized = {};
        render();
    });
    $('#pktCustomUpload').on('change', function () {
        const file = this.files && this.files[0];
        if (!file) return;
        if (file.size > 200000) {
            alert('That file is too large. Use a plain text file under 200 KB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            $('#pktCustomText').val(String(e.target.result).replace(/\r\n/g, '\n'));
            if (!val('#pktCustomTitle')) $('#pktCustomTitle').val(file.name.replace(/\.(txt|md)$/i, '').replace(/[_-]+/g, ' '));
            render();
        };
        reader.readAsText(file);
        $(this).val('');
    });

    // ---------- Print and export ----------
    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    $('#printPacketPdfBtn').on('click', () => {
        const missing = $('#packetPreviewHtml mark.missing').length;
        if (missing && !confirm(`${missing} highlighted detail${missing === 1 ? ' is' : 's are'} still missing. Print anyway?`)) return;
        const v = vars();
        const win = window.open('', '_blank');
        if (!win) return alert('Your browser blocked the print window. Allow pop-ups for this site and try again.');
        win.document.write(`<!DOCTYPE html><html><head><title>Client Intake Packet — ${esc(v.practiceName)}</title><style>
            @page { margin: 0.65in; }
            body { font-family: Georgia, "Times New Roman", serif; color: #000; background: #fff; font-size: 10.5pt; line-height: 1.5; margin: 0; }
            .packet-doc-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 18px; }
            .packet-doc-header h1 { margin: 0 0 4px 0; font-size: 18pt; }
            .packet-doc-sub { font-size: 9.5pt; color: #333; }
            .packet-section { margin-bottom: 20px; }
            .packet-section h2 { font-size: 12.5pt; border-bottom: 1px solid #333; padding-bottom: 3px; margin: 14px 0 8px 0; }
            .packet-body-text { white-space: pre-wrap; }
            .page-break-section { page-break-before: always; break-before: page; }
        </style></head><body>${buildPacketHtml(true)}</body></html>`);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); }, 250);
    });
    $('#exportPacketTxtBtn').on('click', () => downloadFile(buildPacketPlainText(), 'client_intake_packet.txt', 'text/plain;charset=utf-8'));

    // ---------- Save, import, and browser cache ----------
    const FIELDS = ['pktPracticeName', 'pktClinicianName', 'pktDegree', 'pktDegreeField', 'pktEducationApproach', 'pktLicenseType', 'pktLicenseState',
        'pktLicenseNumber', 'pktSupervisorName', 'pktSupervisorLicense', 'pktSupervisorContact', 'pktNpiNumber', 'pktPhone', 'pktEmail', 'pktWebsite',
        'pktAddress', 'pktIntakeFee', 'pktAssessmentFee', 'pktStandardFee', 'pktShortFee', 'pktSlidingRange', 'pktPanels', 'pktBillingPlatform',
        'pktPaymentMethods', 'pktCancelHours', 'pktCancelFee', 'pktAiTool', 'pktAiData', 'pktCustomTitle', 'pktCustomText'];
    const TOGGLES = ['pktSuperbills', 'pktMedicaid', 'pktRetention', 'pktMinorConsent', 'pktNoForensic'];
    const RADIOS = ['feeModel', 'insuranceModel', 'aiUse'];
    const V1_TEXT_KEYS = ['welcome', 'disclosure', 'consent', 'policies', 'telehealth', 'hipaa', 'questionnaire', 'signatures'];

    function collectState() {
        const state = { version: 2, fields: {}, toggles: {}, radios: {} };
        FIELDS.forEach((id) => { state.fields[id] = $(`#${id}`).val(); });
        TOGGLES.forEach((id) => { state.toggles[id] = $(`#${id}`).is(':checked'); });
        RADIOS.forEach((n) => { state.radios[n] = $(`input[name="${n}"]:checked`).val(); });
        state.enabledSections = enabled();
        state.assessments = $('.pkt-assessment-cb:checked').map(function () { return this.value; }).get();
        state.customized = customized;
        return state;
    }

    function applyState(data) {
        if (!data || typeof data !== 'object') throw new Error('Not a packet file');
        if (window.TTPractice && TTPractice.isPracticeData(data)) {
            TTPractice.set(data);
            alert('That’s a Practice Info Sheet file, so it was saved as your practice data and used to fill in your details.');
            return;
        }
        const original = data;
        if (data.version !== 2) {
            // Version 1: flat rawVars, a free-text "State & License #", and hand-edited section texts.
            const raw = data.rawVars || {};
            data = { fields: { ...raw }, toggles: {}, radios: {}, enabledSections: data.enabledSections, assessments: [], customized: {} };
            const lic = (raw.pktLicenseNumber || '').match(/^([A-Z]{2})\s+(.+)$/);
            if (lic) { data.fields.pktLicenseState = lic[1]; data.fields.pktLicenseNumber = lic[2]; }
            if (raw.pktCancelWindow) {
                const hours = raw.pktCancelWindow.match(/(\d+)\s*hours?/i);
                const fee = raw.pktCancelWindow.match(/\$\s?\d[\d,.]*/);
                if (hours) data.fields.pktCancelHours = hours[1];
                if (fee) data.fields.pktCancelFee = fee[0];
            }
            V1_TEXT_KEYS.forEach((k) => { if (original.texts && original.texts[k]) data.customized[k] = original.texts[k]; });
        }
        Object.entries(data.fields || {}).forEach(([id, v]) => { if (FIELDS.includes(id)) $(`#${id}`).val(v ?? ''); });
        Object.entries(data.toggles || {}).forEach(([id, v]) => $(`#${id}`).prop('checked', !!v));
        Object.entries(data.radios || {}).forEach(([n, v]) => { if (v) $(`input[name="${n}"][value="${v}"]`).prop('checked', true); });
        if (Array.isArray(data.enabledSections)) {
            $('.pkt-section-cb').each(function () { this.checked = data.enabledSections.includes(this.value); });
        }
        $('.pkt-assessment-cb').each(function () { this.checked = (data.assessments || []).includes(this.value); });
        customized = data.customized && typeof data.customized === 'object' ? { ...data.customized } : {};
        render();
    }

    function checkLocalCacheOnLoad() {
        const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
        $('#localCacheToggle').prop('checked', isEnabled);
        if (!isEnabled) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) applyState(JSON.parse(raw));
        } catch (e) {
            console.error('Error loading cached intake packet:', e);
        }
    }
    function saveToLocalCacheIfEnabled() {
        if ($('#localCacheToggle').is(':checked')) localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
    }
    $('#localCacheToggle').on('change', function () {
        if (this.checked) {
            localStorage.setItem(CACHE_ENABLED_KEY, 'true');
            saveToLocalCacheIfEnabled();
        } else {
            localStorage.removeItem(CACHE_ENABLED_KEY);
            localStorage.removeItem(STORAGE_KEY);
        }
    });

    $('#exportJsonButtonTop').on('click', () => downloadFile(JSON.stringify(collectState(), null, 2), 'intake_packet_template.json', 'application/json;charset=utf-8'));
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
                alert('That file isn’t an Intake Packet .json.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });
});
