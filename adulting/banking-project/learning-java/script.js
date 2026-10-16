// Customer Class (JavaScript equivalent of banking/Customer.java)
class Customer {
    constructor(name) {
        this.name = name;
        this.address = null; // Initial address is null
    }

    setAddress(address) {
        this.address = address;
    }

    getName() {
        return this.name;
    }

    getAddress() {
        return this.address;
    }
}

// BankAccount Class (JavaScript equivalent of banking/BankAccount.java)
class BankAccount {
    constructor(accountType, customer) {
        this.accountType = accountType;
        this.customer = customer;
        this.balance = 0; // Starting balance
        this.fastCashAmount = 60; // Default fast cash amount
    }

    deposit(amount) {
        // Corrected logic: ensure amount is positive
        if (amount > 0) {
            this.balance += amount;
            return true;
        }
        return false; // Cannot deposit non-positive amount
    }

    withdraw(amount) {
        if (amount > this.balance) {
            throw new Error("Amount is greater than available balance.");
        }
        if (amount <= 0) {
            throw new Error("Cannot withdraw non-positive amount.");
        }
        this.balance -= amount;
        return true;
    }

    fastWithdraw() {
        return this.withdraw(this.fastCashAmount); // Reuses withdraw logic
    }

    setFastCashAmount(amount) {
        // Corrected logic: ensure amount is positive
        if (amount > 0) {
            this.fastCashAmount = amount;
            return true;
        }
        return false;
    }

    getAccountInfo() {
        return `${this.accountType}: ${this.balance.toFixed(2)}`; // Format to 2 decimal places
    }

    getCustomerInfo() {
        return `${this.customer.getName()} from ${this.customer.getAddress()}`;
    }
}

// Global variables for our bank system
let customer;
let checkingAccount;
let savingsAccount;

// Get references to HTML elements
const userNameInput = document.getElementById('userName');
const userAddressInput = document.getElementById('userAddress');
const createAccountBtn = document.getElementById('createAccountBtn');

const accountDisplaySection = document.querySelector('.account-display');
const transactionsSection = document.querySelector('.transactions');
const messagesSection = document.querySelector('.messages');

const displayCustomerName = document.getElementById('displayCustomerName');
const displayCustomerAddress = document.getElementById('displayCustomerAddress');
const displayCheckingBalance = document.getElementById('displayCheckingBalance');
const displaySavingsBalance = document.getElementById('displaySavingsBalance');

const depositAmountInput = document.getElementById('depositAmount');
const withdrawAmountInput = document.getElementById('withdrawAmount');

const depositCheckingBtn = document.getElementById('depositCheckingBtn');
const depositSavingsBtn = document.getElementById('depositSavingsBtn');
const withdrawCheckingBtn = document.getElementById('withdrawCheckingBtn');
const withdrawSavingsBtn = document.getElementById('withdrawSavingsBtn');
const fastWithdrawCheckingBtn = document.getElementById('fastWithdrawCheckingBtn');
const fastWithdrawSavingsBtn = document.getElementById('fastWithdrawSavingsBtn');

const messageDisplay = document.getElementById('messageDisplay');

// Function to update displayed account info
function updateAccountDisplay() {
    if (customer && checkingAccount && savingsAccount) {
        displayCustomerName.textContent = customer.getName();
        displayCustomerAddress.textContent = customer.getAddress();
        displayCheckingBalance.textContent = checkingAccount.balance.toFixed(2);
        displaySavingsBalance.textContent = savingsAccount.balance.toFixed(2);
    }
}

// Function to display messages to the user
function showMessage(message, type = 'success') {
    messageDisplay.textContent = message;
    messageDisplay.className = 'feedback-message ' + type; // Reset classes and add new type
    messagesSection.style.display = 'block'; // Ensure messages section is visible
}

// Event Listeners
createAccountBtn.addEventListener('click', () => {
    const name = userNameInput.value.trim();
    const address = userAddressInput.value.trim();

    if (name && address) {
        customer = new Customer(name);
        customer.setAddress(address);
        
        checkingAccount = new BankAccount("checking", customer);
        savingsAccount = new BankAccount("savings", customer);

        updateAccountDisplay();
        showMessage(`Hello ${name}! Your checking and savings accounts have been created.`);

        // Show relevant sections
        accountDisplaySection.style.display = 'block';
        transactionsSection.style.display = 'block';
        messagesSection.style.display = 'block';
    } else {
        showMessage("Please enter both your name and address.", "error");
    }
});

depositCheckingBtn.addEventListener('click', () => {
    const amount = parseFloat(depositAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        showMessage("Please enter a valid positive amount to deposit.", "error");
        return;
    }
    if (checkingAccount.deposit(amount)) {
        updateAccountDisplay();
        showMessage(`Successfully deposited $${amount.toFixed(2)} into checking account.`);
    } else {
        showMessage("Deposit failed. Amount must be positive.", "error");
    }
    depositAmountInput.value = ''; // Clear input
});

depositSavingsBtn.addEventListener('click', () => {
    const amount = parseFloat(depositAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        showMessage("Please enter a valid positive amount to deposit.", "error");
        return;
    }
    if (savingsAccount.deposit(amount)) {
        updateAccountDisplay();
        showMessage(`Successfully deposited $${amount.toFixed(2)} into savings account.`);
    } else {
        showMessage("Deposit failed. Amount must be positive.", "error");
    }
    depositAmountInput.value = ''; // Clear input
});

withdrawCheckingBtn.addEventListener('click', () => {
    const amount = parseFloat(withdrawAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        showMessage("Please enter a valid positive amount to withdraw.", "error");
        return;
    }
    try {
        checkingAccount.withdraw(amount);
        updateAccountDisplay();
        showMessage(`Successfully withdrew $${amount.toFixed(2)} from checking account.`);
    } catch (e) {
        showMessage(`Withdrawal failed: ${e.message}`, "error");
    }
    withdrawAmountInput.value = ''; // Clear input
});

withdrawSavingsBtn.addEventListener('click', () => {
    const amount = parseFloat(withdrawAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        showMessage("Please enter a valid positive amount to withdraw.", "error");
        return;
    }
    try {
        savingsAccount.withdraw(amount);
        updateAccountDisplay();
        showMessage(`Successfully withdrew $${amount.toFixed(2)} from savings account.`);
    } catch (e) {
        showMessage(`Withdrawal failed: ${e.message}`, "error");
    }
    withdrawAmountInput.value = ''; // Clear input
});

fastWithdrawCheckingBtn.addEventListener('click', () => {
    try {
        const amount = checkingAccount.fastCashAmount;
        checkingAccount.fastWithdraw();
        updateAccountDisplay();
        showMessage(`Successfully fast withdrew $${amount.toFixed(2)} from checking account.`);
    } catch (e) {
        showMessage(`Fast withdrawal failed from checking: ${e.message}`, "error");
    }
});

fastWithdrawSavingsBtn.addEventListener('click', () => {
    try {
        const amount = savingsAccount.fastCashAmount;
        savingsAccount.fastWithdraw();
        updateAccountDisplay();
        showMessage(`Successfully fast withdrew $${amount.toFixed(2)} from savings account.`);
    } catch (e) {
        showMessage(`Fast withdrawal failed from savings: ${e.message}`, "error");
    }
});