$(document).ready(function() {
    // CPT codes for outpatient psychotherapy. Add-on codes are billed on their own line.
    const CPT_CODES = [
        { code: '90791', desc: 'Psychiatric diagnostic evaluation' },
        { code: '90832', desc: 'Psychotherapy, 30 minutes' },
        { code: '90834', desc: 'Psychotherapy, 45 minutes' },
        { code: '90837', desc: 'Psychotherapy, 60 minutes' },
        { code: '90839', desc: 'Psychotherapy for crisis, first 60 minutes' },
        { code: '90840', desc: 'Psychotherapy for crisis, each additional 30 minutes (add-on)' },
        { code: '90785', desc: 'Interactive complexity (add-on)' },
        { code: '90846', desc: 'Family psychotherapy without the client present' },
        { code: '90847', desc: 'Family psychotherapy with the client present' },
        { code: '90853', desc: 'Group psychotherapy' }
    ];
    const POS_OPTIONS = [
        { code: '11', label: 'In person, office (POS 11)', telehealth: false },
        { code: '12', label: 'In person, client’s home (POS 12)', telehealth: false },
        { code: '10', label: 'Telehealth, client at home (POS 10)', telehealth: true },
        { code: '02', label: 'Telehealth, client not at home (POS 02)', telehealth: true }
    ];
    const MODIFIERS = [
        { code: '', label: 'None' },
        { code: '95', label: '95 (telehealth, video)' },
        { code: '93', label: '93 (telehealth, audio only)' },
        { code: 'FQ', label: 'FQ (audio only, Medicare)' },
        { code: 'GT', label: 'GT (older telehealth modifier)' }
    ];
    const MAX_DIAGNOSES = 12;
    const LETTERS = 'ABCDEFGHIJKL'.split('');

    let dxData = { ICD: [], DSM: [], byCode: {} };
    let dxSystem = 'ICD';
    let pendingImportEntry = null;

    // --- Setup: diagnosis picker, license menus, states ---
    const $dx = $('#superbillDiagnoses');
    $dx.select2({
        placeholder: 'Search diagnoses by name or code, or type your own',
        allowClear: true,
        multiple: true,
        tags: true,
        width: '100%',
        maximumSelectionLength: MAX_DIAGNOSES
    });
    // Keep selection order (first picked = primary) by moving each picked option to the end
    $dx.on('select2:select', function(e) {
        const el = $(e.params.data.element);
        el.detach();
        $dx.append(el).trigger('change');
    });

    function dxName(code, fallback) {
        const entry = dxData.byCode[code];
        return entry ? entry.icd : (fallback || '');
    }
    function populateDiagnoses(selected) {
        const list = dxData[dxSystem] || [];
        const chosen = selected || selectedDiagnoses();
        $dx.empty();
        list.forEach(d => {
            if (!chosen.some(c => c.code === d.code)) $dx.append(new Option(`${d.code} - ${d.name}`, d.code));
        });
        chosen.forEach(c => {
            const entry = (dxData[dxSystem] || []).find(d => d.code === c.code);
            const label = entry ? `${entry.code} - ${entry.name}` : (c.name ? `${c.code} - ${c.name}` : c.code);
            $dx.append(new Option(label, c.code, true, true));
        });
        $dx.trigger('change');
    }
    function selectedDiagnoses() {
        return ($dx.val() || []).map(code => {
            const opt = $dx.find('option').filter(function() { return this.value === code; }).first();
            const typed = opt.text().includes(' - ') ? opt.text().split(' - ').slice(1).join(' - ') : '';
            return { code, name: dxName(code, typed) };
        });
    }

    $('input[name="sbDxSystem"]').on('change', function() {
        dxSystem = this.value;
        $('#dsmNote').toggleClass('hidden', dxSystem !== 'DSM');
        populateDiagnoses();
    });

    function isAssociate() {
        const t = $('#superbillLicenseType').val() === 'Other' ? $('#superbillLicenseTypeOther').val() : $('#superbillLicenseType').val();
        return /associate|intern|resident|provisional|-a\b|\bA\)/i.test(t || '');
    }
    function syncLicenseFields() {
        $('#superbillLicenseTypeOther').toggleClass('hidden', $('#superbillLicenseType').val() !== 'Other');
        $('#supervisorBlock').toggleClass('hidden', !isAssociate());
    }
    $('#superbillLicenseType, #superbillLicenseTypeOther').on('change input', syncLicenseFields);

    // NPI check digit (Luhn with the 80840 prefix), so typos are caught before a claim is denied
    function npiValid(npi) {
        if (!/^\d{10}$/.test(npi)) return false;
        const digits = ('80840' + npi).split('').map(Number);
        let sum = 0;
        for (let i = digits.length - 1, alt = false; i >= 0; i--, alt = !alt) {
            let d = digits[i];
            if (alt) { d *= 2; if (d > 9) d -= 9; }
            sum += d;
        }
        return sum % 10 === 0;
    }
    function npiMessage(npi) {
        if (!npi) return '';
        if (!/^\d{10}$/.test(npi)) return 'An NPI is exactly 10 digits.';
        return npiValid(npi) ? '' : 'This NPI doesn’t pass the check-digit test. Double-check it.';
    }

    Promise.all([
        TTShared.loadDiagnoses().catch(() => { TTShared.showLoadError('#superbillDiagnoses', 'diagnosis list'); return dxData; }),
        fetch(`${TTShared.base}license-types.json`).then(r => r.json()).catch(() => ({ licenseTypes: [] })),
        TTShared.loadStates().catch(() => ({ list: [] }))
    ]).then(([dx, lic, states]) => {
        dxData = dx;
        const typeSel = $('#superbillLicenseType').empty().append(new Option('Choose…', ''));
        (lic.licenseTypes || []).forEach(t => typeSel.append(new Option(t, t)));
        if (!typeSel.find('option[value="Other"]').length) typeSel.append(new Option('Other', 'Other'));
        const stateSel = $('#superbillLicenseState').empty().append(new Option('Choose…', ''));
        (states.list || []).forEach(([code, name]) => stateSel.append(new Option(name, code)));
        populateDiagnoses([]);
        if (window.TTPractice) {
            window.TTPractice.fill();
            window.TTPractice.onLoad(matchLicenseType);
        }
        syncLicenseFields();
        render();
    });

    // Practice data stores short license types ("LMHC"); match them to the full menu entry
    function matchLicenseType(data) {
        const lic = data && data.therapist && (data.therapist.licenses || [])[0];
        if (!lic || !lic.type || $('#superbillLicenseType').val()) return;
        const short = lic.type.trim();
        const match = $('#superbillLicenseType option').filter(function() {
            return this.value === short || this.value.includes(`(${short})`);
        }).first();
        if (match.length) $('#superbillLicenseType').val(match.val());
        else { $('#superbillLicenseType').val('Other'); $('#superbillLicenseTypeOther').val(short); }
        syncLicenseFields();
        render();
    }

    // --- Services ---
    function serviceHtml(data) {
        const pos = data.placeOfService || '11';
        const cpt = data.cptCode || '90834';
        const known = CPT_CODES.some(c => c.code === cpt);
        const opt = (list, cur, key, label) => list.map(o => `<option value="${escapeAttr(o[key])}" ${o[key] === cur ? 'selected' : ''}>${escapeHtml(label(o))}</option>`).join('');
        return `
            <div class="superbill-service-entry sb-service">
                <div class="sb-service-head">
                    <h3 class="sb-service-title text-base font-semibold"></h3>
                    <div class="flex flex-wrap gap-3 items-center">
                        <button type="button" class="btn-link text-xs import-note-btn">Import session note</button>
                        <button type="button" class="btn-link text-xs remove-service-btn">Remove</button>
                    </div>
                </div>
                <div class="sb-service-grid">
                    <div><label>Date of service<input type="date" class="superbill-service-date" value="${escapeAttr(data.date || '')}"></label></div>
                    <div class="sb-span-2"><label>Where<select class="superbill-place-of-service">${opt(POS_OPTIONS, pos, 'code', o => o.label)}</select></label></div>
                    <div><label>Modifier<select class="superbill-modifier">${opt(MODIFIERS, data.modifier || '', 'code', o => o.label)}</select></label></div>
                    <div class="sb-span-2"><label>CPT code<select class="superbill-cpt-code">${opt(CPT_CODES, known ? cpt : '__other', 'code', o => `${o.code} - ${o.desc}`)}<option value="__other" ${known ? '' : 'selected'}>Other…</option></select></label>
                        <div class="sb-cpt-other ${known ? 'hidden' : ''}">
                            <input type="text" class="superbill-cpt-other mt-1" placeholder="Code" value="${escapeAttr(known ? '' : cpt)}" aria-label="Other CPT code">
                            <input type="text" class="superbill-cpt-other-desc mt-1" placeholder="Description" value="${escapeAttr(data.cptDescription || '')}" aria-label="Other CPT description">
                        </div></div>
                    <div><label>Diagnosis pointer<input type="text" class="superbill-dx-pointer" placeholder="A" value="${escapeAttr(data.dxPointer || '')}"></label></div>
                    <div><label>Units<input type="number" min="1" step="1" class="superbill-units" value="${escapeAttr(String(data.units || 1))}"></label></div>
                    <div><label>Fee per unit ($)<input type="number" min="0" step="0.01" class="superbill-fee-per-session" value="${data.feePerSession ? Number(data.feePerSession).toFixed(2) : ''}" placeholder="0.00"></label></div>
                    <div><label>Amount paid ($)<input type="number" min="0" step="0.01" class="superbill-amount-paid" value="${data.amountPaid ? Number(data.amountPaid).toFixed(2) : ''}" placeholder="0.00"></label></div>
                </div>
                <p class="sb-hint sb-service-note"></p>
            </div>`;
    }
    function renumberServices() {
        $('.superbill-service-entry').each(function(i) {
            $(this).find('.sb-service-title').text(`Service ${i + 1}`);
        });
    }
    function addService(data = {}, after) {
        const el = $(serviceHtml(data));
        if (after) el.insertAfter(after); else $('#superbillServiceEntries').append(el);
        renumberServices();
        return el;
    }
    function readService(el) {
        const $e = $(el);
        const cptSel = $e.find('.superbill-cpt-code').val();
        const isOther = cptSel === '__other';
        return {
            date: $e.find('.superbill-service-date').val(),
            placeOfService: $e.find('.superbill-place-of-service').val(),
            modifier: $e.find('.superbill-modifier').val(),
            cptCode: isOther ? $e.find('.superbill-cpt-other').val().trim() : cptSel,
            cptDescription: isOther ? $e.find('.superbill-cpt-other-desc').val().trim() : '',
            dxPointer: $e.find('.superbill-dx-pointer').val().trim().toUpperCase(),
            units: Math.max(1, parseInt($e.find('.superbill-units').val(), 10) || 1),
            feePerSession: parseFloat($e.find('.superbill-fee-per-session').val()) || 0,
            amountPaid: parseFloat($e.find('.superbill-amount-paid').val()) || 0
        };
    }

    // A new service copies the one above it (everything but the date)
    $('#addSuperbillService').on('click', function() {
        const last = $('.superbill-service-entry').last();
        const data = last.length ? { ...readService(last), date: '' } : {};
        const el = addService(data);
        el.find('.superbill-service-date').trigger('focus');
        render();
    });
    $('#superbillServiceEntries').on('click', '.remove-service-btn', function() {
        $(this).closest('.superbill-service-entry').remove();
        if (!$('.superbill-service-entry').length) addService();
        renumberServices();
        render();
    });
    $('#superbillServiceEntries').on('change', '.superbill-cpt-code', function() {
        $(this).closest('.superbill-service-entry').find('.sb-cpt-other').toggleClass('hidden', this.value !== '__other');
    });
    // Telehealth places of service default to modifier 95; in person clears it
    $('#superbillServiceEntries').on('change', '.superbill-place-of-service', function() {
        const pos = POS_OPTIONS.find(o => o.code === this.value);
        const mod = $(this).closest('.superbill-service-entry').find('.superbill-modifier');
        if (pos && pos.telehealth && !mod.val()) mod.val('95');
        if (pos && !pos.telehealth) mod.val('');
    });

    // --- Import a Session Note Generator superbill file into one service ---
    $('#superbillServiceEntries').on('click', '.import-note-btn', function() {
        pendingImportEntry = $(this).closest('.superbill-service-entry');
        $('#sessionNoteFileInput').val('').trigger('click');
    });
    $('#sessionNoteFileInput').on('change', function(e) {
        const file = e.target.files[0];
        const entry = pendingImportEntry;
        if (!file || !entry) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            let note;
            try { note = JSON.parse(evt.target.result); } catch (err) { note = null; }
            if (!note || note.kind !== 'session-note-for-superbill') {
                entry.find('.sb-service-note').text('That file isn’t a session note export. In the Session Note Generator, use “Create superbill (.json)”.');
                return;
            }
            applySessionNote(entry, note);
        };
        reader.readAsText(file);
    });
    function applySessionNote(entry, note) {
        const current = readService(entry);
        const cpt = note.cpt || current.cptCode;
        const data = {
            ...current,
            date: note.date || current.date,
            cptCode: cpt,
            placeOfService: POS_OPTIONS.some(o => o.code === note.placeOfService) ? note.placeOfService : current.placeOfService,
            modifier: note.modifier !== undefined ? note.modifier : current.modifier
        };
        const fresh = $(serviceHtml(data));
        entry.replaceWith(fresh);
        let anchor = fresh;
        (note.addOnCodes || []).forEach(code => {
            anchor = addService({ ...data, cptCode: code, units: 1, feePerSession: 0, amountPaid: 0 }, anchor);
        });
        // Add the note's diagnoses that aren't on the superbill yet
        const have = selectedDiagnoses();
        (note.diagnoses || []).forEach(d => {
            if (d && d.code && !have.some(h => h.code === d.code) && have.length < MAX_DIAGNOSES) have.push({ code: d.code, name: dxName(d.code, d.name) });
        });
        populateDiagnoses(have);
        renumberServices();
        const extra = (note.addOnCodes || []).length;
        fresh.find('.sb-service-note').text(`Filled in from the session note${note.date ? ` for ${formatDate(note.date)}` : ''}${extra ? `, plus ${extra} add-on line${extra === 1 ? '' : 's'} below` : ''}. Check the fee.`);
        render();
    }

    // --- Collect, render ---
    function collect() {
        const licenseType = $('#superbillLicenseType').val() === 'Other' ? $('#superbillLicenseTypeOther').val().trim() : $('#superbillLicenseType').val();
        const v = id => ($(id).val() || '').trim();
        return {
            version: 2,
            practice: { name: v('#superbillPracticeName'), ein: v('#superbillEin'), address: v('#superbillPracticeAddress'), cityStateZip: v('#superbillPracticeCityStateZip'), phone: v('#superbillPracticePhone'), email: v('#superbillPracticeEmail') },
            provider: {
                name: v('#superbillProviderName'), npi: v('#superbillNpi'), taxonomy: v('#superbillTaxonomy'),
                licenseState: v('#superbillLicenseState'), licenseType: licenseType || '', license: v('#superbillProviderLicense'),
                supervisor: isAssociate() ? { name: v('#superbillSupervisorName'), license: v('#superbillSupervisorLicense'), npi: v('#superbillSupervisorNpi') } : null
            },
            client: { name: v('#superbillClientName'), dob: v('#superbillClientDOB'), address: v('#superbillClientAddress'), cityStateZip: v('#superbillClientCityStateZip'), phone: v('#superbillClientPhone'), insurer: v('#superbillClientInsurer'), insuranceId: v('#superbillClientInsuranceId'), mrn: v('#superbillClientMRN') },
            diagnoses: selectedDiagnoses(),
            services: $('.superbill-service-entry').map(function() { return readService(this); }).get()
        };
    }

    const money = n => `$${(Math.round(n * 100) / 100).toFixed(2)}`;
    function lines(pairs) {
        return pairs.filter(([, val]) => val).map(([label, val]) => `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(val)}`).join('<br>');
    }
    function cptDesc(s) {
        const c = CPT_CODES.find(x => x.code === s.cptCode);
        return c ? c.desc : (s.cptDescription || '');
    }

    function buildSuperbill(d) {
        const { practice: pr, provider: pv, client: cl, diagnoses: dx } = d;
        const services = d.services.filter(s => s.date || s.feePerSession || s.amountPaid);
        const anything = [pr.name, pr.address, pv.name, pv.npi, cl.name, dx.length, services.length].some(Boolean);
        if (!anything) return '<p class="muted">Start filling in the form and your superbill appears here.</p>';

        const parts = [];
        const addr = [pr.address, pr.cityStateZip].filter(Boolean).join(', ');
        const contact = [pr.phone, pr.email].filter(Boolean).join(' · ');
        if (pr.name || addr || contact || pr.ein) {
            parts.push(`<div class="sb-out-header">${pr.name ? `<p class="sb-out-practice">${escapeHtml(pr.name)}</p>` : ''}${addr ? `<p>${escapeHtml(addr)}</p>` : ''}${contact ? `<p>${escapeHtml(contact)}</p>` : ''}${pr.ein ? `<p>Tax ID (EIN): ${escapeHtml(pr.ein)}</p>` : ''}</div>`);
        }
        parts.push(`<p class="sb-out-title">Superbill</p><p class="sb-out-date">Date issued: ${escapeHtml(new Date().toLocaleDateString('en-US'))}</p>`);

        const clientLines = lines([['Name', cl.name], ['Date of birth', formatDate(cl.dob)], ['Address', [cl.address, cl.cityStateZip].filter(Boolean).join(', ')], ['Phone', cl.phone], ['Insurance', cl.insurer], ['Member ID', cl.insuranceId], ['Record number', cl.mrn]]);
        const license = [pv.licenseType, pv.license && `No. ${pv.license}`, pv.licenseState].filter(Boolean).join(', ');
        const providerLines = lines([['Name', pv.name], ['NPI', pv.npi], ['Taxonomy', pv.taxonomy], ['License', license]]);
        const sup = pv.supervisor && (pv.supervisor.name || pv.supervisor.license || pv.supervisor.npi)
            ? lines([['Supervisor', pv.supervisor.name], ['Supervisor license', pv.supervisor.license], ['Supervisor NPI', pv.supervisor.npi]]) : '';
        if (clientLines || providerLines) {
            parts.push(`<div class="sb-out-cols">${clientLines ? `<div><h3>Client</h3><p>${clientLines}</p></div>` : ''}${providerLines || sup ? `<div><h3>Provider</h3><p>${providerLines}${sup ? `<br>${sup}` : ''}</p></div>` : ''}</div>`);
        }

        if (dx.length) {
            const rows = dx.map((x, i) => `<tr><td>${LETTERS[i]}</td><td>${escapeHtml(x.code)}</td><td>${escapeHtml(x.name)}</td></tr>`).join('');
            parts.push(`<h3>Diagnoses (ICD-10-CM)</h3><table><thead><tr><th>Pointer</th><th>Code</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>`);
        }

        if (services.length) {
            const anyMod = services.some(s => s.modifier);
            const anyUnits = services.some(s => s.units !== 1);
            const defaultPointer = dx.length ? LETTERS.slice(0, Math.min(dx.length, 4)).join('') : '';
            let charges = 0, paid = 0;
            const rows = services.map(s => {
                const charge = s.feePerSession * s.units;
                charges += charge;
                paid += s.amountPaid;
                return `<tr><td>${escapeHtml(formatDate(s.date))}</td><td>${escapeHtml(s.placeOfService)}</td><td>${escapeHtml(s.cptCode)}</td>${anyMod ? `<td>${escapeHtml(s.modifier)}</td>` : ''}<td>${escapeHtml(cptDesc(s))}</td>${dx.length ? `<td>${escapeHtml(s.dxPointer || defaultPointer)}</td>` : ''}${anyUnits ? `<td>${s.units}</td>` : ''}<td>${money(charge)}</td><td>${money(s.amountPaid)}</td></tr>`;
            }).join('');
            parts.push(`<h3>Services</h3><table><thead><tr><th>Date</th><th>POS</th><th>CPT</th>${anyMod ? '<th>Modifier</th>' : ''}<th>Description</th>${dx.length ? '<th>Dx pointer</th>' : ''}${anyUnits ? '<th>Units</th>' : ''}<th>Charge</th><th>Paid</th></tr></thead><tbody>${rows}</tbody></table>`);
            parts.push(`<div class="sb-out-totals"><p><strong>Total charges:</strong> ${money(charges)}</p><p><strong>Total paid:</strong> ${money(paid)}</p><p><strong>Balance due:</strong> ${money(charges - paid)}</p></div>`);
        }
        parts.push(`<div class="sb-out-sign"><p>Provider signature: ______________________________</p><p>Date: ______________</p></div>`);
        return parts.join('');
    }

    let raf = 0;
    function render() {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            const d = collect();
            $('#superbillOutput').html(buildSuperbill(d));
            $('#npiHint').text(npiMessage(d.provider.npi));
        });
    }
    $('#superbillForm').on('input change', render);
    $dx.on('change', render);

    $('#superbillForm').on('submit', function(event) {
        event.preventDefault();
        const d = collect();
        const missing = [];
        if (!d.practice.name) missing.push('practice name');
        if (!d.practice.ein) missing.push('tax ID (EIN)');
        if (!d.provider.name) missing.push('provider name');
        if (!d.provider.npi) missing.push('NPI');
        else if (npiMessage(d.provider.npi)) missing.push('a valid NPI');
        if (!d.client.name) missing.push('client name');
        if (!d.client.dob) missing.push('client date of birth');
        if (!d.diagnoses.length) missing.push('at least one diagnosis');
        if (!d.services.some(s => s.date)) missing.push('a date of service');
        render();
        if (missing.length) alert(`Most insurers will want: ${TTShared.listJoin(missing)}. Your superbill is still in the preview below.`);
        document.getElementById('preview-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('#printSuperbill').on('click', function() {
        render();
        setTimeout(() => window.print(), 50);
    });

    // Clear form: also reset the services and diagnoses
    $('#superbillForm').on('reset', function() {
        setTimeout(() => {
            $('#superbillServiceEntries').empty();
            addService();
            populateDiagnoses([]);
            syncLicenseFields();
            render();
        }, 0);
    });

    // --- Save / load ---
    $('#exportSuperbillJsonButton').on('click', function() {
        const formData = collect();
        const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `superbill_data_${(formData.client.name || 'client').replace(/[^\w-]+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });

    $('#importSuperbillJsonButton').on('click', () => $('#importSuperbillJsonFile').click());
    $('#importSuperbillJsonFile').on('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data && data.kind === 'session-note-for-superbill') {
                    applySessionNote($('.superbill-service-entry').last(), data);
                    return;
                }
                populateSuperbillForm(data);
            } catch (error) {
                alert('That file couldn’t be read. Choose a superbill .json saved from this tool.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    function populateSuperbillForm(data) {
        const set = (id, val) => $(id).val(val || '');
        const pr = data.practice || {}, pv = data.provider || {}, cl = data.client || {};
        set('#superbillPracticeName', pr.name); set('#superbillEin', pr.ein); set('#superbillPracticeAddress', pr.address);
        set('#superbillPracticeCityStateZip', pr.cityStateZip); set('#superbillPracticePhone', pr.phone); set('#superbillPracticeEmail', pr.email);
        set('#superbillProviderName', pv.name); set('#superbillNpi', pv.npi); set('#superbillTaxonomy', pv.taxonomy);
        set('#superbillLicenseState', pv.licenseState); set('#superbillProviderLicense', pv.license);
        const typeSel = $('#superbillLicenseType');
        if (pv.licenseType && typeSel.find('option').filter(function() { return this.value === pv.licenseType; }).length) {
            typeSel.val(pv.licenseType); set('#superbillLicenseTypeOther', '');
        } else if (pv.licenseType) {
            typeSel.val('Other'); set('#superbillLicenseTypeOther', pv.licenseType);
        } else {
            typeSel.val(''); set('#superbillLicenseTypeOther', '');
        }
        const sup = pv.supervisor || {};
        set('#superbillSupervisorName', sup.name); set('#superbillSupervisorLicense', sup.license); set('#superbillSupervisorNpi', sup.npi);
        set('#superbillClientName', cl.name); set('#superbillClientDOB', cl.dob); set('#superbillClientAddress', cl.address);
        set('#superbillClientCityStateZip', cl.cityStateZip); set('#superbillClientPhone', cl.phone); set('#superbillClientInsurer', cl.insurer);
        set('#superbillClientInsuranceId', cl.insuranceId); set('#superbillClientMRN', cl.mrn);

        // Older files had primary/secondary diagnosis boxes
        let dx = Array.isArray(data.diagnoses) ? data.diagnoses : [];
        if (!dx.length && data.diagnosis) {
            const o = data.diagnosis;
            dx = [[o.primaryCode, o.primaryDescription], [o.secondaryCode, o.secondaryDescription]]
                .filter(([code]) => code && String(code).trim())
                .map(([code, name]) => ({ code: String(code).trim().toUpperCase(), name: name || '' }));
        }
        populateDiagnoses(dx.slice(0, MAX_DIAGNOSES).map(x => ({ code: x.code, name: dxName(x.code, x.name) })));

        $('#superbillServiceEntries').empty();
        (data.services && data.services.length ? data.services : [{}]).forEach(svc => addService(svc));
        syncLicenseFields();
        render();
    }

    function formatDate(value) {
        const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${Number(m[2])}/${Number(m[3])}/${m[1]}` : '';
    }

    function escapeHtml(str) {
        if (str === undefined || str === null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    const escapeAttr = escapeHtml;

    addService();
    render();
});
