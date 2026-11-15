// Session Note Generator
// Builds a plain-text progress note from the form on every change and shows it in a
// live preview. Diagnoses and therapy styles come from ../shared/ (TTShared).
$(function () {
    'use strict';

    let templates = [];
    let diagnoses = { ICD: [], DSM: [], byCode: {} };
    let styles = [];

    const MSE_DOMAINS = [
        { id: 'appearance', label: 'Appearance', wnl: 'Well groomed and appropriately dressed', chips: ['Well groomed', 'Appropriately dressed', 'Casually dressed', 'Disheveled'] },
        { id: 'behavior', label: 'Behavior', wnl: 'Calm and cooperative, with good eye contact', chips: ['Cooperative', 'Calm', 'Engaged', 'Restless', 'Guarded', 'Psychomotor agitation', 'Psychomotor slowing'] },
        { id: 'speech', label: 'Speech', wnl: 'Normal rate, rhythm, and volume', chips: ['Normal rate, rhythm, and volume', 'Pressured', 'Slowed', 'Soft', 'Loud'] },
        { id: 'mood', label: 'Mood', wnl: 'Euthymic', chips: ['Euthymic', 'Anxious', 'Depressed', 'Irritable', 'Elevated'], hint: 'Quote the client’s words when you can.' },
        { id: 'affect', label: 'Affect', wnl: 'Full range and congruent with mood', chips: ['Congruent with mood', 'Full range', 'Constricted', 'Flat', 'Labile', 'Tearful'] },
        { id: 'thoughtProcess', label: 'Thought process', wnl: 'Logical and goal-directed', chips: ['Logical and goal-directed', 'Circumstantial', 'Tangential', 'Racing'] },
        { id: 'thoughtContent', label: 'Thought content', wnl: 'No delusions or preoccupations noted', chips: ['No delusions or preoccupations noted', 'Preoccupations noted', 'Obsessions noted'] },
        { id: 'perception', label: 'Perception', wnl: 'No hallucinations reported or observed', chips: ['No hallucinations reported or observed', 'Auditory hallucinations reported', 'Visual hallucinations reported'] },
        { id: 'orientation', label: 'Orientation', wnl: 'Alert and oriented to person, place, time, and situation', chips: ['Alert and oriented ×4', 'Oriented ×3', 'Disoriented'] },
        { id: 'cognition', label: 'Memory and attention', wnl: 'Memory and attention grossly intact', chips: ['Grossly intact', 'Impaired concentration', 'Impaired memory'] },
        { id: 'insight', label: 'Insight', wnl: 'Good', chips: ['Good', 'Fair', 'Poor'] },
        { id: 'judgment', label: 'Judgment', wnl: 'Good', chips: ['Good', 'Fair', 'Poor'] }
    ];
    // Old MSE note fields map onto the new domains when an older .json is imported.
    const LEGACY_MSE = {
        'mse-appearance': 'appearance', 'mse-behavior': 'behavior', 'mse-attitude': 'behavior', 'mse-affect': 'affect',
        'mse-speech': 'speech', 'mse-perceptual': 'perception', 'mse-orientation': 'orientation', 'mse-memory': 'cognition',
        'mse-reliability': 'insight'
    };
    const TEMPLATE_FIELDS = {
        generic: [['summary', '']],
        intake: [['inPresenting', 'Presenting problem'], ['inPsychHistory', 'Prior therapy, psychiatric, and medication history'],
            ['inMedicalSub', 'Medical, sleep, sensory, and substance use history'], ['inPsychosocial', 'Psychosocial, family, cultural, and trauma context'],
            ['inStrengths', 'Strengths, values, and supports'], ['inDiagnosisPlan', 'Diagnostic impression, medical necessity, and plan']],
        dap: [['dap-data', 'Data'], ['dap-assessment', 'Assessment'], ['dap-plan', 'Plan']],
        soap: [['soap-subjective', 'Subjective'], ['soap-objective', 'Objective'], ['soap-assessment', 'Assessment'], ['soap-plan', 'Plan']],
        birp: [['birp-behavior', 'Behavior'], ['birp-intervention', 'Intervention'], ['birp-response', 'Response'], ['birp-plan', 'Plan']],
        girp: [['girp-goals', 'Goals'], ['girp-intervention', 'Intervention'], ['girp-response', 'Response'], ['girp-plan', 'Plan']],
        pirp: [['pirp-problem', 'Problem'], ['pirp-intervention', 'Intervention'], ['pirp-response', 'Response'], ['pirp-plan', 'Plan']],
        narrative: [['narrative-summary', '']],
        mse: []
    };

    const val = (sel) => String($(sel).val() ?? '').trim();
    const join = (items, conj) => TTShared.listJoin(items, conj);
    const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
    const withArticle = (phrase) => `${/^[aeiou]/i.test(phrase) ? 'an' : 'a'} ${phrase}`;

    // ---------- Setup ----------
    $('#diagnosisSelect').select2({ placeholder: 'Search diagnoses...', allowClear: true, width: '100%', closeOnSelect: false });
    $('#theorySelect').select2({ placeholder: 'Search approaches...', allowClear: true, width: '100%', closeOnSelect: false, tags: true });
    $('#skillsSelect').select2({ placeholder: 'Pick or type skills...', allowClear: true, width: '100%', closeOnSelect: false, tags: true });

    const hour = $('#sessionHour').append(new Option('--', ''));
    for (let h = 1; h <= 12; h++) hour.append(new Option(String(h), String(h)));
    const minute = $('#sessionMinute').append(new Option('--', ''));
    for (let m = 0; m < 60; m += 5) minute.append(new Option(String(m).padStart(2, '0'), String(m).padStart(2, '0')));

    MSE_DOMAINS.forEach((d) => {
        $('#mseBody').append(`<div class="mse-row">
            <label for="mse_${d.id}">${d.label}</label>
            <div>
                <input type="text" id="mse_${d.id}" class="w-full p-2 border rounded-md mse-input" data-domain="${d.id}"${d.hint ? ` placeholder="${d.hint}"` : ''}>
                <div class="example-chips" data-example-target="#mse_${d.id}" data-example-mode="list">${d.chips.map((c) => `<button type="button" class="example-chip">${c}</button>`).join('')}</div>
            </div>
        </div>`);
    });
    $('#mseBody').append('<div class="mse-row"><label for="mse_comments">Comments</label><textarea id="mse_comments" rows="2" class="w-full p-2 border rounded-md mse-input" data-domain="comments"></textarea></div>');

    const getJSON = (url) => Promise.resolve($.getJSON(url));
    Promise.all([
        getJSON('note-templates.json'),
        TTShared.loadDiagnoses().catch(() => { TTShared.showLoadError('#diagnosisSelect', 'diagnosis list'); return diagnoses; }),
        TTShared.loadTherapyStyles().catch(() => { TTShared.showLoadError('#theorySelect', 'therapy styles'); return []; }),
        TTShared.loadCptCodes().catch(() => { TTShared.showLoadError('#cptCode', 'CPT code list'); return { codes: [] }; })
    ]).then(([tpl, dx, st, cpt]) => {
        // CPT codes are shared with the Superbill Generator (../shared/cpt-codes.json)
        const label = (c) => `${c.code} ${c.desc}${c.minutes ? ` (${c.minutes} minutes)` : ''}`;
        (cpt.codes || []).filter((c) => !c.addOn).forEach((c) => $('#cptCode').append(new Option(label(c), c.code)));
        $('#cptAddOns').html((cpt.codes || []).filter((c) => c.addOn).map((c) => `<label><input type="checkbox" value="${c.code}"> + ${c.code} ${c.desc}</label>`).join(''));
        templates = tpl.templates;
        diagnoses = dx;
        styles = st;
        const select = $('#noteTemplateSelect');
        templates.forEach((t) => select.append(new Option(t.name, t.id)));
        styles.forEach((s) => $('#theorySelect').append(new Option(s.name, s.name)));
        populateDiagnoses();
        const requested = new URLSearchParams(window.location.search).get('template');
        if (requested && templates.some((t) => t.id === requested)) select.val(requested);
        select.trigger('change');
        if (window.TTPractice) window.TTPractice.onLoad(applyPracticeData);
    }).catch((err) => {
        console.error(err);
        alert('The note templates couldn’t be loaded. Check your connection and refresh the page.');
    });

    function system() {
        return $('input[name="diagnosisClassification"]:checked').val() || 'DSM';
    }
    function populateDiagnoses() {
        const select = $('#diagnosisSelect');
        const selected = select.val() || [];
        select.empty();
        (diagnoses[system()] || []).forEach((d) => select.append(new Option(`${d.name} (${d.code})`, d.code)));
        select.val(selected).trigger('change.select2');
    }
    function diagnosisList() {
        return ($('#diagnosisSelect').val() || []).map((code) => {
            const d = diagnoses.byCode && diagnoses.byCode[code];
            return { code, name: d ? (system() === 'DSM' ? d.dsm : d.icd) : code };
        });
    }
    function refreshSkills() {
        const chosen = $('#theorySelect').val() || [];
        const selected = $('#skillsSelect').val() || [];
        const options = [];
        chosen.forEach((name) => {
            const style = styles.find((s) => s.name === name);
            (style && style.skills ? style.skills : []).forEach((skill) => { if (!options.includes(skill)) options.push(skill); });
        });
        selected.forEach((skill) => { if (!options.includes(skill)) options.push(skill); });
        const select = $('#skillsSelect').empty();
        options.forEach((skill) => select.append(new Option(skill, skill)));
        select.val(selected).trigger('change.select2');
        $('#skillsBlock').toggleClass('hidden', chosen.length === 0 && selected.length === 0);
    }

    function applyPracticeData(data) {
        const full = ((data && data.therapist && data.therapist.clinicianFullName) || '').split(',')[0].trim();
        if (full && !val('#clinicianInitials')) {
            $('#clinicianInitials').val(full.split(/\s+/).map((w) => w.charAt(0).toUpperCase()).join(''));
            render();
        }
    }

    // ---------- Building the note ----------
    function sessionTime() {
        const h = $('#sessionHour').val();
        const m = $('#sessionMinute').val();
        if (!h) return '';
        return `${h}:${m || '00'} ${$('#sessionAmPm').val()}`;
    }
    function longDate(iso) {
        if (!iso) return '';
        const d = new Date(`${iso}T00:00:00`);
        return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    function cptCodes() {
        const base = $('#cptCode').val();
        const addOns = $('#cptAddOns input:checked').map(function () { return this.value; }).get();
        return base ? [base, ...addOns] : addOns;
    }
    function suggestedCpt() {
        const mins = Number($('#sessionLength').val());
        const type = $('input[name="sessionType"]:checked').val();
        if (!mins) return '';
        if (type !== 'individual') return type === 'family' || type === 'couple' ? '90847 (family or couple psychotherapy with the client present, 50 minutes)' : '';
        if (mins < 16) return 'under 16 minutes usually isn’t billable as psychotherapy';
        if (mins <= 37) return '90832 (16–37 minutes)';
        if (mins <= 52) return '90834 (38–52 minutes)';
        return '90837 (53 minutes or more)';
    }
    function locationPhrase() {
        const loc = $('input[name="location"]:checked').val();
        if (loc === 'telehealth') {
            const mode = $('input[name="telehealthMode"]:checked').val() === 'audio' ? 'audio only' : 'video and audio';
            const where = val('#clientLocation') || '[client location]';
            const privacy = $('#privacyConfirmed').is(':checked') ? '; the client confirmed they were in a private location' : '';
            return `via telehealth (${mode}), with the client located at ${where}${privacy}`;
        }
        if (loc === 'other') return val('#locationOther') ? `at ${lowerFirst(val('#locationOther')).replace(/^at /, '')}` : 'at [location]';
        return 'in person';
    }
    function who() {
        const present = val('#presentInput');
        return present ? lowerFirst(present).replace(/^client\b/, 'the client') : 'the client';
    }

    function riskText() {
        if (!$('#includeRisk').is(':checked')) return '';
        const SI = { denied: 'The client denied suicidal ideation, intent, and plan.', passive: 'The client reported passive suicidal ideation without intent or plan.', active: 'The client reported active suicidal ideation (see details).', not: 'Suicidal ideation was not assessed this session.' };
        const HI = { denied: 'The client denied homicidal ideation.', endorsed: 'The client endorsed homicidal ideation (see details).', not: 'Homicidal ideation was not assessed this session.' };
        const SH = { denied: 'The client denied current self-harm.', recent: 'The client reported recent self-harm (see details).', history: 'The client reported a history of self-harm, with none current.', not: 'Self-harm was not assessed this session.' };
        const MEANS = { denied: 'The client denied access to lethal means.', reported: 'The client reported access to lethal means, and the clinician provided counseling on limiting access.', not: '' };
        const LEVEL = { low: 'Overall risk was assessed as low.', moderate: 'Overall risk was assessed as moderate.', high: 'Overall risk was assessed as high.', not: '' };
        const PLAN = { na: '', reviewed: 'The safety plan was reviewed with the client.', updated: 'The safety plan was updated with the client.', created: 'A safety plan was created with the client.' };
        const parts = [SI[$('#riskSI').val()], HI[$('#riskHI').val()], SH[$('#riskSH').val()], MEANS[$('#riskMeans').val()], LEVEL[$('#riskLevel').val()], PLAN[$('#riskPlan').val()], val('#riskDetails')];
        return parts.filter(Boolean).join(' ');
    }
    function mseText() {
        const forced = $('#noteTemplateSelect').val() === 'mse';
        if (!forced && !$('#includeMse').is(':checked')) return '';
        const lines = [];
        MSE_DOMAINS.forEach((d) => {
            const v = val(`#mse_${d.id}`);
            if (v) lines.push(`${d.label}: ${v}`);
        });
        if (val('#mse_comments')) lines.push(`Comments: ${val('#mse_comments')}`);
        return lines.join('\n');
    }

    function buildNote() {
        const template = $('#noteTemplateSelect').val() || 'generic';
        const minutes = Number($('#sessionLength').val());
        const type = $('input[name="sessionType"]:checked').val() || 'individual';
        const codes = cptCodes();
        const dx = diagnosisList().map((d) => `${d.name} (${d.code})`);
        const theories = $('#theorySelect').val() || [];
        const skills = $('#skillsSelect').val() || [];
        const blocks = [];

        const length = minutes ? `${minutes}-minute ` : '';
        const cpt = codes.length ? ` (CPT ${codes.join(', ')})` : '';
        if (template === 'intake') {
            blocks.push('PSYCHIATRIC DIAGNOSTIC EVALUATION / INTAKE NOTE');
            let intro = `The clinician met with ${who()} for ${withArticle(`${length}initial diagnostic evaluation`)}${cpt} ${locationPhrase()}.`;
            const checklist = $('#intakeChecklist input:checked').map(function () { return this.value; }).get();
            if (checklist.length) intro += ` During orientation, the clinician ${join(checklist)}.`;
            blocks.push(intro);
            if (dx.length) blocks.push(`Diagnoses: ${join(dx)}.`);
        } else if (template !== 'mse') {
            let intro = `The clinician met with ${who()} for ${withArticle(`${length}${type} session`)}${cpt} ${locationPhrase()}`;
            intro += dx.length ? ` to address ${join(dx)}.` : '.';
            if (theories.length && skills.length) intro += ` The clinician used ${join(theories)} to help the client practice ${join(skills)}.`;
            else if (theories.length) intro += ` The clinician used ${join(theories)}.`;
            else if (skills.length) intro += ` The clinician helped the client practice ${join(skills)}.`;
            blocks.push(intro);
        } else {
            blocks.push(`Mental Status Exam completed during ${withArticle(`${length}${type} session`)}${cpt} ${locationPhrase()}.${dx.length ? ` Diagnoses: ${join(dx)}.` : ''}`);
        }

        (TEMPLATE_FIELDS[template] || []).forEach(([id, label]) => {
            const text = val(`#${id}`);
            if (!text) return;
            blocks.push(label ? `${label}:\n${text}` : text);
        });

        const risk = riskText();
        if (risk) blocks.push(`Risk and safety:\n${risk}`);
        const mse = mseText();
        if (mse) blocks.push(`Mental Status Exam:\n${mse}`);

        const footer = [];
        const date = longDate($('#sessionDate').val());
        const time = sessionTime();
        if (date || time) footer.push(`Session: ${[date, time].filter(Boolean).join(', ')}`);
        if (minutes) footer.push(`Length: ${minutes} minutes`);
        if (val('#clinicianInitials')) footer.push(`Clinician: ${val('#clinicianInitials')}`);
        if (footer.length) blocks.push(`${footer.join('. ')}.`);
        return blocks.join('\n\n');
    }

    function renderCitations() {
        const t = templates.find((x) => x.id === $('#noteTemplateSelect').val());
        const list = $('#sourcesList').empty();
        (t && t.citations ? t.citations : []).forEach((c) => list.append(`<p>${c}</p>`));
        $('#sourcesContainer').toggleClass('hidden', !(t && t.citations && t.citations.length));
    }

    let queued = false;
    function render() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            const template = $('#noteTemplateSelect').val() || 'generic';
            $('.note-template-section').addClass('hidden');
            $(`#${template}-note-fields`).removeClass('hidden');
            const t = templates.find((x) => x.id === template);
            $('#templateLegend').text(t ? t.name : 'Note');
            const loc = $('input[name="location"]:checked').val();
            $('#telehealthBlock').toggleClass('hidden', loc !== 'telehealth');
            $('#locationOther').prop('disabled', loc !== 'other');
            $('#riskBody').toggleClass('hidden', !$('#includeRisk').is(':checked'));
            const forcedMse = template === 'mse';
            $('#includeMse').prop('checked', forcedMse || $('#includeMse').is(':checked')).prop('disabled', forcedMse);
            $('#mseBody').toggleClass('hidden', !$('#includeMse').is(':checked'));
            const hint = suggestedCpt();
            $('#cptHint').text(hint ? `Based on the length and session type: ${hint}.` : '');
            document.getElementById('generatedNote').textContent = buildNote();
        });
    }

    // ---------- Events ----------
    $('#noteForm').on('input change', render);
    $('#noteForm').on('submit', (e) => e.preventDefault());
    $('#noteTemplateSelect').on('change', () => { renderCitations(); render(); });
    $('input[name="diagnosisClassification"]').on('change', () => { populateDiagnoses(); render(); });
    $('#theorySelect').on('change', () => { refreshSkills(); render(); });
    $('#mseWnlButton').on('click', () => {
        const filled = MSE_DOMAINS.some((d) => val(`#mse_${d.id}`));
        if (filled && !confirm('Replace the MSE fields you’ve filled in with “within normal limits” findings?')) return;
        MSE_DOMAINS.forEach((d) => $(`#mse_${d.id}`).val(d.wnl));
        $('#includeMse').prop('checked', true);
        render();
    });
    $(document).on('click', '[data-example-target] .example-chip', function () {
        const box = $(this).parent();
        const target = $(box.data('exampleTarget'));
        const text = $(this).text();
        const cur = target.val().trim();
        if (box.data('exampleMode') === 'list') {
            const parts = cur ? cur.split(/\s*,\s*/) : [];
            if (!parts.some((p) => p.toLowerCase() === text.toLowerCase())) parts.push(parts.length ? lowerFirst(text) : text);
            target.val(parts.join(', '));
        } else {
            target.val(cur ? `${cur} ${text}` : text);
        }
        target.trigger('input');
    });

    // ---------- Copy, print, export ----------
    function noteText() {
        return document.getElementById('generatedNote').textContent.trim();
    }
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
    $('#copyNoteButton').on('click', () => {
        const text = noteText();
        const done = () => alert('Note copied. Paste it into your EHR.');
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done, () => alert('Copy failed. Select the preview and copy it by hand.'));
        } else {
            const t = document.createElement('textarea');
            t.value = text;
            document.body.appendChild(t);
            t.select();
            document.execCommand('copy');
            document.body.removeChild(t);
            done();
        }
    });
    $('#printNoteButton').on('click', () => {
        const win = window.open('', '_blank');
        if (!win) return alert('Your browser blocked the print window. Allow pop-ups for this site and try again.');
        const doc = win.document;
        doc.open();
        doc.write('<!DOCTYPE html><html><head><title>Session Note</title><style>body{font-family:Georgia,"Times New Roman",serif;line-height:1.6;margin:0.8in;color:#000}h1{font-size:1.2em;margin:0 0 1em}pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body><h1>Session Note</h1><pre id="n"></pre></body></html>');
        doc.close();
        doc.getElementById('n').textContent = noteText();
        setTimeout(() => { win.focus(); win.print(); }, 250);
    });
    $('#exportNoteButton').on('click', () => downloadFile(noteText(), 'session_note.txt', 'text/plain;charset=utf-8'));

    // Hand the session to the Superbill Generator (its per-service "Import session note" reads this).
    $('#exportSuperbillButton').on('click', () => {
        const loc = $('input[name="location"]:checked').val();
        const atHome = /\bhome\b/i.test(val('#clientLocation'));
        const data = {
            kind: 'session-note-for-superbill',
            version: 1,
            date: $('#sessionDate').val(),
            minutes: Number($('#sessionLength').val()) || null,
            cpt: $('#cptCode').val() || '',
            addOnCodes: $('#cptAddOns input:checked').map(function () { return this.value; }).get(),
            placeOfService: loc === 'in person' ? '11' : loc === 'telehealth' ? (atHome ? '10' : '02') : '',
            modifier: loc === 'telehealth' ? ($('input[name="telehealthMode"]:checked').val() === 'audio' ? '93' : '95') : '',
            sessionType: $('input[name="sessionType"]:checked').val(),
            diagnoses: diagnosisList(),
            clinicianInitials: val('#clinicianInitials')
        };
        if (!data.date) return alert('Add the session date first.');
        downloadFile(JSON.stringify(data, null, 2), `session_for_superbill_${data.date}.json`, 'application/json;charset=utf-8');
    });

    // ---------- Save and import ----------
    const SIMPLE = ['sessionDate', 'sessionHour', 'sessionMinute', 'sessionAmPm', 'sessionLength', 'presentInput', 'cptCode', 'locationOther',
        'clientLocation', 'clinicianInitials', 'riskSI', 'riskHI', 'riskSH', 'riskMeans', 'riskLevel', 'riskPlan', 'riskDetails'];
    const RADIOS = ['sessionType', 'location', 'telehealthMode', 'diagnosisClassification'];
    const TOGGLES = ['privacyConfirmed', 'includeRisk', 'includeMse'];

    function collectState() {
        const state = { version: 2, template: $('#noteTemplateSelect').val() };
        SIMPLE.forEach((id) => { state[id] = $(`#${id}`).val(); });
        RADIOS.forEach((n) => { state[n] = $(`input[name="${n}"]:checked`).val(); });
        TOGGLES.forEach((id) => { state[id] = $(`#${id}`).is(':checked'); });
        state.cptAddOns = $('#cptAddOns input:checked').map(function () { return this.value; }).get();
        state.intakeChecklist = $('#intakeChecklist input:checked').map(function () { return this.value; }).get();
        state.diagnosis = $('#diagnosisSelect').val() || [];
        state.theory = $('#theorySelect').val() || [];
        state.skills = $('#skillsSelect').val() || [];
        state.templateFields = {};
        Object.values(TEMPLATE_FIELDS).flat().forEach(([id]) => { state.templateFields[id] = $(`#${id}`).val(); });
        state.mse = {};
        $('.mse-input').each(function () { state.mse[this.dataset.domain] = this.value; });
        return state;
    }

    function applyState(data) {
        if (!data || typeof data !== 'object') throw new Error('Not a note file');
        // Version 1 files: checkbox locations, a 24-hour time, free-text length, separate MSE note fields.
        if (Array.isArray(data.location)) data.location = data.location.includes('via telehealth') ? 'telehealth' : 'in person';
        if (data.sessionTime && !data.sessionHour) {
            const [h, m] = data.sessionTime.split(':').map(Number);
            if (!Number.isNaN(h)) {
                data.sessionHour = String(((h + 11) % 12) + 1);
                data.sessionMinute = String(Math.round((m || 0) / 5) * 5 % 60).padStart(2, '0');
                data.sessionAmPm = h >= 12 ? 'PM' : 'AM';
            }
        }
        if (typeof data.sessionLength === 'string') data.sessionLength = (data.sessionLength.match(/\d+/) || [''])[0];
        if (data.templateFields && !data.mse) {
            data.mse = {};
            Object.entries(LEGACY_MSE).forEach(([oldId, domain]) => {
                const v = data.templateFields[oldId];
                if (v) data.mse[domain] = data.mse[domain] ? `${data.mse[domain]}; ${v}` : v;
            });
            if (Object.keys(data.mse).length) data.includeMse = true;
        }

        RADIOS.forEach((n) => { if (data[n]) $(`input[name="${n}"][value="${data[n]}"]`).prop('checked', true); });
        populateDiagnoses();
        if (data.template && templates.some((t) => t.id === data.template)) $('#noteTemplateSelect').val(data.template).trigger('change');
        SIMPLE.forEach((id) => { if (data[id] !== undefined && data[id] !== null) $(`#${id}`).val(String(data[id])); });
        TOGGLES.forEach((id) => { if (typeof data[id] === 'boolean') $(`#${id}`).prop('checked', data[id]); });
        $('#cptAddOns input').each(function () { this.checked = (data.cptAddOns || []).includes(this.value); });
        $('#intakeChecklist input').each(function () { this.checked = (data.intakeChecklist || []).includes(this.value); });
        $('#diagnosisSelect').val((data.diagnosis || []).filter((c) => diagnoses.byCode && diagnoses.byCode[c])).trigger('change');
        const theories = data.theory || [];
        theories.forEach((t) => { if (!$('#theorySelect option').filter(function () { return this.value === t; }).length) $('#theorySelect').append(new Option(t, t)); });
        $('#theorySelect').val(theories).trigger('change');
        (data.skills || []).forEach((s) => { if (!$('#skillsSelect option').filter(function () { return this.value === s; }).length) $('#skillsSelect').append(new Option(s, s)); });
        $('#skillsSelect').val(data.skills || []).trigger('change');
        refreshSkills();
        Object.entries(data.templateFields || {}).forEach(([id, v]) => { if (document.getElementById(id) && !LEGACY_MSE[id]) $(`#${id}`).val(v); });
        if (!data.templateFields && data.summary) $('#summary').val(data.summary);
        Object.entries(data.mse || {}).forEach(([domain, v]) => $(`.mse-input[data-domain="${domain}"]`).val(v));
        render();
    }

    $('#exportJsonButton').on('click', () => downloadFile(JSON.stringify(collectState(), null, 2), 'session_note_data.json', 'application/json;charset=utf-8'));
    $('#importJsonButton').on('click', () => $('#importJsonFile').click());
    $('#importJsonFile').on('change', function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            let data;
            try {
                data = JSON.parse(e.target.result);
            } catch (err) {
                alert('That file isn’t valid JSON.');
                return;
            }
            document.getElementById('noteForm').reset();
            setTimeout(() => {
                try {
                    applyState(data);
                } catch (err) {
                    console.error(err);
                    alert('That file isn’t a Session Note Generator .json.');
                }
            }, 0);
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#noteForm').on('reset', () => {
        setTimeout(() => {
            $('#diagnosisSelect, #theorySelect, #skillsSelect').val(null).trigger('change');
            refreshSkills();
            $('#noteTemplateSelect').val(templates[0] ? templates[0].id : 'generic').trigger('change');
            render();
        }, 0);
    });
});
