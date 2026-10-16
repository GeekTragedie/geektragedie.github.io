'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import styles from './budget.module.css';

// Import icons (using unicode characters as before)
const PlusIcon = () => <span>&#x2B;</span>;
const TimesIcon = () => <span>&times;</span>;
const CheckmarkIcon = () => <span>&#x2713;</span>;
const ExclamationIcon = () => <span>&#x21;</span>;
const ChevronIcon = ({ isExpanded }) => <span>{isExpanded ? '▼' : '►'}</span>;

// Constants for caps
const MAX_PEOPLE = 10;
const MAX_TOTAL_INCOME_SOURCES = 20;

export default function BudgetPage() {
    const [people, setPeople] = useState([
        {
            id: 'person-1',
            name: "Person 1",
            primaryNetIncome: 7789.00,
            note_primaryNetIncome: "",
            additionalIncomes: [],
            retirementSavings: 1000.00,
            note_retirementSavings: "",
        },
        {
            id: 'person-2',
            name: "Person 2",
            primaryNetIncome: 1000.00,
            note_primaryNetIncome: "",
            additionalIncomes: [],
            retirementSavings: 0.00,
            note_retirementSavings: "",
        },
    ]);

    const [isIncomeExpanded, setIsIncomeExpanded] = useState(true);
    const [isHousingExpanded, setIsHousingExpanded] = useState(true);
    const [isDebtExpanded, setIsDebtExpanded] = useState(true);
    const [isLivingExpensesExpanded, setIsLivingExpensesExpanded] = useState(true);
    const [isSavingsExpanded, setIsSavingsExpanded] = useState(true);

    const [errorMessage, setErrorMessage] = useState('');
    const errorTimerRef = useRef(null);
    const fileInputRef = useRef(null);

    const showErrorMessage = (message) => {
        setErrorMessage(message);
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
        }
        errorTimerRef.current = setTimeout(() => {
            setErrorMessage('');
        }, 5000);
    };

    const formatDisplayAmount = (numValue) => {
        if (isNaN(numValue) || numValue === null) return '0';
        const fixedTwo = numValue.toFixed(2);
        if (fixedTwo.endsWith('.00')) {
            return numValue.toFixed(0);
        }
        return fixedTwo;
    };
    
    const baseInitialBudgetValues = {
        label_income_category: "INCOME",
        label_housing_category: "HOUSING",
        label_debt_category: "DEBT REPAYMENT",
        label_living_expenses_category: "LIVING EXPENSES",
        label_savings_category: "SAVINGS & INVESTMENTS",
        label_budget_summary_category: "BUDGET SUMMARY",
        label_house_subheader: "House",
        label_utility_subheader: "Utility",
        label_food_subheader: "Food",
        label_transportation_subheader: "Transportation",
        label_other_household_personal_subheader: "Other Household/Personal",
        mortgage: 6500.00, note_mortgage: "", label_mortgage: "Mortgage (P&I)",
        propertyTaxes: 649.00, note_propertyTaxes: "", label_propertyTaxes: "Property Taxes",
        homeInsurance: 26.42, note_homeInsurance: "", label_homeInsurance: "Homeowners Insurance",
        pestControl: 55.00, note_pestControl: "", label_pestControl: "Pest Control",
        energy: 245.00, note_energy: "", label_energy: "Energy (Electricity/Gas)",
        internet: 147.00, note_internet: "", label_internet: "Internet",
        waterSewage: 157.50, note_waterSewage: "", label_waterSewage: "Water/Sewage",
        waste: 40.00, note_waste: "", label_waste: "Waste",
        studentLoans: 1036.00, note_studentLoans: "", label_studentLoans: "Student Loans",
        carLoan: 375.00, note_carLoan: "", label_carLoan: "Car Loan",
        groceries: 150.00, note_groceries: "", label_groceries: "Groceries",
        phone: 50.00, note_phone: "", label_phone: "Phone",
        petCare: 75.00, note_petCare: "", label_petCare: "Pet Care",
        healthWellness: 800.00, note_healthWellness: "", label_healthWellness: "Health & Wellness",
        personalCare: 300.00, note_personalCare: "", label_personalCare: "Personal Care",
        entertainment: 45.00, note_entertainment: "", label_entertainment: "Entertainment",
        mealDelivery: 500.00, note_mealDelivery: "", label_mealDelivery: "Meal Delivery",
        diningOut: 800.00, note_diningOut: "", label_diningOut: "Dining Out",
        transportGas: 50.00, note_transportGas: "", label_transportGas: "Gas",
        transportCarInsurance: 74.83, note_transportCarInsurance: "", label_transportCarInsurance: "Car Insurance",
        transportCarMaint: 41.67, note_transportCarMaint: "", label_transportCarMaint: "Car Maint. (Avg)",
        vacationSavings: 333.33, note_vacationSavings: "", label_vacationSavings: "Vacation Savings",
        label_homeMaintenanceFund: "Home Maintenance Fund",
        label_person_retirement_prenet: "Person 1's Retirement",
        note_person_retirement_prenet: "",
        note_combinedTakeHome: "(Combined take-home pay)",
    };

    const [inputs, setInputs] = useState(() => {
        const initial = { ...baseInitialBudgetValues };
        for (const key in initial) {
            if (!key.startsWith("note_") && typeof initial[key] === 'number') {
                initial[key] = formatDisplayAmount(initial[key]);
            } else if (key.startsWith("note_") && (initial[key] === undefined || initial[key] === null)) {
                initial[key] = '';
            }
        }
        return initial;
    });

    const updateGeneralInputState = (name, value, isAmountField = false) => {
        let processedValue = value;
        if (isAmountField) {
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue)) { processedValue = formatDisplayAmount(numericValue); }
            else if (String(value).trim() === "") { processedValue = formatDisplayAmount(0); }
            else { processedValue = formatDisplayAmount(0); }
        }
        setInputs(prev => ({ ...prev, [name]: processedValue }));
    };

    const addPerson = () => {
        if (people.length >= MAX_PEOPLE) {
            showErrorMessage(`Maximum of ${MAX_PEOPLE} people reached. Cannot add more.`);
            return;
        }
        const newPersonId = `person-${Date.now()}-${Math.random()}`;
        setPeople(prev => [
            ...prev,
            {
                id: newPersonId,
                name: `Person ${prev.length + 1}`,
                primaryNetIncome: 0.00,
                note_primaryNetIncome: "",
                additionalIncomes: [],
                retirementSavings: 0.00,
                note_retirementSavings: "",
            }
        ]);
    };

    const removePerson = (personIdToRemove) => {
        if (people.length <= 1) {
            showErrorMessage("Cannot remove the last person. At least one person must remain.");
            return;
        }
        if (window.confirm("Are you sure you want to remove this person and all their associated income/savings?")) {
            setPeople(prev => prev.filter(p => p.id !== personIdToRemove));
        }
    };

    const handlePersonNameChange = (personId, newName) => {
        setPeople(prev => prev.map(p => p.id === personId ? { ...p, name: newName } : p));
    };

    const handlePersonPrimaryIncomeChange = (personId, value) => {
        setPeople(prevPeople => prevPeople.map(p => {
            if (p.id === personId) {
                const numericValue = parseFloat(value);
                const processedValue = !isNaN(numericValue) ? formatDisplayAmount(numericValue) : formatDisplayAmount(0);
                return { ...p, primaryNetIncome: processedValue };
            }
            return p;
        }));
    };

    const handlePersonPrimaryIncomeNoteChange = (personId, note) => {
        setPeople(prevPeople => prevPeople.map(p => p.id === personId ? { ...p, note_primaryNetIncome: note } : p));
    };

    const handlePersonRetirementChange = (personId, value) => {
        setPeople(prevPeople => prevPeople.map(p => {
            if (p.id === personId) {
                const numericValue = parseFloat(value);
                const processedValue = !isNaN(numericValue) ? formatDisplayAmount(numericValue) : formatDisplayAmount(0);
                return { ...p, retirementSavings: processedValue };
            }
            return p;
        }));
    };

    const handlePersonRetirementNoteChange = (personId, note) => {
        setPeople(prevPeople => prevPeople.map(p => p.id === personId ? { ...p, note_retirementSavings: note } : p));
    };

    const addAdditionalIncome = (personId) => {
        const totalCurrentIncomeSources = people.reduce((sum, p) => sum + 1 + p.additionalIncomes.length, 0);
        
        if (totalCurrentIncomeSources >= MAX_TOTAL_INCOME_SOURCES) {
            showErrorMessage(`Maximum of ${MAX_TOTAL_INCOME_SOURCES} total income sources reached. Cannot add more.`);
            return;
        }

        const newIncome = { id: `income-${Date.now()}-${Math.random()}`, sourceName: '', amount: '0', note: '', isNew: true };
        setPeople(prev => prev.map(p => p.id === personId ? { ...p, additionalIncomes: [...p.additionalIncomes, newIncome] } : p));
    };

    const handleAdditionalIncomeChange = (personId, incomeId, field, value) => {
        setPeople(prevPeople => prevPeople.map(p => {
            if (p.id === personId) {
                const updatedAdditionalIncomes = p.additionalIncomes.map(income => income.id === incomeId ? { ...income, [field]: value } : income);
                return { ...p, additionalIncomes: updatedAdditionalIncomes };
            }
            return p;
        }));
    };

    const handleAdditionalAmountBlur = (personId, incomeId, currentValue) => {
        const numericValue = parseFloat(currentValue);
        let formattedDisplayValue;
        if (!isNaN(numericValue)) { formattedDisplayValue = formatDisplayAmount(numericValue); }
        else if (String(currentValue).trim() === "") { formattedDisplayValue = formatDisplayAmount(0); }
        else { formattedDisplayValue = formatDisplayAmount(0); }

        setPeople(prevPeople => prevPeople.map(p => {
            if (p.id === personId) {
                const updatedAdditionalIncomes = p.additionalIncomes.map(income => income.id === incomeId ? { ...income, amount: formattedDisplayValue } : income);
                return { ...p, additionalIncomes: updatedAdditionalIncomes };
            }
            return p;
        }));
    };

    const removeAdditionalIncome = (personId, incomeId) => {
        if (window.confirm("Are you sure you want to remove this income source?")) {
            setPeople(prevPeople => prevPeople.map(p => {
                if (p.id === personId) {
                    const updatedAdditionalIncomes = p.additionalIncomes.filter(income => income.id !== incomeId);
                    return { ...p, additionalIncomes: updatedAdditionalIncomes };
                }
                return p;
            }));
        }
    };
    
    // --- Start: Import/Export/Print Logic ---
    const handleExport = () => {
        const dataToExport = {
            people: people,
            inputs: inputs,
        };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(dataToExport, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "budget-data.json";
        link.click();
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && importedData.people && importedData.inputs) {
                    setPeople(importedData.people);
                    setInputs(importedData.inputs);
                } else {
                    showErrorMessage("Invalid file format. The file must contain 'people' and 'inputs' data.");
                }
            } catch (error) {
                showErrorMessage("Error reading or parsing the file. Please ensure it is a valid JSON file.");
            }
        };
        reader.readAsText(file);
        
        event.target.value = null;
    };
    
    const handlePrint = () => {
        window.print();
    };
    // --- End: Import/Export/Print Logic ---


    const formatCurrency = (value, showParenthesesForNegative = false) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '0.00'; 
        if (showParenthesesForNegative && numValue < 0) { return `(${Math.abs(numValue).toFixed(2)})`; }
        return numValue.toFixed(2);
    };
    
    const housingItems = useMemo(() => [
        { type: 'subheader', labelName: "label_house_subheader" },
        { type: 'item', amountName: "mortgage", noteName: "note_mortgage", labelName: "label_mortgage", transactionType: 'withdrawal' },
        { type: 'item', amountName: "propertyTaxes", noteName: "note_propertyTaxes", labelName: "label_propertyTaxes", transactionType: 'withdrawal' },
        { type: 'item', amountName: "homeInsurance", noteName: "note_homeInsurance", labelName: "label_homeInsurance", transactionType: 'withdrawal' },
        { type: 'item', amountName: "pestControl", noteName: "note_pestControl", labelName: "label_pestControl", transactionType: 'withdrawal' },
        { type: 'subheader', labelName: "label_utility_subheader" },
        { type: 'item', amountName: "energy", noteName: "note_energy", labelName: "label_energy", transactionType: 'withdrawal' },
        { type: 'item', amountName: "internet", noteName: "note_internet", labelName: "label_internet", transactionType: 'withdrawal' },
        { type: 'item', amountName: "waterSewage", noteName: "note_waterSewage", labelName: "label_waterSewage", transactionType: 'withdrawal' },
        { type: 'item', amountName: "waste", noteName: "note_waste", labelName: "label_waste", transactionType: 'withdrawal' },
    ], []);
    const debtItems = useMemo(() => [
        { type: 'item', amountName: "studentLoans", noteName: "note_studentLoans", labelName: "label_studentLoans", transactionType: 'withdrawal' },
        { type: 'item', amountName: "carLoan", noteName: "note_carLoan", labelName: "label_carLoan", transactionType: 'withdrawal' },
    ], []);
    const livingExpenseItems = useMemo(() => [
        { type: 'subheader', labelName: "label_food_subheader" },
        { type: 'item', amountName: "groceries", noteName: "note_groceries", labelName: "label_groceries", transactionType: 'withdrawal' },
        { type: 'item', amountName: "mealDelivery", noteName: "note_mealDelivery", labelName: "label_mealDelivery", transactionType: 'withdrawal' },
        { type: 'item', amountName: "diningOut", noteName: "note_diningOut", labelName: "label_diningOut", transactionType: 'withdrawal' },
        { type: 'subheader', labelName: "label_transportation_subheader" },
        { type: 'item', amountName: "transportGas", noteName: "note_transportGas", labelName: "label_transportGas", transactionType: 'withdrawal' },
        { type: 'item', amountName: "transportCarInsurance", noteName: "note_transportCarInsurance", labelName: "label_transportCarInsurance", transactionType: 'withdrawal' },
        { type: 'item', amountName: "transportCarMaint", noteName: "note_transportCarMaint", labelName: "label_transportCarMaint", transactionType: 'withdrawal' },
        { type: 'subheader', labelName: "label_other_household_personal_subheader" },
        { type: 'item', amountName: "phone", noteName: "note_phone", labelName: "label_phone", transactionType: 'withdrawal' },
        { type: 'item', amountName: "petCare", noteName: "note_petCare", labelName: "label_petCare", transactionType: 'withdrawal' },
        { type: 'item', amountName: "healthWellness", noteName: "note_healthWellness", labelName: "label_healthWellness", transactionType: 'withdrawal' },
        { type: 'item', amountName: "personalCare", noteName: "note_personalCare", labelName: "label_personalCare", transactionType: 'withdrawal' },
        { type: 'item', amountName: "entertainment", noteName: "note_entertainment", labelName: "label_entertainment", transactionType: 'withdrawal' },
    ], []);
    const commonSavingsItems = useMemo(() => [
        { type: 'item', amountName: "homeMaintenance", noteName: "note_homeMaintenance", labelName: "label_homeMaintenanceFund", transactionType: 'withdrawal' },
        { type: 'item', amountName: "vacationSavings", noteName: "note_vacationSavings", labelName: "label_vacationSavings", transactionType: 'withdrawal' },
    ], []);

    const totalNetIncome = useMemo(() => {
        return people.reduce((sum, p) => {
            const primary = parseFloat(p.primaryNetIncome) || 0;
            const additional = p.additionalIncomes.reduce((addSum, income) => addSum + (parseFloat(income.amount) || 0), 0);
            return sum + primary + additional;
        }, 0);
    }, [people]);

    const totalHousingExpenses = useMemo(() => housingItems.filter(item => item.type === 'item').reduce((sum, item) => sum + (parseFloat(inputs[item.amountName]) || 0), 0), [inputs, housingItems] );
    const totalDebtRepayment = useMemo(() => debtItems.filter(item => item.type === 'item').reduce((sum, item) => sum + (parseFloat(inputs[item.amountName]) || 0), 0), [inputs, debtItems] );
    const totalLivingExpenses = useMemo(() => livingExpenseItems.filter(item => item.type === 'item').reduce((sum, item) => sum + (parseFloat(inputs[item.amountName]) || 0), 0), [inputs, livingExpenseItems] );
    
    const totalPlannedSavings = useMemo(() => {
        const commonSum = commonSavingsItems.filter(item => item.type === 'item').reduce((sum, item) => sum + (parseFloat(inputs[item.amountName]) || 0), 0);
        const peopleRetirementSum = people.reduce((sum, p) => sum + (parseFloat(p.retirementSavings) || 0), 0);
        return commonSum + peopleRetirementSum;
    }, [inputs, commonSavingsItems, people]);

    const netMonthlySurplusDeficit = useMemo(() => totalNetIncome - totalHousingExpenses - totalDebtRepayment - totalLivingExpenses - totalPlannedSavings, [totalNetIncome, totalHousingExpenses, totalDebtRepayment, totalLivingExpenses, totalPlannedSavings]);

    const textMeasurerRef = useRef(null);

    const inputRef = useCallback(node => {
        if (node !== null) {
            const computedStyle = window.getComputedStyle(node);
            const font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
            
            if (!textMeasurerRef.current) {
                textMeasurerRef.current = document.createElement('span');
                textMeasurerRef.current.style.visibility = 'hidden';
                textMeasurerRef.current.style.position = 'absolute';
                textMeasurerRef.current.style.whiteSpace = 'nowrap';
                document.body.appendChild(textMeasurerRef.current);
            }

            const resizeInput = () => {
                if (textMeasurerRef.current) {
                    textMeasurerRef.current.style.font = font;
                    textMeasurerRef.current.textContent = node.value;
                    node.style.width = `${Math.max(50, textMeasurerRef.current.offsetWidth) + 8}px`; 
                }
            };

            resizeInput();
            node.addEventListener('input', resizeInput);
            
            return () => {
                node.removeEventListener('input', resizeInput);
            };
        }
    }, []);

    // --- Components ---
    const BudgetItemRow = ({ amountName, noteName, label, labelName, transactionType, initialAmount, initialNote, onUpdateInput }) => {
        const [localAmount, setLocalAmount] = useState(String(initialAmount || ''));
        const [localNote, setLocalNote] = useState(String(initialNote || ''));
        const [localLabel, setLocalLabel] = useState(label || inputs[labelName] || '');

        useEffect(() => { setLocalAmount(String(initialAmount || '')); }, [initialAmount]);
        useEffect(() => { setLocalNote(String(initialNote || '')); }, [initialNote]);
        useEffect(() => { setLocalLabel(label || inputs[labelName] || ''); }, [label, labelName]);

        const handleLocalAmountChange = (e) => { setLocalAmount(e.target.value); };
        const handleLocalAmountBlur = () => { onUpdateInput(amountName, localAmount, true); };
        
        const handleLocalNoteChange = (e) => { setLocalNote(e.target.value); };
        const handleLocalNoteBlur = () => { onUpdateInput(noteName, localNote, false); };

        const handleLocalLabelChange = (e) => { setLocalLabel(e.target.value); };
        const handleLocalLabelBlur = () => { 
            if (labelName) {
                onUpdateInput(labelName, localLabel, false); 
            }
        };

        return (
            <div className={styles.itemRow} role="row">
                <div className={styles.itemCell} role="cell">
                    {labelName ? (
                        <input
                            type="text"
                            value={localLabel}
                            onChange={handleLocalLabelChange}
                            onBlur={handleLocalLabelBlur}
                            className={styles.itemNameInput}
                            aria-label={`${labelName.replace('label_', '')} item name`}
                        />
                    ) : (
                        <div className={styles.itemNameInput}>{label}</div>
                    )}
                </div>
                <div className={styles.amountCell} role="cell">
                    <input
                        type="number"
                        name={amountName}
                        value={localAmount}
                        onChange={handleLocalAmountChange}
                        onBlur={handleLocalAmountBlur}
                        step="0.01"
                        className={`${styles.amountInputText} ${transactionType === 'deposit' ? styles.amountInputTextDeposited : transactionType === 'withdrawal' ? styles.amountInputTextWithdrawn : ''}`}
                        aria-label={`${label || inputs[labelName]} monthly amount`}
                    />
                </div>
                <div className={styles.notesCell} role="cell">
                    <textarea
                        name={noteName}
                        value={localNote}
                        onChange={handleLocalNoteChange}
                        onBlur={handleLocalNoteBlur}
                        placeholder="Enter note..."
                        className={styles.notesInput}
                        aria-label={`${label || inputs[labelName]} notes`}
                    />
                </div>
            </div>
        );
    };

    const AdditionalIncomeRow = ({ income, person, onChange, onRemove }) => {
        const amountValue = income.amount !== undefined ? String(income.amount) : '0';
        const noteValue = income.note !== undefined ? String(income.note) : '';
        const sourceNameValue = income.sourceName !== undefined ? String(income.sourceName) : '';
        
        const [isHighlighted, setIsHighlighted] = useState(income.isNew || false);

        useEffect(() => {
            if (isHighlighted) {
                const timer = setTimeout(() => setIsHighlighted(false), 500);
                return () => clearTimeout(timer);
            }
        }, [isHighlighted]);

        return (
            <div className={`${styles.itemRow} ${isHighlighted ? styles.highlightNewRow : ''}`} role="row">
                <div className={`${styles.itemCell} ${styles.itemCellWithAction}`} role="cell">
                    <button onClick={() => addAdditionalIncome(person.id)} className={`${styles.addButton} ${styles.addButtonSmall} ${styles.noPrint}`} title={`Add income source for ${person.name}`} aria-label={`Add income source for ${person.name}`}>
                        <PlusIcon /> Add
                    </button>
                    <input
                        type="text"
                        value={sourceNameValue}
                        onChange={(e) => onChange(person.id, income.id, 'sourceName', e.target.value)}
                        placeholder="Income Source Name"
                        className={styles.itemNameInput}
                        aria-label={`Additional income source name for ${person.name}`}
                        ref={inputRef}
                    />
                </div>
                <div className={styles.amountCell} role="cell">
                    <input
                        type="number"
                        value={amountValue}
                        onChange={(e) => onChange(person.id, income.id, 'amount', e.target.value)}
                        onBlur={(e) => handleAdditionalAmountBlur(person.id, income.id, e.target.value)}
                        step="0.01"
                        className={`${styles.amountInputText} ${styles.amountInputTextDeposited}`}
                        aria-label={`Amount for additional income from ${sourceNameValue} for ${person.name}`}
                    />
                </div>
                <div className={styles.notesCell} role="cell">
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <textarea
                            value={noteValue}
                            onChange={(e) => onChange(person.id, income.id, 'note', e.target.value)}
                            onBlur={(e) => onChange(person.id, income.id, 'note', e.target.value)}
                            placeholder="Enter note..."
                            className={styles.notesInput}
                            aria-label={`Notes for additional income from ${sourceNameValue} for ${person.name}`}
                            style={{ flexGrow: 1, marginRight: '5px' }}
                        />
                        <button
                            onClick={() => onRemove(person.id, income.id)}
                            className={`${styles.removeButton} ${styles.noPrint}`}
                            title="Remove income source"
                            aria-label={`Remove additional income from ${sourceNameValue} for ${person.name}`}
                        >
                            <TimesIcon /> Remove
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const SubheaderRow = ({ labelName }) => (
        <div className={styles.subheaderRow} role="row">
            <div className={styles.subheaderCell} role="cell">
                <input
                    type="text"
                    value={inputs[labelName] || ''}
                    onChange={(e) => updateGeneralInputState(labelName, e.target.value, false)}
                    className={styles.subheaderInput}
                    aria-label={`${labelName.replace('label_', '').replace('_subheader', '')} subheader title`}
                    ref={inputRef}
                />
            </div>
        </div>
    );
    
    const CategoryHeader = ({ labelName, isExpanded, onToggle, id }) => (
        <div
            className={styles.categoryHeader}
            onClick={onToggle}
            role="button"
            aria-expanded={isExpanded}
            aria-controls={id}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
        >
            <input
                type="text"
                value={inputs[labelName] || ''}
                onChange={(e) => updateGeneralInputState(labelName, e.target.value, false)}
                className={styles.itemNameInput}
                aria-label={`${labelName.replace('label_', '')} category title`}
                style={{ fontWeight: 'bold' }}
                ref={inputRef}
                onClick={(e) => e.stopPropagation()}
            />
            <ChevronIcon isExpanded={isExpanded} />
        </div>
    );

    const SummaryRow = ({ label, amount, isTotal = false, isDeficit = false }) => (
        <div className={`${styles.summaryRow} ${isTotal ? styles.totalRow : ''} ${isDeficit ? styles.deficit : ''}`}>
            <div className={styles.summaryLabel}>
                {isTotal ? (
                    <>
                        <strong>{label}</strong>
                        <span aria-hidden="true" className={styles.summaryIcon}>{isDeficit ? <ExclamationIcon /> : <CheckmarkIcon />}</span>
                    </>
                ) : (
                    label
                )}
            </div>
            <div className={`${styles.summaryAmount} ${isDeficit ? styles.deficit : ''}`}>
                {amount}
            </div>
            {isTotal && (
                <div className={`${styles.summaryNote} ${isDeficit ? styles.deficit : styles.surplus}`}>
                    {isDeficit ? 'Concerning deficit' : 'Surplus!'}
                </div>
            )}
        </div>
    );

    return (
        <div className={styles.container}>
            <a href="#main-content" className={`skip-link ${styles.noPrint}`}>Skip to main content</a>
            <main id="main-content">
                <div className={styles.headerControls}>
                    <h2>Household Monthly Budget</h2>
                    <div className={styles.buttonGroup}>
                        <button onClick={handleImportClick} className={styles.addButton}>Import .json</button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            style={{ display: 'none' }}
                        />
                        <button onClick={handleExport} className={styles.addButton}>Export .json</button>
                        <button onClick={handlePrint} className={styles.addButton}>Print Budget</button>
                    </div>
                </div>

                {errorMessage && (
                    <div className={styles.errorMessage} role="alert" aria-live="polite">
                        <ExclamationIcon /> {errorMessage}
                    </div>
                )}
                
                <div className={`${styles.nameInputsContainer} ${styles.noPrint}`}>
                    {people.map((person, index) => (
                        <div key={person.id} className={styles.nameInputGroup}>
                            <label htmlFor={`personNameInput-${person.id}`} className={styles.nameInputLabel}>Name {index + 1}:</label>
                            <div className={styles.nameInputFieldContainer}>
                                <input
                                    type="text"
                                    id={`personNameInput-${person.id}`}
                                    value={person.name}
                                    onChange={(e) => handlePersonNameChange(person.id, e.target.value)}
                                    placeholder={`Enter Person ${index + 1}'s Name`}
                                    className={styles.nameInputField}
                                    aria-label={`Enter name for Person ${index + 1}`}
                                    ref={inputRef}
                                />
                                {people.length > 1 && (
                                    <button
                                        onClick={() => removePerson(person.id)}
                                        className={styles.removePersonButton}
                                        title={`Remove ${person.name}`}
                                        aria-label={`Remove ${person.name} from budget`}
                                    >
                                        <TimesIcon /> Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={`${styles.addPersonButtonContainer} ${styles.noPrint}`}>
                    <button
                        onClick={addPerson}
                        className={`${styles.addButton}`}
                        title={`Add another person (Max ${MAX_PEOPLE})`}
                        aria-label={`Add another person to the budget, maximum ${MAX_PEOPLE} people`}
                        disabled={people.length >= MAX_PEOPLE}
                    >
                        <PlusIcon /> Add Person
                    </button>
                </div>

                <div className={styles.section} role="table" aria-label="Budget Breakdown">
                    <div className={styles.tableHeader} role="rowgroup">
                        <div className={styles.itemCellHeader} role="columnheader">Category/Item</div>
                        <div className={styles.amountCellHeader} role="columnheader">Monthly Amount ($)</div>
                        <div className={styles.notesCellHeader} role="columnheader">Notes</div>
                    </div>
                    
                    {/* INCOME section */}
                    <div className={styles.categoryGroup}>
                        <CategoryHeader id="income-section" labelName="label_income_category" isExpanded={isIncomeExpanded} onToggle={() => setIsIncomeExpanded(!isIncomeExpanded)} />
                        {isIncomeExpanded && (
                            <div id="income-section" role="rowgroup">
                                {people.map(person => (
                                    <React.Fragment key={person.id}>
                                        <div className={styles.itemRow} role="row">
                                            <div className={`${styles.itemCell} ${styles.itemCellWithAction}`} role="cell">
                                                <button onClick={() => addAdditionalIncome(person.id)} className={`${styles.addButton} ${styles.addButtonSmall} ${styles.noPrint}`} title={`Add income source for ${person.name}`} aria-label={`Add income source for ${person.name}`}>
                                                    <PlusIcon /> Add
                                                </button>
                                                <div className={styles.itemNameInput}>{`${person.name}'s Primary Net Income`}</div>
                                            </div>
                                            <div className={styles.amountCell} role="cell">
                                                <input
                                                    type="number"
                                                    value={person.primaryNetIncome || ''}
                                                    onChange={(e) => handlePersonPrimaryIncomeChange(person.id, e.target.value)}
                                                    onBlur={(e) => handlePersonPrimaryIncomeChange(person.id, e.target.value)}
                                                    step="0.01"
                                                    className={`${styles.amountInputText} ${styles.amountInputTextDeposited}`}
                                                    aria-label={`${person.name}'s primary net income amount`}
                                                />
                                            </div>
                                            <div className={styles.notesCell} role="cell">
                                                <textarea
                                                    value={person.note_primaryNetIncome || ''}
                                                    onChange={(e) => handlePersonPrimaryIncomeNoteChange(person.id, e.target.value)}
                                                    onBlur={(e) => handlePersonPrimaryIncomeNoteChange(person.id, e.target.value)}
                                                    placeholder="Enter note..."
                                                    className={styles.notesInput}
                                                    aria-label={`Notes for ${person.name}'s primary net income`}
                                                />
                                            </div>
                                        </div>
                                        {person.additionalIncomes.map(income => (
                                            <AdditionalIncomeRow key={income.id} income={income} person={person} onChange={handleAdditionalIncomeChange} onRemove={removeAdditionalIncome} />
                                        ))}
                                    </React.Fragment>
                                ))}
                                <div className={styles.totalRow} role="row">
                                    <div className={styles.totalLabel} role="cell">Total Net Monthly Income</div>
                                    <div className={`${styles.totalAmount} ${styles.amountDisplay}`} role="cell">{formatCurrency(totalNetIncome)}</div>
                                    <div className={styles.totalNotes} role="cell"><em>{inputs.note_combinedTakeHome}</em></div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* HOUSING section */}
                    <div className={styles.categoryGroup}>
                        <CategoryHeader id="housing-section" labelName="label_housing_category" isExpanded={isHousingExpanded} onToggle={() => setIsHousingExpanded(!isHousingExpanded)} />
                        {isHousingExpanded && (
                            <div id="housing-section" role="rowgroup">
                                {housingItems.map(item => item.type === 'subheader' ? <SubheaderRow key={item.labelName} labelName={item.labelName} /> : <BudgetItemRow key={item.amountName} amountName={item.amountName} noteName={item.noteName} labelName={item.labelName} transactionType={item.transactionType} initialAmount={inputs[item.amountName]} initialNote={inputs[item.noteName]} onUpdateInput={updateGeneralInputState} />)}
                                <div className={styles.totalRow} role="row">
                                    <div className={styles.totalLabel} role="cell">Total Housing Expenses</div>
                                    <div className={`${styles.totalAmount} ${styles.amountDisplay}`} role="cell">{formatCurrency(totalHousingExpenses)}</div>
                                    <div className={styles.totalNotes} role="cell"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DEBT REPAYMENT section */}
                    <div className={styles.categoryGroup}>
                        <CategoryHeader id="debt-section" labelName="label_debt_category" isExpanded={isDebtExpanded} onToggle={() => setIsDebtExpanded(!isDebtExpanded)} />
                        {isDebtExpanded && (
                            <div id="debt-section" role="rowgroup">
                                {debtItems.map(item => <BudgetItemRow key={item.amountName} amountName={item.amountName} noteName={item.noteName} labelName={item.labelName} transactionType={item.transactionType} initialAmount={inputs[item.amountName]} initialNote={inputs[item.noteName]} onUpdateInput={updateGeneralInputState} />)}
                                <div className={styles.totalRow} role="row">
                                    <div className={styles.totalLabel} role="cell">Total Debt Repayment</div>
                                    <div className={`${styles.totalAmount} ${styles.amountDisplay}`} role="cell">{formatCurrency(totalDebtRepayment)}</div>
                                    <div className={styles.totalNotes} role="cell"></div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* LIVING EXPENSES section */}
                    <div className={styles.categoryGroup}>
                        <CategoryHeader id="living-expenses-section" labelName="label_living_expenses_category" isExpanded={isLivingExpensesExpanded} onToggle={() => setIsLivingExpensesExpanded(!isLivingExpensesExpanded)} />
                        {isLivingExpensesExpanded && (
                            <div id="living-expenses-section" role="rowgroup">
                                {livingExpenseItems.map(item => item.type === 'subheader' ? <SubheaderRow key={item.labelName} labelName={item.labelName} /> : <BudgetItemRow key={item.amountName} amountName={item.amountName} noteName={item.noteName} labelName={item.labelName} transactionType={item.transactionType} initialAmount={inputs[item.amountName]} initialNote={inputs[item.noteName]} onUpdateInput={updateGeneralInputState} />)}
                                <div className={styles.totalRow} role="row">
                                    <div className={styles.totalLabel} role="cell">Total Living Expenses</div>
                                    <div className={`${styles.totalAmount} ${styles.amountDisplay}`} role="cell">{formatCurrency(totalLivingExpenses)}</div>
                                    <div className={styles.totalNotes} role="cell"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SAVINGS & INVESTMENTS section */}
                    <div className={styles.categoryGroup}>
                        <CategoryHeader id="savings-section" labelName="label_savings_category" isExpanded={isSavingsExpanded} onToggle={() => setIsSavingsExpanded(!isSavingsExpanded)} />
                        {isSavingsExpanded && (
                            <div id="savings-section" role="rowgroup">
                                {commonSavingsItems.map(item => <BudgetItemRow key={item.amountName} amountName={item.amountName} noteName={item.noteName} labelName={item.labelName} transactionType={item.transactionType} initialAmount={inputs[item.amountName]} initialNote={inputs[item.noteName]} onUpdateInput={updateGeneralInputState} />)}
                                <BudgetItemRow
                                    label="Person 1's Retirement Savings"
                                    amountName={`retirementSavings-${people[0].id}`}
                                    noteName={`note_retirementSavings-${people[0].id}`}
                                    transactionType="withdrawal"
                                    initialAmount={people[0].retirementSavings}
                                    initialNote={people[0].note_retirementSavings}
                                    onUpdateInput={(name, value, isAmount) => {
                                        if (isAmount) handlePersonRetirementChange(people[0].id, value);
                                        else handlePersonRetirementNoteChange(people[0].id, value);
                                    }}
                                />
                                {people.slice(1).map(person => (
                                    <BudgetItemRow
                                        key={`retirement-${person.id}`}
                                        amountName={`retirementSavings-${person.id}`}
                                        noteName={`note_retirementSavings-${person.id}`}
                                        label={`${person.name}'s Retirement Savings`}
                                        transactionType="withdrawal"
                                        initialAmount={person.retirementSavings}
                                        initialNote={person.note_retirementSavings}
                                        onUpdateInput={(name, value, isAmount) => {
                                            if (isAmount) handlePersonRetirementChange(person.id, value);
                                            else handlePersonRetirementNoteChange(person.id, value);
                                        }}
                                    />
                                ))}
                                <div className={styles.totalRow} role="row">
                                    <div className={styles.totalLabel} role="cell">Total Planned Savings (from Net Income)</div>
                                    <div className={`${styles.totalAmount} ${styles.amountDisplay}`} role="cell">{formatCurrency(totalPlannedSavings)}</div>
                                    <div className={styles.totalNotes} role="cell"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SUMMARY section */}
                <div className={styles.summarySection} role="table" aria-label="Budget Summary">
                    <div className={styles.summaryHeader} role="rowgroup">
                        <div className={styles.summaryTitleCell} role="columnheader">
                            <input
                                type="text"
                                value={inputs.label_budget_summary_category || ''}
                                onChange={(e) => updateGeneralInputState('label_budget_summary_category', e.target.value, false)}
                                className={styles.itemNameInput}
                                aria-label="Budget summary category title"
                                ref={inputRef}
                            />
                        </div>
                    </div>
                    <div role="rowgroup">
                        <div className={styles.summaryRow} role="row">
                            <div className={styles.summaryLabel} role="cell">Total Net Monthly Income</div>
                            <div className={styles.summaryAmount} role="cell">{formatCurrency(totalNetIncome)}</div>
                        </div>
                        <div className={styles.summaryRow} role="row">
                            <div className={styles.summaryLabel} role="cell"><em>Less: Total Housing Expenses</em></div>
                            <div className={styles.summaryAmount} role="cell">{formatCurrency(totalHousingExpenses, true)}</div>
                        </div>
                        <div className={styles.summaryRow} role="row">
                            <div className={styles.summaryLabel} role="cell"><em>Less: Total Debt Repayment</em></div>
                            <div className={styles.summaryAmount} role="cell">{formatCurrency(totalDebtRepayment, true)}</div>
                        </div>
                        <div className={styles.summaryRow} role="row">
                            <div className={styles.summaryLabel} role="cell"><em>Less: Total Living Expenses</em></div>
                            <div className={styles.summaryAmount} role="cell">{formatCurrency(totalLivingExpenses, true)}</div>
                        </div>
                        <div className={styles.summaryRow} role="row">
                            <div className={styles.summaryLabel} role="cell"><em>Less: Total Planned Savings (from Net Income)</em></div>
                            <div className={styles.summaryAmount} role="cell">{formatCurrency(totalPlannedSavings, true)}</div>
                        </div>
                        <SummaryRow
                            label="NET MONTHLY SURPLUS/(DEFICIT)"
                            amount={formatCurrency(netMonthlySurplusDeficit, true)}
                            isTotal={true}
                            isDeficit={netMonthlySurplusDeficit < 0}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}