// Insurance Reimbursement Helper: superbill checklist, benefits questions,
// a reimbursement estimate, and a claim tracker.
(function () {
    'use strict';
    // Each check can be confirmed automatically from a Superbill Generator .json
    const CHECKS = [
        { id: 'client', label: 'Your name and date of birth', test: (b) => b.client && b.client.name && b.client.dob },
        { id: 'member', label: 'Your insurance member ID', test: (b) => b.client && b.client.insuranceId },
        { id: 'provider', label: 'Your therapist’s name and credentials', test: (b) => b.provider && b.provider.name },
        { id: 'npi', label: 'Their NPI (a 10-digit provider number)', test: (b) => b.provider && /^\d{10}$/.test(b.provider.npi || '') },
        { id: 'license', label: 'Their license number', test: (b) => b.provider && b.provider.license },
        { id: 'taxid', label: 'The practice’s tax ID (EIN)', test: (b) => b.practice && b.practice.ein },
        { id: 'address', label: 'The practice’s address and phone', test: (b) => b.practice && b.practice.address && b.practice.phone },
        { id: 'dx', label: 'Diagnosis codes (ICD-10-CM, like F41.1)', test: (b) => (b.diagnoses || []).length || (b.diagnosis && b.diagnosis.primaryCode) },
        { id: 'dates', label: 'A date for every session', test: (b) => services(b).length && services(b).every((s) => s.date) },
        { id: 'cpt', label: 'A CPT code for every session (like 90837)', test: (b) => services(b).length && services(b).every((s) => s.cptCode) },
        { id: 'pos', label: 'Place of service (like 11 for office or 10 for telehealth at home)', test: (b) => services(b).length && services(b).every((s) => s.placeOfService) },
        { id: 'fees', label: 'The fee for each session', test: (b) => services(b).length && services(b).every((s) => Number(s.feePerSession) > 0) },
        { id: 'paid', label: 'How much you paid', test: (b) => services(b).some((s) => Number(s.amountPaid) > 0) },
        { id: 'signature', label: 'Your therapist’s signature (on the printed copy)', test: null }
    ];
    const services = (b) => (b.services || []).filter((s) => s.date || s.feePerSession);
    const defaults = {
        checks: [],
        plan: { hasOon: '', deductibleLeft: '', coinsurance: '', allowed: '', telehealth: '', preauth: '', deadline: '', where: '', form: '' },
        calls: [],
        estimate: { fee: '', sessions: 4 },
        submitted: [],
        claims: []
    };
    const money = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;
    const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

    // Deductible first, then coinsurance on the allowed amount. You owe anything above the allowed amount.
    function estimate(s) {
        const fee = num(s.estimate.fee);
        const sessions = Math.max(1, Math.min(104, Math.round(num(s.estimate.sessions) || 1)));
        const coins = num(s.plan.coinsurance);
        if (!fee || coins === null) return null;
        const allowed = Math.min(fee, num(s.plan.allowed) || fee);
        let ded = Math.max(0, num(s.plan.deductibleLeft) || 0);
        const rows = [];
        for (let i = 0; i < sessions; i++) {
            const toDeductible = Math.min(allowed, ded);
            ded -= toDeductible;
            const back = (allowed - toDeductible) * (1 - Math.min(100, Math.max(0, coins)) / 100);
            rows.push({ n: i + 1, toDeductible, back, cost: fee - back });
        }
        const total = (k) => rows.reduce((a, r) => a + r[k], 0);
        return { fee, allowed, sessions, rows, back: total('back'), cost: total('cost'), toDeductible: total('toDeductible'), dedLeft: ded };
    }

    function renderEstimate(s) {
        const box = document.getElementById('irEstimate');
        if (s.plan.hasOon === 'No') {
            box.innerHTML = '<div class="ct-callout"><p>Your plan doesn’t have out-of-network benefits, so it probably won’t pay you back. Ask your therapist about a sliding scale, or ask your plan for in-network therapists.</p></div>';
            return null;
        }
        const e = estimate(s);
        if (!e) {
            box.innerHTML = '<p class="ct-help">Add the fee here and your coinsurance in the last step to see an estimate.</p>';
            return null;
        }
        const first = e.rows.find((r) => r.back > 0);
        const rows = e.rows.length <= 12 ? e.rows : [...e.rows.slice(0, 6), null, ...e.rows.slice(-2)];
        box.innerHTML = `
            <div class="ct-callout">
                <p>For ${e.sessions} session${e.sessions === 1 ? '' : 's'} at ${money(e.fee)}, you’d pay ${money(e.fee * e.sessions)} and might get back about <strong>${money(e.back)}</strong>, so your cost would be about <strong>${money(e.cost)}</strong>.</p>
                ${e.toDeductible > 0 ? `<p>${money(e.toDeductible)} goes toward your deductible first${first ? `, so payments start around session ${first.n}` : ', so nothing comes back for these sessions'}.</p>` : ''}
                ${e.allowed < e.fee ? `<p>Your plan only counts ${money(e.allowed)} of each ${money(e.fee)} session, so the ${money(e.fee - e.allowed)} difference is always yours.</p>` : ''}
                <p class="ct-help">A rough guide, not a promise. Plans also have an out-of-pocket maximum that can lower your cost later in the year.</p>
            </div>
            <table><thead><tr><th>Session</th><th>Toward deductible</th><th>Paid back</th><th>Your cost</th></tr></thead><tbody>
            ${rows.map((r) => (r ? `<tr><td>${r.n}</td><td>${money(r.toDeductible)}</td><td>${money(r.back)}</td><td>${money(r.cost)}</td></tr>` : '<tr><td colspan="4">…</td></tr>')).join('')}
            </tbody></table>`;
        return e;
    }

    function render(s) {
        const e = renderEstimate(s);
        const missing = CHECKS.filter((c) => !s.checks.includes(c.id)).map((c) => c.label);
        const p = s.plan;
        const planLines = [
            p.hasOon && `Out-of-network benefits: ${p.hasOon}`,
            p.deductibleLeft !== '' && `Deductible left: ${money(Number(p.deductibleLeft))}`,
            p.coinsurance !== '' && `Coinsurance: ${p.coinsurance}%`,
            p.allowed !== '' && `Allowed amount: ${money(Number(p.allowed))}`,
            p.telehealth && `Telehealth covered: ${p.telehealth}`,
            p.preauth && `Pre-approval needed: ${p.preauth}`,
            p.deadline && `Deadline: ${p.deadline}`,
            p.where && `Send to: ${p.where}`,
            p.form && `Claim form: ${p.form}`
        ].filter(Boolean);
        const ul = (items) => `<ul>${items.map((i) => `<li>${CT.esc(i)}</li>`).join('')}</ul>`;
        document.getElementById('ctOutput').innerHTML = `
            <h2>Insurance Reimbursement</h2>
            <h3>Superbill</h3>${missing.length ? `<p>Still to check:</p>${ul(missing)}` : '<p>Everything on the checklist is there.</p>'}
            ${planLines.length ? `<h3>My plan</h3>${ul(planLines)}` : ''}
            ${s.calls.length ? `<h3>Calls</h3>${ul(s.calls.map((c) => [c.date, c.rep, c.ref && `ref. ${c.ref}`, c.notes].filter(Boolean).join(' · ')))}` : ''}
            ${e ? `<h3>Estimate</h3><p>${e.sessions} sessions: about ${money(e.back)} back, ${money(e.cost)} out of pocket.</p>` : ''}
            ${s.claims.length ? `<h3>Claims</h3><table><thead><tr><th>Sessions</th><th>Sent</th><th>Billed</th><th>Status</th><th>Paid back</th></tr></thead><tbody>${s.claims.map((c) => `<tr><td>${CT.esc(c.dates)}</td><td>${CT.esc(c.sent)}</td><td>${CT.esc(c.billed)}</td><td>${CT.esc(c.status)}</td><td>${CT.esc(c.paid)}</td></tr>`).join('')}</tbody></table>` : ''}`;
    }

    // Build the checklist before init so CT can bind it
    document.getElementById('irChecklist').innerHTML = CHECKS.map((c) => `<label><input type="checkbox" data-list="checks" value="${c.id}"> ${CT.esc(c.label)}</label>`).join('');

    function checkSuperbill(b, app) {
        const found = CHECKS.filter((c) => c.test && c.test(b)).map((c) => c.id);
        const missing = CHECKS.filter((c) => c.test && !c.test(b)).map((c) => c.label);
        const keep = app.state.checks.filter((id) => id === 'signature');
        app.set('checks', [...new Set([...found, ...keep])]);
        const svc = services(b);
        if (svc.length && !num(app.state.estimate.fee)) {
            app.set('estimate.fee', Number(svc[0].feePerSession) || '');
            app.set('estimate.sessions', svc.length);
        }
        const billed = svc.reduce((a, x) => a + (Number(x.feePerSession) || 0) * (Number(x.units) || 1), 0);
        document.getElementById('irSuperbillResult').innerHTML = `<div class="ct-callout${missing.length ? ' is-urgent' : ''}">
            <p><strong>Checked your superbill:</strong> ${svc.length} session${svc.length === 1 ? '' : 's'}, ${money(billed)} billed.</p>
            ${missing.length ? `<p>Ask your therapist to add:</p><ul>${missing.map((m) => `<li>${CT.esc(m)}</li>`).join('')}</ul>` : '<p>Everything insurers usually need is there. Still make sure the printed copy is signed.</p>'}
        </div>`;
    }

    const app = CT.init({
        key: 'insurance_reimbursement', fileName: 'insurance_reimbursement', defaults, render,
        toText: () => document.getElementById('ctOutput').innerText,
        // Import .json also accepts a superbill file
        importOther: (data) => {
            if (data && data.practice && data.provider && Array.isArray(data.services)) { checkSuperbill(data, app); return true; }
            return false;
        }
    });

    const sbFile = document.getElementById('irSuperbillFile');
    document.getElementById('irImportSuperbillBtn').addEventListener('click', () => sbFile.click());
    sbFile.addEventListener('change', () => {
        const f = sbFile.files[0];
        if (!f) return;
        f.text().then((t) => {
            let data = null;
            try { data = JSON.parse(t); } catch (err) { /* handled below */ }
            if (data && data.practice && data.provider && Array.isArray(data.services)) checkSuperbill(data, app);
            else alert('That file doesn’t look like a superbill from the Superbill Generator.');
            sbFile.value = '';
        });
    });
})();
