$(document).ready(function() {
    const STORAGE_KEY = 'geektragedie_business_dashboard_cache_v1';
    const CACHE_ENABLED_KEY = 'geektragedie_business_dashboard_cache_enabled';

    const MONTHS = [
        { num: '01', name: 'January', q: 1 },
        { num: '02', name: 'February', q: 1 },
        { num: '03', name: 'March', q: 1 },
        { num: '04', name: 'April', q: 2 },
        { num: '05', name: 'May', q: 2 },
        { num: '06', name: 'June', q: 2 },
        { num: '07', name: 'July', q: 3 },
        { num: '08', name: 'August', q: 3 },
        { num: '09', name: 'September', q: 3 },
        { num: '10', name: 'October', q: 4 },
        { num: '11', name: 'November', q: 4 },
        { num: '12', name: 'December', q: 4 }
    ];

    const INCOME_CATEGORIES = [
        'Insurance Payouts (Headway / Alma / Sondermind)',
        'Direct Insurance ERAs (Commercial Panels)',
        'Medicaid / ProviderOne Reimbursements',
        'Private Pay / Out-of-Network Client Fees',
        'Clinical Supervision Fees Received',
        'Consulting / Speaking / Writing / Other Income'
    ];

    // Mapped directly to IRS Schedule C lines so clinicians have zero guesswork at tax time
    const EXPENSE_CATEGORIES = [
        'Advertising & Directories (Psychology Today, Web Ads) [Sched C Line 8]',
        'Bank, Stripe, IvyPay & Merchant Processing Fees [Sched C Line 10]',
        'Contract Labor: Billers, VAs, Consultants [Sched C Line 11]',
        'Malpractice & Business Liability Insurance [Sched C Line 15]',
        'Legal, CPA, Accounting & Bookkeeping (BossCo, QBO) [Sched C Line 17]',
        'Office Supplies, Therapy Props & Books [Sched C Line 18]',
        'Rent or Lease: Office Space / Sublease [Sched C Line 20b]',
        'Taxes & Licenses: DOH License, PLLC Renewal, City/B&O [Sched C Line 23]',
        'Continuing Education (CEUs), Trainings & Supervision Paid [Sched C Line 27a]',
        'Software, EHR, Telehealth, Domains & Cloud (Google, Cloudflare) [Sched C Line 27a]',
        'Business Phone, VoIP & Internet Utilities [Sched C Line 25]'
    ];

    function getDefaultComplianceItems() {
        return [
            {
                id: 'comp_sos',
                done: false,
                level: 'State (SOS)',
                name: 'PLLC / LLC Secretary of State Annual Report',
                agency: 'WA Secretary of State (CCFS)',
                frequency: 'Annual (Formation Month)',
                dueDate: '',
                fee: 70,
                notes: 'Keeps PLLC in active good standing'
            },
            {
                id: 'comp_dor',
                done: false,
                level: 'State (DOR)',
                name: 'State B&O Tax Filing & UBI Active Check',
                agency: 'WA Dept. of Revenue (My DOR)',
                frequency: 'Quarterly / Annual',
                dueDate: '',
                fee: 0,
                notes: 'Filed on Gross Income; check Small Business B&O Credit'
            },
            {
                id: 'comp_doh',
                done: false,
                level: 'State (DOH)',
                name: 'Clinical License Renewal (LMHC / LICSW / LMFT)',
                agency: 'WA Dept. of Health (SAW)',
                frequency: 'Annual / Birthday',
                dueDate: '',
                fee: 141,
                notes: 'LMHC $125 + $16 HEAL-WA = $141 per WAC 246-809-990; check the fee for your license type. Verify 32 CEU hrs every 2 years'
            },
            {
                id: 'comp_city',
                done: false,
                level: 'City (Municipal)',
                name: 'City Business License / Home Occupation Endorsement',
                agency: 'City Finance / My DOR City Endorsement (e.g., Seattle)',
                frequency: 'Annual',
                dueDate: '',
                fee: 0,
                notes: 'Required if office or telehealth home desk is inside city limits'
            },
            {
                id: 'comp_county',
                done: false,
                level: 'County',
                name: 'Unincorporated County License OR Personal Property Tax Check',
                agency: 'County (e.g., King County Assessor / Licensing)',
                frequency: 'Annual',
                dueDate: '',
                fee: 0,
                notes: 'Unincorporated addresses need county license; otherwise check equipment threshold'
            },
            {
                id: 'comp_malpractice',
                done: false,
                level: 'Insurance',
                name: 'Professional Liability (Malpractice) Policy Renewal',
                agency: 'HPSO / CPH / Preferra',
                frequency: 'Annual',
                dueDate: '',
                fee: 0,
                notes: 'Upload updated declarations page to CAQH & Headway'
            },
            {
                id: 'comp_caqh',
                done: false,
                level: 'Credentialing',
                name: 'CAQH ProView 120-Day Re-Attestation',
                agency: 'CAQH ProView Portal',
                frequency: 'Every 120 Days',
                dueDate: '',
                fee: 0,
                notes: 'Prevents insurance claim holds'
            },
            {
                id: 'comp_1099',
                done: false,
                level: 'Federal (IRS)',
                name: 'Issue 1099-NECs to Contractors Paid $2,000+ (2026 payments)',
                agency: 'IRS / QBO / Gusto',
                frequency: 'Annual (Due Jan 31)',
                dueDate: '',
                fee: 0,
                notes: 'Collect W-9 before paying billers, VAs, or unincorporated supervisors'
            }
        ];
    }

    function getDefaultReconciliations() {
        const obj = {};
        MONTHS.forEach(m => {
            obj[m.num] = {
                bankMatched: false,
                receiptsSaved: false,
                taxTransferred: false,
                endingBalance: '',
                notes: ''
            };
        });
        return obj;
    }

    function getDefaultQuarterlyStatus() {
        return {
            1: { fedPaid: false, statePaid: false, confNotes: '' },
            2: { fedPaid: false, statePaid: false, confNotes: '' },
            3: { fedPaid: false, statePaid: false, confNotes: '' },
            4: { fedPaid: false, statePaid: false, confNotes: '' }
        };
    }

    let appState = {
        practiceName: '',
        taxYear: 2026,
        fedTaxRate: 25,
        stateGrossTaxRate: 1.5,
        annualRevenueGoal: 100000,
        businessMiles: 0,
        homeOfficeSqFt: 0,
        transactions: [],
        reconciliations: getDefaultReconciliations(),
        quarterlyStatus: getDefaultQuarterlyStatus(),
        complianceItems: getDefaultComplianceItems()
    };

    // Set default transaction date to today
    $('#txDate').val(new Date().toISOString().split('T')[0]);

    // --- 1. Tab Navigation ---
    $('.dash-tab-btn').on('click', function() {
        const tab = $(this).data('tab');
        $('.dash-tab-btn').removeClass('btn-primary');
        $(this).addClass('btn-primary');
        $('.dash-tab-section').addClass('hidden');
        $(`#tab-${tab}`).removeClass('hidden');
    });

    // --- 2. Populate Category Dropdown Based on Income vs Expense ---
    function populateTxCategories(type, selectedVal = '') {
        const select = $('#txCategory');
        select.empty();
        const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        list.forEach(cat => select.append(new Option(cat, cat)));
        if (selectedVal) {
            if (select.find(`option[value="${escapeAttr(selectedVal)}"]`).length === 0) {
                select.append(new Option(selectedVal, selectedVal));
            }
            select.val(selectedVal);
        }
    }

    $('#txType').on('change', function() {
        populateTxCategories($(this).val());
    });
    populateTxCategories('income');

    // --- 3. Financial Calculations ---
    function calculateFinancialSummary() {
        let ytdGross = 0;
        let ytdExpenses = 0;

        const monthly = {};
        MONTHS.forEach(m => {
            monthly[m.num] = { gross: 0, expenses: 0, net: 0, fedTax: 0, stateTax: 0, totalTax: 0, safeDraw: 0 };
        });

        const incomeBySource = {};
        const expensesByCategory = {};

        appState.transactions.forEach(tx => {
            const amt = parseFloat(tx.amount) || 0;
            const monthNum = (tx.date || '').split('-')[1];

            if (tx.type === 'income') {
                ytdGross += amt;
                if (monthly[monthNum]) monthly[monthNum].gross += amt;
                incomeBySource[tx.category] = (incomeBySource[tx.category] || 0) + amt;
            } else {
                ytdExpenses += amt;
                if (monthly[monthNum]) monthly[monthNum].expenses += amt;
                expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + amt;
            }
        });

        const fedRate = (parseFloat(appState.fedTaxRate) || 0) / 100;
        const stateRate = (parseFloat(appState.stateGrossTaxRate) || 0) / 100;

        let ytdFedTax = 0;
        let ytdStateTax = 0;

        MONTHS.forEach(m => {
            const mObj = monthly[m.num];
            mObj.net = mObj.gross - mObj.expenses;
            mObj.fedTax = Math.max(0, mObj.net * fedRate);
            mObj.stateTax = mObj.gross * stateRate;
            mObj.totalTax = mObj.fedTax + mObj.stateTax;
            mObj.safeDraw = mObj.net - mObj.totalTax;

            ytdFedTax += mObj.fedTax;
            ytdStateTax += mObj.stateTax;
        });

        // Non-cash deductions (Mileage + Simplified Home Office)
        // 2026 IRS rate is 72.5¢ (Jan–Jun) then 76¢ (Jul–Dec); use the lower rate for a conservative estimate
        const milesDeduction = (parseFloat(appState.businessMiles) || 0) * 0.725;
        const homeOfficeDeduction = Math.min(300, parseFloat(appState.homeOfficeSqFt) || 0) * 5;
        const extraDeductions = milesDeduction + homeOfficeDeduction;

        const ytdNet = ytdGross - ytdExpenses;
        const ytdTotalTax = ytdFedTax + ytdStateTax;
        const ytdSafeDraw = ytdNet - ytdTotalTax;

        return {
            ytdGross,
            ytdExpenses,
            ytdNet,
            ytdFedTax,
            ytdStateTax,
            ytdTotalTax,
            ytdSafeDraw,
            extraDeductions,
            monthly,
            incomeBySource,
            expensesByCategory
        };
    }

    // --- 4. Render All Dashboard Views ---
    function renderAll() {
        syncSettingsInputs();
        const fin = calculateFinancialSummary();
        renderKPIs(fin);
        renderOverviewTab(fin);
        renderLedgerTab();
        renderQuarterlyTaxTab(fin);
        renderReconciliationTab();
        renderComplianceTab();
        saveToLocalCacheIfEnabled();
    }

    function syncSettingsInputs() {
        $('#practiceName').val(appState.practiceName);
        $('#taxYear').val(appState.taxYear);
        $('#fedTaxRate').val(appState.fedTaxRate);
        $('#stateGrossTaxRate').val(appState.stateGrossTaxRate);
        $('#annualRevenueGoal').val(appState.annualRevenueGoal);
        $('#businessMiles').val(appState.businessMiles || 0);
        $('#homeOfficeSqFt').val(appState.homeOfficeSqFt || 0);
    }

    function renderKPIs(fin) {
        $('#kpiGrossIncome').text(formatCurrency(fin.ytdGross));
        const goalPct = appState.annualRevenueGoal > 0
            ? Math.round((fin.ytdGross / appState.annualRevenueGoal) * 100)
            : 0;
        $('#kpiGoalProgress').text(`${goalPct}% of ${formatCurrency(appState.annualRevenueGoal)} Goal`);

        $('#kpiTotalExpenses').text(formatCurrency(fin.ytdExpenses));
        const expRatio = fin.ytdGross > 0 ? Math.round((fin.ytdExpenses / fin.ytdGross) * 100) : 0;
        $('#kpiExpenseRatio').text(`Overhead Ratio: ${expRatio}%`);

        $('#kpiNetProfit').text(formatCurrency(fin.ytdNet));
        const margin = fin.ytdGross > 0 ? Math.round((fin.ytdNet / fin.ytdGross) * 100) : 0;
        $('#kpiProfitMargin').text(`Profit Margin: ${margin}%`);

        $('#kpiTotalTaxReserve').text(formatCurrency(fin.ytdTotalTax));
        $('#kpiTaxBreakdown').text(`Fed: ${formatCurrency(fin.ytdFedTax)} | B&O: ${formatCurrency(fin.ytdStateTax)}`);

        $('#kpiSafeOwnersDraw').text(formatCurrency(fin.ytdSafeDraw));
        $('#extraDeductionsDisplay').text(formatCurrency(fin.extraDeductions));
    }

    function renderOverviewTab(fin) {
        const tbody = $('#monthlyPnlTableBody');
        const tfoot = $('#monthlyPnlTableFoot');
        tbody.empty();
        tfoot.empty();

        MONTHS.forEach(m => {
            const d = fin.monthly[m.num];
            const rec = (appState.reconciliations && appState.reconciliations[m.num]) || {};
            const isRecDone = rec.bankMatched && rec.receiptsSaved;

            tbody.append(`
                <tr class="border-b">
                    <td class="p-2 font-semibold">${m.name}</td>
                    <td class="p-2">${formatCurrency(d.gross)}</td>
                    <td class="p-2">${formatCurrency(d.expenses)}</td>
                    <td class="p-2 font-semibold">${formatCurrency(d.net)}</td>
                    <td class="p-2">${formatCurrency(d.totalTax)}</td>
                    <td class="p-2 font-semibold">${formatCurrency(d.safeDraw)}</td>
                    <td class="p-2">${isRecDone ? '<span class="badge-done">✅ Reconciled</span>' : '<span class="muted text-xs">Pending</span>'}</td>
                </tr>
            `);
        });

        tfoot.append(`
            <tr>
                <td class="p-2">YTD TOTALS (${appState.taxYear})</td>
                <td class="p-2">${formatCurrency(fin.ytdGross)}</td>
                <td class="p-2">${formatCurrency(fin.ytdExpenses)}</td>
                <td class="p-2">${formatCurrency(fin.ytdNet)}</td>
                <td class="p-2">${formatCurrency(fin.ytdTotalTax)}</td>
                <td class="p-2">${formatCurrency(fin.ytdSafeDraw)}</td>
                <td class="p-2"></td>
            </tr>
        `);

        // Render Income by Source
        const incContainer = $('#incomeBySourceContainer');
        incContainer.empty();
        const incEntries = Object.entries(fin.incomeBySource).sort((a, b) => b[1] - a[1]);
        if (incEntries.length === 0) {
            incContainer.append(`<p class="muted text-xs">No income logged yet.</p>`);
        } else {
            incEntries.forEach(([cat, amt]) => {
                const pct = fin.ytdGross > 0 ? Math.round((amt / fin.ytdGross) * 100) : 0;
                incContainer.append(`
                    <div class="flex justify-between items-center border-b pb-1">
                        <span>${escapeHtml(cat)}</span>
                        <span class="font-semibold">${formatCurrency(amt)} (${pct}%)</span>
                    </div>
                `);
            });
        }

        // Render Expenses by Schedule C Category
        const expContainer = $('#expensesByCategoryContainer');
        expContainer.empty();
        const expEntries = Object.entries(fin.expensesByCategory).sort((a, b) => b[1] - a[1]);
        if (expEntries.length === 0) {
            expContainer.append(`<p class="muted text-xs">No expenses logged yet.</p>`);
        } else {
            expEntries.forEach(([cat, amt]) => {
                expContainer.append(`
                    <div class="flex justify-between items-center border-b pb-1">
                        <span>${escapeHtml(cat)}</span>
                        <span class="font-semibold">${formatCurrency(amt)}</span>
                    </div>
                `);
            });
        }
    }

    function renderLedgerTab() {
        const tbody = $('#ledgerTableBody');
        tbody.empty();

        const typeFilter = $('#filterTxType').val();
        const monthFilter = $('#filterTxMonth').val();

        const sorted = [...appState.transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const filtered = sorted.filter(tx => {
            if (typeFilter === 'income' && tx.type !== 'income') return false;
            if (typeFilter === 'expense' && tx.type !== 'expense') return false;
            if (typeFilter === '1099' && !tx.is1099) return false;
            if (monthFilter !== 'all') {
                const m = (tx.date || '').split('-')[1];
                if (m !== monthFilter) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.append(`<tr><td colspan="7" class="p-4 text-center muted">No matching transactions found.</td></tr>`);
            return;
        }

        filtered.forEach(tx => {
            const isInc = tx.type === 'income';
            const badge1099 = tx.is1099 ? `<span class="badge-warn ml-1">1099-NEC</span>` : '';
            tbody.append(`
                <tr class="border-b">
                    <td class="p-2 whitespace-nowrap">${escapeHtml(tx.date)}</td>
                    <td class="p-2 font-semibold ${isInc ? 'text-income' : 'text-expense'}">${isInc ? 'Income' : 'Expense'}</td>
                    <td class="p-2">${escapeHtml(tx.category)}</td>
                    <td class="p-2">${escapeHtml(tx.vendor || '—')} ${badge1099}</td>
                    <td class="p-2 muted text-xs">${escapeHtml(tx.notes || '')}</td>
                    <td class="p-2 font-bold">${formatCurrency(tx.amount)}</td>
                    <td class="p-2 text-right whitespace-nowrap">
                        <button type="button" class="btn-link text-xs edit-tx-btn mr-2" data-id="${tx.id}">Edit</button>
                        <button type="button" class="btn-link text-xs delete-tx-btn" data-id="${tx.id}">Delete</button>
                    </td>
                </tr>
            `);
        });
    }

    function renderQuarterlyTaxTab(fin) {
        const tbody = $('#quarterlyTaxTableBody');
        tbody.empty();

        const quartersMeta = [
            { q: 1, label: 'Q1 (Jan 1 – Mar 31)', due: 'IRS: Apr 15 | WA DOR: Apr 30', months: ['01', '02', '03'] },
            { q: 2, label: 'Q2 (Apr 1 – Jun 30)', due: 'IRS: Jun 15 (covers Apr–May) | WA DOR: Jul 31', months: ['04', '05', '06'] },
            { q: 3, label: 'Q3 (Jul 1 – Sep 30)', due: 'IRS: Sep 15 (covers Jun–Aug) | WA DOR: Oct 31', months: ['07', '08', '09'] },
            { q: 4, label: 'Q4 (Oct 1 – Dec 31)', due: 'IRS: Jan 15 (covers Sep–Dec) | WA DOR: Jan 31', months: ['10', '11', '12'] }
        ];

        quartersMeta.forEach(qm => {
            let qGross = 0;
            let qExp = 0;
            let qFed = 0;
            let qState = 0;

            qm.months.forEach(mNum => {
                const mData = fin.monthly[mNum];
                qGross += mData.gross;
                qExp += mData.expenses;
                qFed += mData.fedTax;
                qState += mData.stateTax;
            });

            const qNet = qGross - qExp;
            const qStat = (appState.quarterlyStatus && appState.quarterlyStatus[qm.q]) || { fedPaid: false, statePaid: false, confNotes: '' };

            tbody.append(`
                <tr class="border-b" data-q="${qm.q}">
                    <td class="p-2 font-bold">${qm.label}</td>
                    <td class="p-2 text-xs">${qm.due}</td>
                    <td class="p-2">${formatCurrency(qGross)}</td>
                    <td class="p-2">${formatCurrency(qExp)}</td>
                    <td class="p-2 font-semibold">${formatCurrency(qNet)}</td>
                    <td class="p-2 font-bold">${formatCurrency(qFed)}</td>
                    <td class="p-2 font-bold">${formatCurrency(qState)}</td>
                    <td class="p-2 space-y-1">
                        <div class="flex flex-wrap gap-3 text-xs">
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="q-fed-paid mr-1" ${qStat.fedPaid ? 'checked' : ''}> IRS Paid
                            </label>
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="q-state-paid mr-1" ${qStat.statePaid ? 'checked' : ''}> State DOR Filed
                            </label>
                        </div>
                        <input type="text" class="q-conf-notes w-full p-1 border rounded-md text-xs" placeholder="Date paid / Confirmation #" value="${escapeAttr(qStat.confNotes)}">
                    </td>
                </tr>
            `);
        });
    }

    function renderReconciliationTab() {
        const tbody = $('#reconcileTableBody');
        tbody.empty();

        MONTHS.forEach(m => {
            const rec = (appState.reconciliations && appState.reconciliations[m.num]) || {};
            tbody.append(`
                <tr class="border-b reconcile-row" data-month="${m.num}">
                    <td class="p-2 font-bold">${m.name}</td>
                    <td class="p-2">
                        <label class="inline-flex items-center text-xs cursor-pointer">
                            <input type="checkbox" class="rec-bank mr-2" ${rec.bankMatched ? 'checked' : ''}> Matched Statement
                        </label>
                    </td>
                    <td class="p-2">
                        <label class="inline-flex items-center text-xs cursor-pointer">
                            <input type="checkbox" class="rec-receipts mr-2" ${rec.receiptsSaved ? 'checked' : ''}> Receipts Filed
                        </label>
                    </td>
                    <td class="p-2">
                        <label class="inline-flex items-center text-xs cursor-pointer">
                            <input type="checkbox" class="rec-tax mr-2" ${rec.taxTransferred ? 'checked' : ''}> Transfers Done
                        </label>
                    </td>
                    <td class="p-2">
                        <input type="number" step="0.01" class="rec-balance w-36 p-1 border rounded-md text-xs" placeholder="0.00" value="${escapeAttr(rec.endingBalance)}">
                    </td>
                    <td class="p-2">
                        <input type="text" class="rec-notes w-full p-1 border rounded-md text-xs" placeholder="e.g., Reconciled in QBO on 5th" value="${escapeAttr(rec.notes)}">
                    </td>
                </tr>
            `);
        });
    }

    function renderComplianceTab() {
        const tbody = $('#complianceTableBody');
        tbody.empty();

        (appState.complianceItems || []).forEach(item => {
            tbody.append(`
                <tr class="border-b compliance-row" data-id="${item.id}">
                    <td class="p-2 text-center">
                        <input type="checkbox" class="comp-done cursor-pointer" ${item.done ? 'checked' : ''}>
                    </td>
                    <td class="p-2">
                        <select class="comp-level p-1 border rounded-md text-xs">
                            <option value="Federal (IRS)" ${item.level === 'Federal (IRS)' ? 'selected' : ''}>Federal (IRS)</option>
                            <option value="State (SOS)" ${item.level === 'State (SOS)' ? 'selected' : ''}>State (SOS)</option>
                            <option value="State (DOR)" ${item.level === 'State (DOR)' ? 'selected' : ''}>State (DOR)</option>
                            <option value="State (DOH)" ${item.level === 'State (DOH)' ? 'selected' : ''}>State (DOH)</option>
                            <option value="County" ${item.level === 'County' ? 'selected' : ''}>County</option>
                            <option value="City (Municipal)" ${item.level === 'City (Municipal)' ? 'selected' : ''}>City (Municipal)</option>
                            <option value="Insurance" ${item.level === 'Insurance' ? 'selected' : ''}>Insurance</option>
                            <option value="Credentialing" ${item.level === 'Credentialing' ? 'selected' : ''}>Credentialing</option>
                        </select>
                    </td>
                    <td class="p-2">
                        <input type="text" class="comp-name w-full p-1 border rounded-md text-xs font-semibold" value="${escapeAttr(item.name)}">
                    </td>
                    <td class="p-2">
                        <input type="text" class="comp-agency w-full p-1 border rounded-md text-xs" value="${escapeAttr(item.agency)}">
                    </td>
                    <td class="p-2">
                        <input type="text" class="comp-freq w-32 p-1 border rounded-md text-xs" value="${escapeAttr(item.frequency)}">
                    </td>
                    <td class="p-2">
                        <input type="date" class="comp-due p-1 border rounded-md text-xs" value="${escapeAttr(item.dueDate)}">
                    </td>
                    <td class="p-2">
                        <input type="number" step="0.01" class="comp-fee w-20 p-1 border rounded-md text-xs" value="${item.fee || 0}">
                    </td>
                    <td class="p-2">
                        <input type="text" class="comp-notes w-full p-1 border rounded-md text-xs" value="${escapeAttr(item.notes)}">
                    </td>
                    <td class="p-2 text-right">
                        <button type="button" class="remove-comp-btn btn-link text-xs">Remove</button>
                    </td>
                </tr>
            `);
        });
    }

    // --- 5. Event Listeners for Settings, Ledger, Taxes, Reconcile & Compliance ---
    $('#practiceName, #taxYear, #fedTaxRate, #stateGrossTaxRate, #annualRevenueGoal, #businessMiles, #homeOfficeSqFt').on('input change', function() {
        appState.practiceName = $('#practiceName').val().trim();
        appState.taxYear = parseInt($('#taxYear').val(), 10) || 2026;
        appState.fedTaxRate = parseFloat($('#fedTaxRate').val()) || 0;
        appState.stateGrossTaxRate = parseFloat($('#stateGrossTaxRate').val()) || 0;
        appState.annualRevenueGoal = parseFloat($('#annualRevenueGoal').val()) || 0;
        appState.businessMiles = parseFloat($('#businessMiles').val()) || 0;
        appState.homeOfficeSqFt = parseFloat($('#homeOfficeSqFt').val()) || 0;

        const fin = calculateFinancialSummary();
        renderKPIs(fin);
        renderOverviewTab(fin);
        renderQuarterlyTaxTab(fin);
        saveToLocalCacheIfEnabled();
    });

    $('#transactionForm').on('submit', function(e) {
        e.preventDefault();
        const editingId = $('#editingTxId').val();
        const txObj = {
            id: editingId || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            date: $('#txDate').val(),
            type: $('#txType').val(),
            category: $('#txCategory').val(),
            amount: parseFloat($('#txAmount').val()) || 0,
            vendor: $('#txVendor').val().trim(),
            notes: $('#txNotes').val().trim(),
            is1099: $('#tx1099Flag').is(':checked')
        };

        if (editingId) {
            const idx = appState.transactions.findIndex(t => t.id === editingId);
            if (idx > -1) appState.transactions[idx] = txObj;
        } else {
            appState.transactions.push(txObj);
        }

        resetTxForm();
        renderAll();
    });

    function resetTxForm() {
        document.getElementById('transactionForm').reset();
        $('#editingTxId').val('');
        $('#txDate').val(new Date().toISOString().split('T')[0]);
        populateTxCategories($('#txType').val());
        $('#saveTxBtn').text('Add Transaction');
        $('#cancelTxEditBtn').addClass('hidden');
    }

    $('#cancelTxEditBtn').on('click', resetTxForm);

    $(document).on('click', '.edit-tx-btn', function() {
        const id = $(this).data('id');
        const tx = appState.transactions.find(t => t.id === id);
        if (!tx) return;

        $('#editingTxId').val(tx.id);
        $('#txDate').val(tx.date);
        $('#txType').val(tx.type);
        populateTxCategories(tx.type, tx.category);
        $('#txAmount').val(tx.amount);
        $('#txVendor').val(tx.vendor);
        $('#txNotes').val(tx.notes);
        $('#tx1099Flag').prop('checked', !!tx.is1099);

        $('#saveTxBtn').text('Update Transaction');
        $('#cancelTxEditBtn').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#transactionForm').offset().top - 30 }, 400);
    });

    $(document).on('click', '.delete-tx-btn', function() {
        const id = $(this).data('id');
        if (!confirm('Delete this transaction?')) return;
        appState.transactions = appState.transactions.filter(t => t.id !== id);
        renderAll();
    });

    $('#filterTxType, #filterTxMonth').on('change', renderLedgerTab);

    // Quarterly Tax Status Listeners
    $(document).on('change input', '#quarterlyTaxTableBody tr', function() {
        const q = $(this).data('q');
        if (!appState.quarterlyStatus) appState.quarterlyStatus = getDefaultQuarterlyStatus();
        appState.quarterlyStatus[q] = {
            fedPaid: $(this).find('.q-fed-paid').is(':checked'),
            statePaid: $(this).find('.q-state-paid').is(':checked'),
            confNotes: $(this).find('.q-conf-notes').val().trim()
        };
        saveToLocalCacheIfEnabled();
    });

    // Monthly Reconciliation Listeners
    $(document).on('change input', '.reconcile-row', function() {
        const mNum = $(this).data('month');
        if (!appState.reconciliations) appState.reconciliations = getDefaultReconciliations();
        appState.reconciliations[mNum] = {
            bankMatched: $(this).find('.rec-bank').is(':checked'),
            receiptsSaved: $(this).find('.rec-receipts').is(':checked'),
            taxTransferred: $(this).find('.rec-tax').is(':checked'),
            endingBalance: $(this).find('.rec-balance').val(),
            notes: $(this).find('.rec-notes').val().trim()
        };
        const fin = calculateFinancialSummary();
        renderOverviewTab(fin);
        saveToLocalCacheIfEnabled();
    });

    // Compliance Table Listeners
    $('#addComplianceItemBtn').on('click', function() {
        appState.complianceItems.push({
            id: 'comp_' + Date.now(),
            done: false,
            level: 'City (Municipal)',
            name: 'New License / Filing Requirement',
            agency: '',
            frequency: 'Annual',
            dueDate: '',
            fee: 0,
            notes: ''
        });
        renderComplianceTab();
        saveToLocalCacheIfEnabled();
    });

    $(document).on('change input', '.compliance-row', function() {
        const id = $(this).data('id');
        const item = appState.complianceItems.find(c => c.id === id);
        if (!item) return;

        item.done = $(this).find('.comp-done').is(':checked');
        item.level = $(this).find('.comp-level').val();
        item.name = $(this).find('.comp-name').val().trim();
        item.agency = $(this).find('.comp-agency').val().trim();
        item.frequency = $(this).find('.comp-freq').val().trim();
        item.dueDate = $(this).find('.comp-due').val();
        item.fee = parseFloat($(this).find('.comp-fee').val()) || 0;
        item.notes = $(this).find('.comp-notes').val().trim();
        saveToLocalCacheIfEnabled();
    });

    $(document).on('click', '.remove-comp-btn', function() {
        const id = $(this).closest('.compliance-row').data('id');
        appState.complianceItems = appState.complianceItems.filter(c => c.id !== id);
        renderComplianceTab();
        saveToLocalCacheIfEnabled();
    });

    // --- 6. Local Browser Cache Toggle ---
    function checkLocalCacheOnLoad() {
        const isEnabled = localStorage.getItem(CACHE_ENABLED_KEY) === 'true';
        $('#localCacheToggle').prop('checked', isEnabled);
        if (isEnabled) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    Object.assign(appState, parsed);
                } catch (e) {
                    console.error('Failed to load cached business dashboard:', e);
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
        if (!confirm('Wipe all transactions and reset the Business Dashboard? Make sure you have exported your .json backup first.')) return;
        appState.transactions = [];
        appState.reconciliations = getDefaultReconciliations();
        appState.quarterlyStatus = getDefaultQuarterlyStatus();
        appState.complianceItems = getDefaultComplianceItems();
        localStorage.removeItem(STORAGE_KEY);
        renderAll();
    });

    // --- 7. Export (.json, .csv) & Print Executive Year-End Tax Packet ---
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
        downloadFile(JSON.stringify(appState, null, 2), `practice_business_dashboard_${appState.taxYear}.json`, 'application/json;charset=utf-8');
    });

    $('#importJsonButton').on('click', () => $('#importJsonFile').click());

    $('#importJsonFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                Object.assign(appState, parsed);
                renderAll();
            } catch (err) {
                alert('Invalid JSON file. Please select a valid Business Dashboard .json backup.');
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    $('#exportCsvLedgerBtn').on('click', function() {
        if (appState.transactions.length === 0) {
            alert('No transactions logged yet to export.');
            return;
        }
        const headers = ['Date', 'Type', 'Category', 'Vendor/Payer', 'Memo', 'Amount', '1099-NEC Contractor'];
        const rows = appState.transactions.map(t => [
            t.date, t.type, t.category, t.vendor || '', t.notes || '', (parseFloat(t.amount) || 0).toFixed(2), t.is1099 ? 'YES' : 'NO'
        ]);
        const csvContent = [headers, ...rows]
            .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        downloadFile(csvContent, `practice_ledger_${appState.taxYear}.csv`, 'text/csv;charset=utf-8');
    });

    $('#printAnnualReportBtn').on('click', function() {
        const fin = calculateFinancialSummary();

        const incRows = Object.entries(fin.incomeBySource)
            .map(([cat, amt]) => `<tr><td>${escapeHtml(cat)}</td><td>${formatCurrency(amt)}</td></tr>`)
            .join('');

        const expRows = Object.entries(fin.expensesByCategory)
            .map(([cat, amt]) => `<tr><td>${escapeHtml(cat)}</td><td>${formatCurrency(amt)}</td></tr>`)
            .join('');

        const monthlyRows = MONTHS.map(m => {
            const d = fin.monthly[m.num];
            const rec = (appState.reconciliations && appState.reconciliations[m.num]) || {};
            return `
                <tr>
                    <td>${m.name}</td>
                    <td>${formatCurrency(d.gross)}</td>
                    <td>${formatCurrency(d.expenses)}</td>
                    <td><strong>${formatCurrency(d.net)}</strong></td>
                    <td>${formatCurrency(d.totalTax)}</td>
                    <td>${rec.bankMatched ? 'Yes' : 'No'}</td>
                    <td>${rec.endingBalance ? '$' + escapeHtml(rec.endingBalance) : '—'}</td>
                </tr>
            `;
        }).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHtml(appState.practiceName)} — ${appState.taxYear} Financial &amp; Tax Summary</title>
                <style>
                    @page { margin: 0.55in; }
                    body { font-family: Georgia, "Times New Roman", serif; color: #000; font-size: 10pt; line-height: 1.4; margin: 0; }
                    h1, h2, h3 { margin: 0 0 6px 0; }
                    .header-bar { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; }
                    .summary-boxes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
                    .s-box { border: 1px solid #333; padding: 8px; border-radius: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9pt; }
                    th, td { border: 1px solid #444; padding: 5px 7px; text-align: left; }
                    th { background: #eee; }
                </style>
            </head>
            <body>
                <div class="header-bar">
                    <div>
                        <h1>${escapeHtml(appState.practiceName || 'Private Practice')}</h1>
                        <div>Cash-Basis Profit &amp; Loss, Schedule C Summary &amp; Reconciliation Packet</div>
                    </div>
                    <div style="text-align:right;">
                        <strong>Tax Year:</strong> ${appState.taxYear}<br>
                        <strong>Generated:</strong> ${new Date().toISOString().split('T')[0]}
                    </div>
                </div>

                <div class="summary-boxes">
                    <div class="s-box"><strong>YTD Gross Income:</strong><br>${formatCurrency(fin.ytdGross)}</div>
                    <div class="s-box"><strong>YTD Schedule C Expenses:</strong><br>${formatCurrency(fin.ytdExpenses)}</div>
                    <div class="s-box"><strong>YTD Net Profit:</strong><br>${formatCurrency(fin.ytdNet)}</div>
                    <div class="s-box"><strong>Est. Tax Reserve (Fed + B&amp;O):</strong><br>${formatCurrency(fin.ytdTotalTax)}</div>
                </div>

                <h3>1. Income by Source</h3>
                <table>
                    <thead><tr><th>Revenue Source</th><th>YTD Total</th></tr></thead>
                    <tbody>${incRows || '<tr><td colspan="2">No income logged.</td></tr>'}</tbody>
                </table>

                <h3>2. Tax-Deductible Expenses by IRS Schedule C Category</h3>
                <table>
                    <thead><tr><th>Schedule C Expense Category</th><th>YTD Total</th></tr></thead>
                    <tbody>${expRows || '<tr><td colspan="2">No expenses logged.</td></tr>'}</tbody>
                </table>
                <p><strong>Additional Non-Cash Write-Offs Tracked:</strong> Business Mileage: ${appState.businessMiles || 0} miles | Dedicated Home Office: ${appState.homeOfficeSqFt || 0} sq ft (Est. Combined Deduction: ${formatCurrency(fin.extraDeductions)})</p>

                <h3>3. Month-by-Month P&amp;L &amp; Bank Reconciliation Log</h3>
                <table>
                    <thead>
                        <tr><th>Month</th><th>Gross Income</th><th>Expenses</th><th>Net Profit</th><th>Est. Tax</th><th>Reconciled</th><th>Ending Bank Bal</th></tr>
                    </thead>
                    <tbody>${monthlyRows}</tbody>
                </table>
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

    function formatCurrency(val) {
        const num = parseFloat(val) || 0;
        return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

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