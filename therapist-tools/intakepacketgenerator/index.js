$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_intake_packet_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_intake_packet_cache_enabled';

    $('#inDate').val(new Date().toISOString().split('T')[0]);

    // --- 1. Default Boilerplate Builder (Uses Practice Variables) ---
    function getPracticeVars() {
        return {
            practiceName: $('#pktPracticeName').val().trim() || '[Practice Name]',
            clinicianName: $('#pktClinicianName').val().trim() || '[Clinician Name, Credentials]',
            licenseNumber: $('#pktLicenseNumber').val().trim() || '[State & License #]',
            npiNumber: $('#pktNpiNumber').val().trim() || '[NPI Number]',
            phone: $('#pktPhone').val().trim() || '[Practice Phone]',
            email: $('#pktEmail').val().trim() || '[Practice Email]',
            website: $('#pktWebsite').val().trim() || '[Practice Website]',
            address: $('#pktAddress').val().trim() || '[Office / Mailing Address]',
            intakeFee: $('#pktIntakeFee').val().trim() || '$200 (55 mins)',
            standardFee: $('#pktStandardFee').val().trim() || '$165 (53+ mins)',
            cancelWindow: $('#pktCancelWindow').val().trim() || '24 hours advance notice ($100 late cancellation/no-show fee)',
            educationApproach: $('#pktEducationApproach').val().trim() || 'Master’s degree in Counseling; integrative, person-centered, trauma-informed, and neurodivergent-affirming care'
        };
    }

    function buildDefaultTexts(v) {
        return {
            welcome: `Welcome to ${v.practiceName}! Starting therapy—especially if it is your very first time—can feel both hopeful and a little intimidating. This guide is designed to take the mystery out of your first session so you know exactly what to expect.\n\n1. HOW THE FIRST SESSION ("INTAKE") WORKS:\nYour first appointment (about 50–55 minutes) is a collaborative "get-to-know-you" session. Unlike a medical doctor's visit, you are never required to share everything all at once or dive into painful memories before you feel ready. Together, we will:\n• Briefly review these paperwork policies and answer any questions you have about confidentiality.\n• Talk about what brought you to therapy right now and what you hope might feel different in your life.\n• Touch on relevant parts of your background, daily life, strengths, sensory or communication preferences, and support system.\n• Decide together on initial goals and a comfortable pace for future sessions.\n\n2. YOU ARE ALWAYS IN CHARGE OF YOUR PACE:\n• You can pass on any question: If I ask something you aren't ready to talk about yet, you can simply say, "I'd like to skip that for now."\n• Bring comfort items: Whether we meet in person or via telehealth, you are welcome to bring water, tea, fidgets, a weighted blanket, notes you've jotted down, or wear comfortable clothes.\n• Movement & sensory needs: You do not need to maintain forced eye contact or sit perfectly still. Stim, stretch, doodle, or adjust lighting as needed.\n• Fit matters most: Research shows the most important part of therapy is feeling safe and understood by your therapist. If at any point you feel you need a different style or specialty, let me know—I am always happy to adjust my approach or help connect you with trusted referrals.`,

            disclosure: `PROFESSIONAL DISCLOSURE STATEMENT\nPractitioner: ${v.clinicianName}\nLicense / Credential #: ${v.licenseNumber} | NPI: ${v.npiNumber}\nPractice: ${v.practiceName} | Address: ${v.address}\nContact: ${v.phone} | ${v.email} | ${v.website}\n\n1. QUALIFICATIONS, EDUCATION & THERAPEUTIC APPROACH:\nI hold the following education, training, and clinical orientation: ${v.educationApproach}. My role is to walk alongside you as a collaborative partner, honoring your lived experience and autonomy.\n\n2. COURSE OF TREATMENT:\nIn our first sessions we will agree on goals together. When I can, I will describe the likely course of treatment, including the approaches I suggest and about how often we will meet, and we will revisit it as things change.\n\n3. FEES & BILLING PRACTICES:\n• Initial Intake Evaluation (CPT 90791): ${v.intakeFee}\n• Standard Individual Therapy Session (CPT 90837): ${v.standardFee}\nPayment is due at the time of service. I do not require advance payment for sessions not yet held; if you ever pay in advance, any unused amount will be refunded. See the Practice Policies for cancellation fees and insurance billing.\n\n4. YOUR RIGHTS AS A CLIENT:\n• Right to Choose & Refuse: You have the right to choose a counselor who best suits your needs and purposes, to ask questions about any proposed intervention, and to refuse any treatment or end therapy at any time.\n• Credential: I am licensed by the Washington State Department of Health under chapter 18.225 RCW. Licensure does not mean the state endorses any particular practice approach or guarantees the effectiveness of any treatment.\n• If I am a licensed associate: I practice under the supervision of [supervisor name and credential], an approved supervisor.\n\n5. FILING A COMPLAINT:\nIf you believe I have engaged in unprofessional conduct, you may contact the Washington State Department of Health. They can also give you the list of acts of unprofessional conduct under RCW 18.130.180.\nWashington State Department of Health, Health Systems Quality Assurance | Phone: (360) 236-4700 | doh.wa.gov\n\n6. SIGNATURES:\nClient signature: ______________________________   Date: ______________\nClinician signature: ___________________________   Date: ______________`,

            consent: `INFORMED CONSENT FOR PSYCHOTHERAPY & LIMITS OF CONFIDENTIALITY\n\n1. RISKS AND BENEFITS OF THERAPY:\nPsychotherapy is a collaborative process that can help reduce distress, build coping skills, improve relationships, and foster self-understanding. Because therapy sometimes involves exploring difficult emotions or life changes, you may occasionally experience temporary discomfort, sadness, or shifts in relationships as part of the healing process.\n\n2. CONFIDENTIALITY & PRIVACY:\nEverything you share in therapy—including the fact that you are a client here—is protected by state and federal law (HIPAA, RCW 5.60.060(9), and chapter 70.02 RCW). Information will not be released to anyone outside of this practice without your written Authorization to Release Information, EXCEPT in the following legally mandated situations:\n• Imminent Danger to Self or Others: If there is a clear, immediate threat of serious physical harm to yourself or an identifiable person, I am ethically and legally required to take steps to help keep you or others safe.\n• Abuse or Neglect of a Child or Vulnerable Adult: If I have reasonable cause to believe that a child (under 18), an elderly person, or a developmentally/physically vulnerable adult is experiencing abuse or neglect, I am required by law to report it to DSHS / Child or Adult Protective Services.\n• Court Order or Legal Mandate: If a judge issues a valid court order requiring records, or as otherwise required by state/federal law (I will always notify you first whenever legally permitted).\n• Insurance Billing & Care Coordination: If you use health insurance to pay for sessions, your insurance carrier requires basic information (such as attendance dates, CPT procedure codes, and a clinical diagnosis code) to process claims.`,

            policies: `PRACTICE POLICIES, FEES, CANCELLATIONS & COMMUNICATION\n\n1. FEES & PAYMENT:\n• Initial Intake Evaluation (CPT 90791): ${v.intakeFee}\n• Standard Individual Therapy Session (CPT 90837): ${v.standardFee}\nPayment or applicable insurance copay/coinsurance is due at the time of service. If billing through an insurance platform (such as Headway) or out-of-network via Superbill, you are responsible for verifying your plan's mental health benefits and deductible.\n\n2. CANCELLATION & NO-SHOW POLICY:\nYour appointment time is reserved exclusively for you. Please provide at least ${v.cancelWindow}. Note that health insurance plans and Medicaid do not cover late cancellation or missed appointment fees.\n\n3. COMMUNICATION, EMERGENCIES & AFTER-HOURS BOUNDARIES:\n• Routine Communication: You may reach me via secure client portal message, email (${v.email}), or phone/voicemail (${v.phone}). I check messages during standard business hours and will respond within 24–48 business hours.\n• Crisis & Emergency Support: This private practice does not provide 24-hour crisis or emergency services. If you are experiencing a life-threatening emergency or acute mental health crisis, please call or text 988 (Suicide & Crisis Lifeline), call 911, or go to your nearest hospital emergency room.\n\n4. SOCIAL MEDIA & PUBLIC ENCOUNTERS:\nTo protect your privacy and avoid dual relationships, I do not accept friend/connection requests from current or former clients on personal social media accounts. If we happen to cross paths in public, I will follow your lead and will never initiate contact first so your confidentiality remains protected.\n\n5. OPTIONAL AI / AMBIENT NOTE-TAKING DISCLOSURE:\nI NEVER use any AI or recording tool during a session without your explicit, separate verbal and written consent. You always have the right to decline or revoke consent for automated note-assistance tools with zero impact on your care.`,

            telehealth: `TELEHEALTH INFORMED CONSENT & SAFETY PROTOCOL\n\n1. HOW TELEHEALTH WORKS:\nTelehealth involves real-time audio and video counseling using a HIPAA-compliant platform. While telehealth increases accessibility, technical disruptions or privacy risks can occur if you are on an unsecured network.\n\n2. CLIENT LOCATION & SAFETY REQUIREMENTS FOR EVERY SESSION:\n• State Licensure Requirement: Due to state licensing laws, you must be physically located within the state(s) where I hold an active license (${v.licenseNumber}) at the time of our video session.\n• Physical Address Verification: At the beginning of telehealth sessions, we will confirm the physical address where you are located and a local emergency contact in case an urgent medical or safety situation arises.\n• Private Environment & Tech Backup: Please join from a private, quiet space (never while driving a moving vehicle). If our video disconnects, I will attempt to reconnect within 2–3 minutes or call you at your phone number on file.`,

            hipaa: `HIPAA NOTICE OF PRIVACY PRACTICES SUMMARY & GOOD FAITH ESTIMATE\n\n1. SUMMARY OF YOUR HIPAA PRIVACY RIGHTS:\nUnder the Health Insurance Portability and Accountability Act (HIPAA), you have the right to:\n• Request a copy of your clinical medical record and request amendments if you believe factual information is inaccurate.\n• Request confidential communications (for example, specifying whether I may leave a voicemail on your phone or send appointment reminders via text/email).\n• Receive an accounting of any disclosures made of your Protected Health Information (PHI) outside of standard treatment, payment, and healthcare operations.\n• Request a full paper or digital copy of our complete HIPAA Notice of Privacy Practices at any time.\n\n2. NO SURPRISES ACT / GOOD FAITH ESTIMATE NOTICE:\nUnder federal law (the No Surprises Act), if you are uninsured or choose not to use your health insurance ("self-pay"), you have the right to receive a "Good Faith Estimate" explaining how much your mental health care will cost over a given period before services are provided. If you receive a bill that is at least $400 more than your Good Faith Estimate, you have the right to dispute the bill.`,

            questionnaire: `CLIENT BACKGROUND & FIRST-SESSION INTAKE QUESTIONNAIRE\n(Please answer only what feels comfortable for you today—we can discuss the rest together in session!)\n\n1. Client Legal Name & Chosen/Preferred Name: ________________________________________________\n   Pronouns: _______________________   Date of Birth: _______________________\n   Phone: __________________________   Email: _______________________________\n   Physical Address (During Sessions): ________________________________________________________\n\n2. Emergency Contact Name, Relationship & Phone Number:\n   ________________________________________________________________________________________\n\n3. What brings you to therapy right now, and what would you most like to get out of our work together?\n   ________________________________________________________________________________________\n   ________________________________________________________________________________________\n\n4. Have you ever been in therapy before? If so, what felt helpful, and what did NOT feel helpful?\n   ________________________________________________________________________________________\n   ________________________________________________________________________________________\n\n5. Are there any sensory, communication, accessibility, or pacing accommodations that help you feel most comfortable?\n   ________________________________________________________________________________________\n   ________________________________________________________________________________________\n\n6. Current Medications, Medical Conditions, or Primary Care / Prescriber Info:\n   ________________________________________________________________________________________\n\n7. What are some of your personal strengths, values, hobbies/special interests, or sources of support?\n   ________________________________________________________________________________________`,

            signatures: `ACKNOWLEDGMENT OF RECEIPT & INFORMED CONSENT\n\nBy signing below, I acknowledge that I have received, read (or had explained to me), and understood the Professional Disclosure Statement, Informed Consent for Psychotherapy, Practice Policies, Telehealth Safety Protocol, and HIPAA Notice of Privacy Practices for ${v.practiceName} (${v.clinicianName}). I have had the opportunity to ask questions, and I voluntarily consent to participate in counseling services.\n\nClient / Parent / Guardian Printed Name: _____________________________________________________\n\nClient / Parent / Guardian Signature: __________________________________  Date: _______________\n\nClinician Signature (${v.clinicianName}): _____________________________  Date: _______________`
        };
    }

    // --- 2. Mode Switching (Packet Builder vs Intake Note) ---
    $('.mode-tab-btn').on('click', function() {
        const mode = $(this).data('mode');
        $('.mode-tab-btn').removeClass('btn-primary');
        $(this).addClass('btn-primary');
        $('.workspace-mode').addClass('hidden');
        $(`#mode-${mode}`).removeClass('hidden');
    });

    // Toggle editor visibility when section checkboxes change
    $('.pkt-section-cb').on('change', function() {
        const val = $(this).val();
        if ($(this).is(':checked')) {
            $(`#editor-${val}`).removeClass('hidden');
        } else {
            $(`#editor-${val}`).addClass('hidden');
        }
        saveToLocalCacheIfEnabled();
    });

    // Apply Practice Variables to Boilerplate
    function populateBoilerplateFromVars() {
        const v = getPracticeVars();
        const defaults = buildDefaultTexts(v);
        $('#textWelcome').val(defaults.welcome);
        $('#textDisclosure').val(defaults.disclosure);
        $('#textConsent').val(defaults.consent);
        $('#textPolicies').val(defaults.policies);
        $('#textTelehealth').val(defaults.telehealth);
        $('#textHipaa').val(defaults.hipaa);
        $('#textQuestionnaire').val(defaults.questionnaire);
        $('#textSignatures').val(defaults.signatures);
        saveToLocalCacheIfEnabled();
    }

    $('#applyVarsToTextBtn').on('click', function() {
        if (!confirm('Update the packet sections below with your current Practice & Clinician Details? (This will refresh the boilerplate text with your new variables).')) return;
        populateBoilerplateFromVars();
    });

    $('#resetDefaultTemplatesBtn').on('click', function() {
        if (!confirm('Restore all packet sections to default boilerplate?')) return;
        populateBoilerplateFromVars();
    });

    // --- 3. Collect & Apply Packet State (For JSON Save / Load) ---
    function collectPacketState() {
        const enabledSections = $('.pkt-section-cb:checked').map(function() { return $(this).val(); }).get();
        return {
            practiceVars: getPracticeVars(),
            rawVars: {
                pktPracticeName: $('#pktPracticeName').val().trim(),
                pktClinicianName: $('#pktClinicianName').val().trim(),
                pktLicenseNumber: $('#pktLicenseNumber').val().trim(),
                pktNpiNumber: $('#pktNpiNumber').val().trim(),
                pktPhone: $('#pktPhone').val().trim(),
                pktEmail: $('#pktEmail').val().trim(),
                pktWebsite: $('#pktWebsite').val().trim(),
                pktAddress: $('#pktAddress').val().trim(),
                pktIntakeFee: $('#pktIntakeFee').val().trim(),
                pktStandardFee: $('#pktStandardFee').val().trim(),
                pktCancelWindow: $('#pktCancelWindow').val().trim(),
                pktEducationApproach: $('#pktEducationApproach').val().trim()
            },
            enabledSections: enabledSections,
            texts: {
                welcome: $('#textWelcome').val(),
                disclosure: $('#textDisclosure').val(),
                consent: $('#textConsent').val(),
                policies: $('#textPolicies').val(),
                telehealth: $('#textTelehealth').val(),
                hipaa: $('#textHipaa').val(),
                questionnaire: $('#textQuestionnaire').val(),
                signatures: $('#textSignatures').val()
            }
        };
    }

    function applyImportedData(data) {
        if (!data || typeof data !== 'object') return;

        // Smart Check: Did the user upload their `practice_master_info.json` from the Practice Info Sheet?
        if (data.therapist && data.business && !data.texts) {
            const t = data.therapist;
            const b = data.business;
            $('#pktPracticeName').val(b.legalBusinessName || '');
            $('#pktClinicianName').val(t.clinicianFullName || '');
            const firstLic = Array.isArray(t.licenses) && t.licenses[0] ? `${t.licenses[0].state || 'WA'} ${t.licenses[0].number}` : '';
            $('#pktLicenseNumber').val(firstLic);
            $('#pktNpiNumber').val(t.npiType1 || '');
            $('#pktPhone').val(b.businessPhone || '');
            $('#pktEmail').val(b.businessEmail || '');
            $('#pktWebsite').val(b.businessWebsite || '');
            $('#pktAddress').val((b.businessAddress || '').replace(/\n/g, ', '));
            populateBoilerplateFromVars();
            alert('Practice Info Sheet .json recognized! Your practice details have been auto-populated into the Intake Packet.');
            return;
        }

        if (data.rawVars) {
            Object.entries(data.rawVars).forEach(([id, val]) => {
                $('#' + id).val(val || '');
            });
        }

        if (Array.isArray(data.enabledSections)) {
            $('.pkt-section-cb').each(function() {
                const val = $(this).val();
                const isChecked = data.enabledSections.includes(val);
                $(this).prop('checked', isChecked);
                if (isChecked) {
                    $(`#editor-${val}`).removeClass('hidden');
                } else {
                    $(`#editor-${val}`).addClass('hidden');
                }
            });
        }

        if (data.texts) {
            if (data.texts.welcome !== undefined) $('#textWelcome').val(data.texts.welcome);
            if (data.texts.disclosure !== undefined) $('#textDisclosure').val(data.texts.disclosure);
            if (data.texts.consent !== undefined) $('#textConsent').val(data.texts.consent);
            if (data.texts.policies !== undefined) $('#textPolicies').val(data.texts.policies);
            if (data.texts.telehealth !== undefined) $('#textTelehealth').val(data.texts.telehealth);
            if (data.texts.hipaa !== undefined) $('#textHipaa').val(data.texts.hipaa);
            if (data.texts.questionnaire !== undefined) $('#textQuestionnaire').val(data.texts.questionnaire);
            if (data.texts.signatures !== undefined) $('#textSignatures').val(data.texts.signatures);
        }

        saveToLocalCacheIfEnabled();
    }

    // --- 4. Render & Print Client Intake Packet ---
    const SECTION_TITLES = {
        welcome: 'Welcome & What to Expect in Your First Therapy Session',
        disclosure: 'Professional Disclosure Statement & Client Rights',
        consent: 'Informed Consent for Psychotherapy & Confidentiality',
        policies: 'Practice Policies, Fees, Cancellations & Communication',
        telehealth: 'Telehealth Informed Consent & Safety Protocol',
        hipaa: 'HIPAA Notice of Privacy Practices & Good Faith Estimate',
        questionnaire: 'Client Background & First-Session Intake Questionnaire',
        signatures: 'Informed Consent Acknowledgment & Signatures'
    };

    function buildPacketHtml() {
        const state = collectPacketState();
        const v = state.practiceVars;

        let html = `
            <div class="packet-document">
                <div class="packet-doc-header">
                    <h1>${escapeHtml(v.practiceName)}</h1>
                    <div class="packet-doc-sub">
                        <strong>${escapeHtml(v.clinicianName)}</strong> &bull; License: ${escapeHtml(v.licenseNumber)} &bull; NPI: ${escapeHtml(v.npiNumber)}<br>
                        ${escapeHtml(v.address)} &bull; ${escapeHtml(v.phone)} &bull; ${escapeHtml(v.email)}
                    </div>
                </div>
        `;

        state.enabledSections.forEach(secKey => {
            const content = state.texts[secKey] || '';
            if (!content.trim()) return;
            const pageBreakClass = (secKey === 'questionnaire' || secKey === 'signatures') ? 'page-break-section' : '';
            html += `
                <div class="packet-section ${pageBreakClass}">
                    <h2>${escapeHtml(SECTION_TITLES[secKey] || secKey)}</h2>
                    <div class="packet-body-text">${escapeHtml(content)}</div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    function buildPacketPlainText() {
        const state = collectPacketState();
        const v = state.practiceVars;
        const lines = [];
        lines.push(v.practiceName.toUpperCase());
        lines.push(`${v.clinicianName} | License: ${v.licenseNumber} | NPI: ${v.npiNumber}`);
        lines.push(`${v.address} | ${v.phone} | ${v.email}`);
        lines.push('='.repeat(70));
        lines.push('');

        state.enabledSections.forEach(secKey => {
            const content = state.texts[secKey] || '';
            if (!content.trim()) return;
            lines.push(content.trim());
            lines.push('\n' + '-'.repeat(70) + '\n');
        });

        return lines.join('\n').trim();
    }

    $('#previewPacketBtn').on('click', function() {
        $('#packetPreviewHtml').html(buildPacketHtml());
        $('#packetPreviewContainer').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#packetPreviewContainer').offset().top - 20 }, 400);
    });

    $('#printPacketPdfBtn').on('click', function() {
        const state = collectPacketState();
        const packetHtml = buildPacketHtml();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Client Intake Packet — ${escapeHtml(state.practiceVars.practiceName)}</title>
                <style>
                    @page { margin: 0.65in; }
                    body {
                        font-family: Georgia, "Times New Roman", serif;
                        color: #000;
                        background: #fff;
                        font-size: 10.5pt;
                        line-height: 1.5;
                        margin: 0;
                    }
                    .packet-doc-header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                        margin-bottom: 18px;
                    }
                    .packet-doc-header h1 { margin: 0 0 4px 0; font-size: 18pt; }
                    .packet-doc-sub { font-size: 9.5pt; color: #333; }
                    .packet-section { margin-bottom: 20px; }
                    .packet-section h2 {
                        font-size: 12.5pt;
                        border-bottom: 1px solid #333;
                        padding-bottom: 3px;
                        margin: 14px 0 8px 0;
                    }
                    .packet-body-text { white-space: pre-wrap; }
                    .page-break-section { page-break-before: always; }
                </style>
            </head>
            <body>${packetHtml}</body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 250);
    });

    // --- 5. Mode 2: Clinician's 90791 Intake Evaluation Note Generator ---
    function buildIntakeNoteText() {
        const v = getPracticeVars();
        const date = $('#inDate').val() || 'an unspecified date';
        const duration = $('#inDuration').val().trim() || '55 minutes (CPT 90791)';
        const modality = $('#inModality').val();
        const participants = $('#inParticipants').val().trim() || 'Client only';

        const checkedItems = $('.in-checklist-cb:checked').map(function() { return $(this).val(); }).get();
        const checklistSentence = checkedItems.length > 0
            ? `During the intake orientation, the clinician completed the following: ${checkedItems.join('; ')}.`
            : '';

        const sections = [
            `PSYCHIATRIC DIAGNOSTIC EVALUATION / INTAKE NOTE (CPT 90791)`,
            `Date: ${date} | Duration: ${duration} | Participants: ${participants}`,
            `Clinician: ${v.clinicianName} (${v.licenseNumber})`,
            ``,
            `ORIENTATION & INFORMED CONSENT:`,
            `The clinician met with the client ${modality} for an initial diagnostic intake evaluation. ${checklistSentence}`,
            ``,
            `1. PRESENTING PROBLEM & CHIEF COMPLAINT:`,
            $('#inPresenting').val().trim() || 'Not specified.',
            ``,
            `2. PSYCHIATRIC, COUNSELING & MEDICATION HISTORY:`,
            $('#inPsychHistory').val().trim() || 'None reported.',
            ``,
            `3. MEDICAL, SLEEP, SENSORY & SUBSTANCE USE HISTORY:`,
            $('#inMedicalSub').val().trim() || 'Unremarkable / none reported.',
            ``,
            `4. PSYCHOSOCIAL, FAMILY, CULTURAL & TRAUMA CONTEXT:`,
            $('#inPsychosocial').val().trim() || 'Reviewed in session.',
            ``,
            `5. CLIENT STRENGTHS, VALUES & PROTECTIVE SUPPORTS:`,
            $('#inStrengths').val().trim() || 'Motivated for treatment and engaged in intake process.',
            ``,
            `6. RISK & SAFETY ASSESSMENT:`,
            $('#inRiskSafety').val().trim(),
            ``,
            `7. MENTAL STATUS EXAM (MSE):`,
            $('#inMse').val().trim(),
            ``,
            `8. INITIAL DIAGNOSTIC IMPRESSION, MEDICAL NECESSITY & TREATMENT PLAN:`,
            $('#inDiagnosisPlan').val().trim() || 'Continue outpatient psychotherapy to address presenting symptoms and functional impairment.',
            ``,
            `Signed: ${v.clinicianName} on ${date}`
        ];

        return sections.join('\n');
    }

    $('#intakeNoteForm').on('submit', function(e) {
        e.preventDefault();
        const text = buildIntakeNoteText();
        $('#generatedIntakeNoteText').text(text);
        $('#generatedIntakeNoteContainer').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#generatedIntakeNoteContainer').offset().top - 20 }, 400);
    });

    $('#copyIntakeNoteBtn').on('click', function() {
        const text = buildIntakeNoteText();
        navigator.clipboard.writeText(text).then(() => {
            alert('90791 Intake Note copied to clipboard!');
        });
    });

    $('#printIntakeNoteBtn').on('click', function() {
        const text = buildIntakeNoteText();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>90791 Clinical Intake Evaluation Note</title>
                <style>
                    body { font-family: Georgia, "Times New Roman", serif; line-height: 1.5; margin: 0.75in; color: #000; font-size: 11pt; }
                    p { white-space: pre-wrap; margin: 0; }
                </style>
            </head>
            <body><p>${escapeHtml(text)}</p></body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 250);
    });

    $('#exportIntakeNoteTxtBtn').on('click', function() {
        downloadFile(buildIntakeNoteText(), 'intake_evaluation_note_90791.txt', 'text/plain;charset=utf-8');
    });

    // --- 6. Local Cache (Only Caches Practice Packet Template — Never Client Intake Note) ---
    function checkLocalCacheOnLoad() {
        const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
        $('#localCacheToggle').prop('checked', isEnabled);
        if (isEnabled) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    applyImportedData(JSON.parse(raw));
                    return;
                } catch (e) {
                    console.error('Error loading cached intake packet:', e);
                }
            }
        }
        populateBoilerplateFromVars();
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collectPacketState()));
        }
    }

    $('.pkt-var, .pkt-textarea').on('input change', saveToLocalCacheIfEnabled);

    // --- 7. JSON & TXT File Downloads / Imports ---
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

    $('#exportPacketTxtBtn').on('click', function() {
        downloadFile(buildPacketPlainText(), 'client_intake_packet.txt', 'text/plain;charset=utf-8');
    });

    $('#exportJsonButtonTop, #exportJsonButtonBottom').on('click', function() {
        const state = collectPacketState();
        downloadFile(JSON.stringify(state, null, 2), 'intake_packet_template.json', 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', () => $('#importJsonFile').click());

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                applyImportedData(parsed);
            } catch (err) {
                alert('Invalid JSON file. Please upload a valid Intake Packet or Practice Info .json file.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
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

    // Boot
    checkLocalCacheOnLoad();
});