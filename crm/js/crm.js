// KRCKA CRM System JavaScript
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAhOboBWpkzHegBBXIwQBa6SWD7JoLJvUg",
    authDomain: "richardrccr-10a9d.firebaseapp.com",
    projectId: "richardrccr-10a9d",
    storageBucket: "richardrccr-10a9d.firebasestorage.app",
    messagingSenderId: "867270362103",
    appId: "1:867270362103:web:7653459445810350b864f2"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
// Removed: const auth = firebase.auth();

// Global Variables
let currentUser = null;
let clients = [];
let establishments = [];
let invoices = [];
let transactions = [];
let selectedEstablishments = {
    add: [],
    edit: []
};

// Removed: Variable to store the ID of the invoice currently being edited
// Removed: let currentEditingInvoiceId = null;

// DOM Elements
const loginSection = document.getElementById('login-section');
const crmContent = document.getElementById('crm-content');
const netlifyLoginButton = document.getElementById('netlify-login-button');
const logoutButton = document.getElementById('logout-button');
const messageDiv = document.getElementById('message');
const addInvoiceModalElement = document.getElementById('addInvoiceModal'); // Get modal element once

// Netlify Identity initialization and event listeners will be moved to DOMContentLoaded

// Utility Functions
function showMessage(type, text) {
    if (messageDiv) {
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

function clearMessage() {
    if (messageDiv) {
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }
}

function formatCurrency(amount) {
    return '$' + (amount != null ? Number(amount).toFixed(2) : '0.00');
}

function formatDate(date) {
    if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('en-US');
    } else if (date instanceof Date) {
        return date.toLocaleDateString('en-US');
    } else if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('en-US');
    }
    return 'N/A';
}

function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
}

// Authentication Functions
function updateUI(user) {
    currentUser = user;
    const isAdmin = user && user.app_metadata && user.app_metadata.roles && 
                   (user.app_metadata.roles.includes('admin') || user.app_metadata.roles.includes('manager'));

    console.log('updateUI called with user:', user, 'isAdmin:', isAdmin); // Debugging
    if (user && isAdmin) {
        loginSection.classList.add('hidden');
        crmContent.classList.remove('hidden');
        clearMessage();
        initializeCRM(); // Initialize CRM only for admins
    } else if (user) {
        showMessage('error', 'Admin access required for CRM system.');
        loginSection.classList.remove('hidden');
        crmContent.classList.add('hidden');
    } else {
        loginSection.classList.remove('hidden');
        crmContent.classList.add('hidden');
        clearMessage();
    }
}

// Event Listeners for Authentication
// These will also be moved inside DOMContentLoaded

// Netlify Identity Event Listeners
// These will also be moved inside DOMContentLoaded

// CRM Initialization
async function initializeCRM() {
    console.log('Initializing CRM...'); // Debugging
    try {
        await loadEstablishments();
        await loadClients(); // Ensure clients are loaded BEFORE dropdowns are populated
        await loadInvoices();
        await loadTransactions();
        updateQuickStats();
        populateDropdowns();
        setupEventListeners();
        // New: Call the processing function for pending invoice items here
        processPendingInvoiceItems();
        console.log('CRM initialized successfully.'); // Debugging
    } catch (error) {
        console.error('Error initializing CRM:', error);
        showMessage('error', 'Failed to initialize CRM system.');
    }
}

// Data Loading Functions
async function loadEstablishments() {
    try {
        const snapshot = await db.collection('establishments').get();
        establishments = [];
        snapshot.forEach(doc => {
            establishments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log('Loaded establishments:', establishments.length, establishments); // Debugging
    } catch (error) {
        console.error('Error loading establishments:', error);
        showMessage('error', 'Failed to load establishments.'); // User feedback
    }
}

async function loadClients() {
    try {
        const snapshot = await db.collection('clients').orderBy('companyName').get();
        clients = [];
        snapshot.forEach(doc => {
            clients.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log('Loaded clients:', clients.length, clients); // Debugging: Check if clients array has data
        displayClients(); // Display clients in table
    } catch (error) {
        console.error('Error loading clients:', error);
        showMessage('error', 'Failed to load clients.'); // User feedback
    }
}

async function loadInvoices() {
    try {
        const snapshot = await db.collection('invoices').orderBy('issueDate', 'desc').get();
        invoices = [];
        snapshot.forEach(doc => {
            invoices.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log('Loaded invoices:', invoices.length); // Debugging
        displayInvoices(); // Display invoices in table
    } catch (error) {
        console.error('Error loading invoices:', error);
        showMessage('error', 'Failed to load invoices.'); // User feedback
    }
}

async function loadTransactions() {
    try {
        const snapshot = await db.collection('transactions').orderBy('date', 'desc').get();
        transactions = [];
        snapshot.forEach(doc => {
            transactions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        displayPaidInvoices();
        displayTransactions();
    } catch (error) {
        console.error('Error loading transactions:', error);
        showMessage('error', 'Failed to load financial transactions.');
    }
}
// Display Functions
function displayClients() {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) return;

    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No clients found</td></tr>';
        return;
    }

    tbody.innerHTML = clients.map(client => {
        const establishmentBadges = client.establishments ? 
            client.establishments.map(estId => {
                const est = establishments.find(e => e.id === estId);
                return est ? `<span class="establishment-badge">${est.name}</span>` : '';
            }).join('') : '';

        const lastInvoice = invoices.filter(inv => inv.clientId === client.id)
            .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))[0];

        return `
            <tr>
                <td>
                    <strong><a href="client-overview.html?id=${client.id}" style="text-decoration:underline;cursor:pointer">${client.companyName}</a></strong><br>
                    <small class="text-muted">${client.contactPerson}</small>
                </td>
                <td>
                    <div>${client.email}</div>
                    <small class="text-muted">${client.phone || 'N/A'}</small>
                </td>
                <td>${establishmentBadges || '<span class="text-muted">None assigned</span>'}</td>
                <td><span class="status-badge status-${client.status}">${client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span></td>
                <td>${lastInvoice ? formatDate(lastInvoice.issueDate) : 'None'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="editClient('${client.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="window.location='client-overview.html?id=${client.id}'">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-success btn-sm" onclick="createInvoiceForClient('${client.id}')">
                            <i class="bi bi-receipt"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteClient('${client.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function displayInvoices() {
    const tbody = document.getElementById('invoices-table-body');
    if (!tbody) return;

    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No invoices found</td></tr>';
        return;
    }

    tbody.innerHTML = invoices.map(invoice => {
        const client = clients.find(c => c.id === invoice.clientId);
        const establishmentBadges = invoice.establishments ? 
            invoice.establishments.map(estId => {
                const est = establishments.find(e => e.id === estId);
                return est ? `<span class="establishment-badge">${est.name}</span>` : '';
            }).join('') : '';

        return `
            <tr>
                <td><strong>${invoice.invoiceNumber}</strong></td>
                <td>${client ? client.companyName : 'Unknown Client'}</td>
                <td>${establishmentBadges || '<span class="text-muted">None</span>'}</td>
                <td>${formatDate(invoice.issueDate)}</td>
                <td>${formatDate(invoice.dueDate)}</td>
                <td><strong>${formatCurrency(invoice.totalAmount)}</strong></td>
                <td><span class="status-badge status-${invoice.status}">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="editInvoice('${invoice.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="viewInvoice('${invoice.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="duplicateInvoice('${invoice.id}')">
                            <i class="bi bi-files"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteInvoice('${invoice.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function displayPaidInvoices() {
    const tbody = document.getElementById('paid-invoices-table-body');
    if (!tbody) return;

    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    document.getElementById('total-invoice-revenue').textContent = formatCurrency(totalRevenue);

    if (paidInvoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No paid invoices found.</td></tr>';
    } else {
        tbody.innerHTML = paidInvoices.map(inv => {
            const client = clients.find(c => c.id === inv.clientId);
            // Use the 'lastPayment.date' if available, otherwise fall back.
            const paidDate = inv.lastPayment?.date ? formatDate(inv.lastPayment.date) : 'N/A';
            return `
                <tr>
                    <td>${inv.invoiceNumber}</td>
                    <td>${client ? client.companyName : 'Unknown'}</td>
                    <td>${paidDate}</td>
                    <td>${formatCurrency(inv.totalAmount)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-outline-info btn-sm" onclick="viewInvoice('${inv.id}')" title="View Invoice">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function displayTransactions() {
    const tbody = document.getElementById('transactions-table-body');
    if (!tbody) return;

    let totalIncome = 0;
    let totalExpenses = 0;

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
    } else {
        tbody.innerHTML = transactions.map(tx => {
            const amount = tx.amount || 0;
            if (tx.type === 'income') {
                totalIncome += amount;
                return `
                    <tr>
                        <td>${formatDate(tx.date)}</td><td>${tx.description}</td><td>${tx.category}</td>
                        <td><span class="badge bg-success">Income</span></td>
                        <td><span class="badge bg-light text-dark">N/A</span></td>
                        <td>${formatCurrency(amount)}</td>
                        <td><div class="table-actions"><button class="btn btn-outline-primary btn-sm" onclick="editTransaction('${tx.id}')"><i class="bi bi-pencil"></i></button><button class="btn btn-outline-danger btn-sm" onclick="deleteTransaction('${tx.id}')"><i class="bi bi-trash"></i></button></div></td>
                    </tr>`;
            } else {
                totalExpenses += amount;
            }
            return `
                <tr>
                    <td>${formatDate(tx.date)}</td>
                    <td>${tx.description}</td>
                    <td>${tx.category}</td>
                    <td><span class="badge bg-danger">Expense</span></td>
                    <td><span class="badge ${tx.paid ? 'bg-info' : 'bg-warning text-dark'}">${tx.paid ? 'Paid' : 'Unpaid'}</span></td>                    <td>${formatCurrency(amount)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-outline-primary btn-sm" onclick="editTransaction('${tx.id}')"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteTransaction('${tx.id}')"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const netBalance = totalIncome - totalExpenses;
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('net-balance').textContent = formatCurrency(netBalance);

    const netBalanceEl = document.getElementById('net-balance');
    netBalanceEl.classList.toggle('text-danger', netBalance < 0);
    // The info card bg is sufficient, text color can be default

}

// Quick Stats Update
function updateQuickStats() {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const totalInvoices = invoices.length;
    const pendingAmount = invoices
        .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    document.getElementById('total-clients').textContent = totalClients;
    document.getElementById('active-clients').textContent = activeClients;
    document.getElementById('total-invoices').textContent = totalInvoices;
    document.getElementById('pending-payments').textContent = formatCurrency(pendingAmount);
}

// Establishment Multi-Select Functions
function toggleEstablishmentDropdown(mode) {
    const dropdown = document.getElementById(`${mode}-establishment-dropdown`);
    const isVisible = dropdown.style.display === 'block';
    
    // Hide all dropdowns first
    document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
    
    if (!isVisible) {
        populateEstablishmentDropdown(mode);
        dropdown.style.display = 'block';
    }
}

function populateEstablishmentDropdown(mode) {
    const dropdown = document.getElementById(`${mode}-establishment-dropdown`);
    dropdown.innerHTML = establishments.map(est => `
        <div class="multi-select-option ${selectedEstablishments[mode].includes(est.id) ? 'selected' : ''}" 
             onclick="toggleEstablishmentSelection('${mode}', '${est.id}', '${est.name}')">
            <input type="checkbox" ${selectedEstablishments[mode].includes(est.id) ? 'checked' : ''}> 
            ${est.name} - ${est.location}
        </div>
    `).join('');
}

function toggleEstablishmentSelection(mode, estId, estName) {
    const index = selectedEstablishments[mode].indexOf(estId);
    if (index > -1) {
        selectedEstablishments[mode].splice(index, 1);
    } else {
        selectedEstablishments[mode].push(estId);
    }
    
    updateSelectedEstablishmentsDisplay(mode);
    populateEstablishmentDropdown(mode); // Refresh dropdown
}

function updateSelectedEstablishmentsDisplay(mode) {
    const container = document.getElementById(`${mode}-selected-establishments`);
    container.innerHTML = selectedEstablishments[mode].map(estId => {
        const est = establishments.find(e => e.id === estId);
        return est ? `
            <span class="establishment-badge">
                ${est.name}
                <i class="bi bi-x" onclick="removeEstablishmentSelection('${mode}', '${estId}')" style="cursor: pointer; margin-left: 5px;"></i>
            </span>
        ` : '';
    }).join('');
}

function removeEstablishmentSelection(mode, estId) {
    const index = selectedEstablishments[mode].indexOf(estId);
    if (index > -1) {
        selectedEstablishments[mode].splice(index, 1);
        updateSelectedEstablishmentsDisplay(mode);
        populateEstablishmentDropdown(mode);
    }
}

// Populate Dropdowns
function populateDropdowns() {
    console.log('populateDropdowns called. Clients available:', clients.length); // Debugging: Confirm clients array size
    // Populate establishment filter
    const establishmentFilter = document.getElementById('establishment-filter');
    if (establishmentFilter) {
        establishmentFilter.innerHTML = '<option value="">All Establishments</option>' +
            establishments.map(est => `<option value="${est.id}">${est.name}</option>`).join('');
        console.log('Establishment filter populated.'); // Debugging
    }

    // Populate client dropdowns
    const clientSelects = ['add-invoice-client', 'invoice-client-filter'];
    clientSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            console.log(`Populating client select: ${selectId}`); // Debugging
            const currentValue = select.value;
            select.innerHTML = '<option value="">Choose a client...</option>' +
                clients.map(client => `<option value="${client.id}">${client.companyName}</option>`).join('');
            if (currentValue) select.value = currentValue; // Retain selection if applicable
            console.log(`Client select ${selectId} populated with ${clients.length} options.`); // Debugging
        } else {
            console.warn(`Client select element not found: ${selectId}`); // Debugging: Important for missing elements
        }
    });
}

// Event Listeners Setup
function setupEventListeners() {
    // Client form submission
    document.getElementById('add-client-form').addEventListener('submit', handleAddClient);
    document.getElementById('edit-client-form').addEventListener('submit', handleEditClient);
    document.getElementById('add-transaction-form').addEventListener('submit', handleAddTransaction);
    document.getElementById('transaction-type').addEventListener('change', function() {
        const paidContainer = document.getElementById('expense-paid-container');
        if (this.value === 'expense') {
            paidContainer.style.display = 'block';
        } else {
            paidContainer.style.display = 'none';
            document.getElementById('transaction-paid').checked = false;
        }
    });

    const downloadLedgerBtn = document.getElementById('download-ledger-pdf-btn');
    if (downloadLedgerBtn) {
        downloadLedgerBtn.addEventListener('click', downloadLedgerPDF);
    }
    const downloadRevenueBtn = document.getElementById('download-revenue-pdf-btn');
    if (downloadRevenueBtn) {
        downloadRevenueBtn.addEventListener('click', downloadRevenuePDF);
    }


    
    // Invoice form submission
    // We move the main invoice submission logic into a dedicated function for better control
    const addInvoiceForm = document.getElementById('add-invoice-form');
    if (addInvoiceForm) {
        addInvoiceForm.addEventListener('submit', handleAddInvoice);
    }
    
    // Search and filter inputs
    document.getElementById('client-search').addEventListener('input', filterClients);
    
    // Invoice calculation listeners
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-quantity') || 
            e.target.classList.contains('item-rate') ||
            e.target.id === 'add-invoice-tax-rate') {
            calculateInvoiceTotal();
        }
    });

    // Client selection change for invoice
    document.getElementById('add-invoice-client').addEventListener('change', function() {
        const clientId = this.value;
        if (clientId) {
            // Debugging: Check if this is being called
            console.log('Client selected:', clientId); 
            populateClientEstablishments(clientId);
            const client = clients.find(c => c.id === clientId);
            if (client && client.billingTerms) {
                const issueDate = new Date();
                const dueDate = new Date(issueDate);
                dueDate.setDate(dueDate.getDate() + client.billingTerms);
                document.getElementById('add-invoice-due-date').value = dueDate.toISOString().split('T')[0];
            }
        } else {
            // Clear establishments if "Choose a client..." is selected
            document.getElementById('add-invoice-establishments').innerHTML = '';
            // Reset due date if client is unselected
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('add-invoice-issue-date').value = today;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            document.getElementById('add-invoice-due-date').value = dueDate.toISOString().split('T')[0];
        }
    });

    // Auto-generate invoice number
    document.getElementById('add-invoice-number').value = generateInvoiceNumber();

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('add-invoice-issue-date').value = today;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('add-invoice-due-date').value = dueDate.toISOString().split('T')[0];

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.multi-select-container')) {
            document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
        }
    });

    // Event listener for the "Create Invoice" button
    const createNewInvoiceButton = document.getElementById('create-new-invoice-btn');
    if (createNewInvoiceButton) {
        createNewInvoiceButton.addEventListener('click', function() {
            resetInvoiceForm(); // Reset the form explicitly when the button is clicked
            // Bootstrap's data-bs-toggle="modal" handles showing the modal,
            // so we don't need new bootstrap.Modal().show() here for this button.
            // If the button didn't have data-bs-toggle, we would.
        });
    }

    // Event listener for modal hidden event - IMPORTANT for clearing state after edit/close
    const addInvoiceModal = document.getElementById('addInvoiceModal');
    if (addInvoiceModal) {
        addInvoiceModal.addEventListener('hidden.bs.modal', function () {
            resetInvoiceForm(); // Reset the form when the modal is closed (e.g., via X button or clicking outside)
        });
    }

    // Transaction Modal Cleanup
    const addTransactionModal = document.getElementById('addTransactionModal');
    if (addTransactionModal) {
        addTransactionModal.addEventListener('hidden.bs.modal', function () {
            resetTransactionForm();
        });
    }
}

// Client Management Functions
async function handleAddClient(e) {
    e.preventDefault();
    
    const clientData = {
        companyName: document.getElementById('add-client-name').value,
        contactPerson: document.getElementById('add-client-contact-person').value,
        email: document.getElementById('add-client-email').value,
        phone: document.getElementById('add-client-phone').value,
        address: document.getElementById('add-client-address').value,
        status: document.getElementById('add-client-status').value,
        billingTerms: parseInt(document.getElementById('add-client-billing-terms').value) || 30,
        establishments: selectedEstablishments.add,
        notes: document.getElementById('add-client-notes').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.email
    };

    try {
        await db.collection('clients').add(clientData);
        showMessage('success', 'Client added successfully!');
        
        // Reset form and close modal
        document.getElementById('add-client-form').reset();
        selectedEstablishments.add = [];
        updateSelectedEstablishmentsDisplay('add');
        bootstrap.Modal.getInstance(document.getElementById('addClientModal')).hide();
        
        // Reload data
        await loadClients();
        updateQuickStats();
        populateDropdowns();
    } catch (error) {
        console.error('Error adding client:', error);
        showMessage('error', 'Failed to add client. Please try again.');
    }
}

async function editClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Populate edit form
    document.getElementById('edit-client-id').value = clientId;
    document.getElementById('edit-client-name').value = client.companyName;
    document.getElementById('edit-client-contact-person').value = client.contactPerson;
    document.getElementById('edit-client-email').value = client.email;
    document.getElementById('edit-client-phone').value = client.phone || '';
    document.getElementById('edit-client-address').value = client.address || '';
    document.getElementById('edit-client-status').value = client.status;
    document.getElementById('edit-client-billing-terms').value = client.billingTerms || 30;
    document.getElementById('edit-client-notes').value = client.notes || '';
    
    // Set selected establishments
    selectedEstablishments.edit = client.establishments || [];
    updateSelectedEstablishmentsDisplay('edit');
    
    // Show modal
    new bootstrap.Modal(document.getElementById('editClientModal')).show();
}

async function handleEditClient(e) {
    e.preventDefault();
    
    const clientId = document.getElementById('edit-client-id').value;
    const clientData = {
        companyName: document.getElementById('edit-client-name').value,
        contactPerson: document.getElementById('edit-client-contact-person').value,
        email: document.getElementById('edit-client-email').value,
        phone: document.getElementById('edit-client-phone').value,
        address: document.getElementById('edit-client-address').value,
        status: document.getElementById('edit-client-status').value,
        billingTerms: parseInt(document.getElementById('edit-client-billing-terms').value) || 30,
        establishments: selectedEstablishments.edit,
        notes: document.getElementById('edit-client-notes').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.email
    };

    try {
        await db.collection('clients').doc(clientId).update(clientData);
        showMessage('success', 'Client updated successfully!');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('editClientModal')).hide();
        
        // Reload data
        await loadClients();
        updateQuickStats();
        populateDropdowns();
    } catch (error) {
        console.error('Error updating client:', error);
        showMessage('error', 'Failed to update client. Please try again.');
    }
}

async function handleAddTransaction(e) {
    e.preventDefault();
    const form = e.target;
    const transactionId = form.querySelector('#transaction-id').value;
    const isEditing = !!transactionId;

    const transactionData = {
        date: firebase.firestore.Timestamp.fromDate(new Date(form.querySelector('#transaction-date').value)),
        description: form.querySelector('#transaction-description').value,
        category: form.querySelector('#transaction-category').value,
        type: form.querySelector('#transaction-type').value,
        amount: parseFloat(form.querySelector('#transaction-amount').value),
    };

    if (transactionData.type === 'expense') {
        transactionData.paid = form.querySelector('#transaction-paid').checked;
    } else {
        delete transactionData.paid; // Ensure 'paid' field doesn't exist for income
    }

    try {
        if (isEditing) {
            await db.collection('transactions').doc(transactionId).update(transactionData);
            showMessage('success', 'Transaction updated successfully!');
        } else {
            await db.collection('transactions').add(transactionData);
            showMessage('success', 'Transaction added successfully!');
        }
        bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
        await loadTransactions();
    } catch (error) {
        console.error('Error saving transaction:', error);
        showMessage('error', 'Failed to save transaction.');
    }
}

function resetTransactionForm() {
    const form = document.getElementById('add-transaction-form');
    form.reset();
    form.querySelector('#transaction-id').value = '';
    document.getElementById('addTransactionModalLabel').textContent = 'Add Financial Transaction';
    form.querySelector('button[type="submit"]').textContent = 'Save Transaction';
    form.querySelector('#transaction-date').valueAsDate = new Date();
    document.getElementById('expense-paid-container').style.display = 'none';

}

function editTransaction(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const form = document.getElementById('add-transaction-form');
    form.querySelector('#transaction-id').value = id;
    form.querySelector('#transaction-date').value = tx.date.toDate().toISOString().split('T')[0];
    form.querySelector('#transaction-description').value = tx.description;
    form.querySelector('#transaction-category').value = tx.category;
    form.querySelector('#transaction-type').value = tx.type;
    form.querySelector('#transaction-amount').value = tx.amount;

    const paidContainer = document.getElementById('expense-paid-container');
    const paidCheckbox = document.getElementById('transaction-paid');
    if (tx.type === 'expense') {
        paidContainer.style.display = 'block';
        paidCheckbox.checked = !!tx.paid;
    } else {
        paidContainer.style.display = 'none';
        paidCheckbox.checked = false;
    }

    document.getElementById('addTransactionModalLabel').textContent = 'Edit Financial Transaction';
    form.querySelector('button[type="submit"]').textContent = 'Update Transaction';

    new bootstrap.Modal(document.getElementById('addTransactionModal')).show();
}

async function deleteTransaction(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (confirm(`Are you sure you want to delete the transaction: "${tx.description}"?`)) {
        try {
            await db.collection('transactions').doc(id).delete();
            showMessage('success', 'Transaction deleted successfully.');
            await loadTransactions();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showMessage('error', 'Failed to delete transaction.');
        }
    }
}

async function downloadRevenuePDF() {
    const revenueContent = document.getElementById('revenue-content-to-export');
    const downloadBtn = document.getElementById('download-revenue-pdf-btn');
    if (!revenueContent || !downloadBtn) {
        showMessage('error', 'Could not find content to export.');
        return;
    }

    // Temporarily hide action buttons for a cleaner PDF
    const actions = revenueContent.querySelectorAll('.table-actions');
    actions.forEach(el => el.style.display = 'none');
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Generating...';

    // Add a temporary header for the PDF
    const header = document.createElement('div');
    header.className = 'mb-4 text-center';
    header.innerHTML = `
        <h3>KRCKA - Official Revenue Report</h3>
        <p>Generated on: ${new Date().toLocaleDateString('en-US')}</p>
        <hr>
    `;
    revenueContent.prepend(header);

    try {
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(revenueContent, {
            scale: 2,
            useCORS: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;

        let finalWidth = pdfWidth - 40; // Add some margin
        let finalHeight = finalWidth / canvasAspectRatio;

        pdf.addImage(imgData, 'PNG', 20, 20, finalWidth, finalHeight);
        pdf.save(`KRCKA_Revenue_Report_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        showMessage('error', 'Failed to generate PDF.');
    } finally {
        // Restore the UI
        actions.forEach(el => el.style.display = 'flex');
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="bi bi-download"></i> Download PDF';
        header.remove(); // Remove the temporary header
    }
}

async function downloadLedgerPDF() {
    const ledgerContent = document.getElementById('ledger-content-to-export');
    const downloadBtn = document.getElementById('download-ledger-pdf-btn');
    if (!ledgerContent || !downloadBtn) {
        showMessage('error', 'Could not find content to export.');
        return;
    }

    // Temporarily hide action buttons for a cleaner PDF
    const actions = ledgerContent.querySelectorAll('.table-actions');
    actions.forEach(el => el.style.display = 'none');
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Generating...';

    // Add a temporary header for the PDF
    const header = document.createElement('div');
    header.className = 'mb-4 text-center';
    header.innerHTML = `
        <h3>KRCKA - Official Account Ledger</h3>
        <p>Generated on: ${new Date().toLocaleDateString('en-US')}</p>
        <hr>
    `;
    ledgerContent.prepend(header);
    try {
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(ledgerContent, {
            scale: 2, // Higher scale for better resolution
            useCORS: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        const pdfAspectRatio = pdfWidth / pdfHeight;
        let finalWidth, finalHeight;
        finalWidth = pdfWidth - 40; // Add some margin
        finalHeight = finalWidth / canvasAspectRatio;

        pdf.addImage(imgData, 'PNG', 20, 20, finalWidth, finalHeight);
        pdf.save(`KRCKA_Account_Ledger_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        showMessage('error', 'Failed to generate PDF.');
    } finally {
        // Restore the UI
        actions.forEach(el => el.style.display = 'flex');
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="bi bi-download"></i> Download PDF';
        header.remove(); // Remove the temporary header
    }
}

// Invoice Management Functions
function populateClientEstablishments(clientId) {
    const client = clients.find(c => c.id === clientId);
    const container = document.getElementById('add-invoice-establishments');
    container.innerHTML = '';

    if (!client || !client.establishments || client.establishments.length === 0) {
        container.innerHTML = '<p class="text-muted">No establishments assigned to this client.</p>';
        return;
    }

    client.establishments.forEach(estId => {
        const est = establishments.find(e => e.id === estId);
        if (est) {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${est.id}" id="est-${est.id}">
                <label class="form-check-label" for="est-${est.id}">
                    ${est.name} - ${est.location}
                </label>
            `;
            container.appendChild(div);
        }
    });
}

function addInvoiceItem() {
    const container = document.getElementById('add-invoice-items');
    const itemRow = document.createElement('div');
    itemRow.className = 'row mb-2 invoice-item-row';
    itemRow.innerHTML = `
        <div class="col-md-4">
            <input type="text" class="form-control item-description" placeholder="Description">
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control item-quantity" placeholder="Qty" value="1" step="0.01">
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control item-rate" placeholder="Rate" step="0.01" min="0">
        </div>
        <div class="col-md-2">
            <input type="text" class="form-control item-total" placeholder="Total" readonly>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-outline-danger btn-sm remove-item" onclick="removeInvoiceItem(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(itemRow);

    // Attach input listeners for real-time calculation
    itemRow.querySelector('.item-quantity').addEventListener('input', calculateInvoiceTotal);
    itemRow.querySelector('.item-rate').addEventListener('input', calculateInvoiceTotal);

    calculateInvoiceTotal();
}

function removeInvoiceItem(button) {
    button.closest('.invoice-item-row').remove();
    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    let subtotal = 0;
    
    document.querySelectorAll('.invoice-item-row').forEach(row => {
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
        const total = quantity * rate;
        
        row.querySelector('.item-total').value = formatCurrency(total);
        subtotal += total;
    });
    
    const taxRate = parseFloat(document.getElementById('add-invoice-tax-rate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    document.getElementById('add-invoice-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('add-invoice-tax-amount').textContent = formatCurrency(taxAmount);
    document.getElementById('add-invoice-total').textContent = formatCurrency(total);
}

async function handleAddInvoice(e) {
    e.preventDefault();
    
    const form = e.target;
    const invoiceId = form.getAttribute('data-invoice-id');
    const isEditing = !!invoiceId;
    
    const clientId = document.getElementById('add-invoice-client').value;
    const selectedEstablishments = Array.from(document.querySelectorAll('#add-invoice-establishments input:checked'))
        .map(cb => cb.value);
    
    // Collect invoice items
    const items = [];
    const logIdsToUpdate = []; // Collect IDs here from the modal's hidden inputs

    document.querySelectorAll('.invoice-item-row').forEach(row => {
        const description = row.querySelector('.item-description').value;
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
        const mashgiachLogIdInput = row.querySelector('.mashgiach-log-id');

        if (description && quantity > 0 && rate >= 0) {
            const item = {
                description,
                quantity,
                rate,
                total: quantity * rate
            };
            if (mashgiachLogIdInput) {
                item.mashgiachLogId = mashgiachLogIdInput.value;
                logIdsToUpdate.push(mashgiachLogIdInput.value);
            }
            items.push(item);
        }
    });
    
    if (items.length === 0) {
        showMessage('error', 'Please add at least one invoice item.');
        return;
    }
    
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = parseFloat(document.getElementById('add-invoice-tax-rate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;
    
    const invoiceData = {
        invoiceNumber: document.getElementById('add-invoice-number').value,
        clientId: clientId,
        clientEmail: clients.find(c => c.id === clientId)?.email,
        establishments: selectedEstablishments,
        issueDate: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('add-invoice-issue-date').value)),
        dueDate: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('add-invoice-due-date').value)),
        status: document.getElementById('add-invoice-status').value,
        items: items,
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        totalAmount: totalAmount
    };

    if (isEditing) {
        invoiceData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        invoiceData.updatedBy = currentUser.email;
    } else {
        invoiceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        invoiceData.createdBy = currentUser.email;
    }

    try {
        if (isEditing) {
            await db.collection('invoices').doc(invoiceId).update(invoiceData);
            showMessage('success', 'Invoice updated successfully!');
            console.log(`Invoice updated: ${invoiceData.invoiceNumber}`);
        } else {
            const docRef = await db.collection('invoices').add(invoiceData);
            showMessage('success', 'Invoice created successfully!');
            console.log(`Invoice created: ${invoiceData.invoiceNumber}, ID: ${docRef.id}`);

            // Mark mashgiach logs as billed if they were part of this invoice creation
            if (logIdsToUpdate.length > 0) {
                await markLogsAsBilled(logIdsToUpdate);
            }
        }
        
        // Reset form and close modal
        resetInvoiceForm();
        bootstrap.Modal.getInstance(document.getElementById('addInvoiceModal')).hide();
        
        // Reload data
        await loadInvoices();
        updateQuickStats();
    } catch (error) {
        console.error('Error saving invoice:', error);
        showMessage('error', `Failed to ${isEditing ? 'update' : 'create'} invoice. Please try again.`);
    }
}

// Reset invoice form function
function resetInvoiceForm() {
    document.getElementById('add-invoice-form').reset();
    document.getElementById('add-invoice-form').removeAttribute('data-invoice-id'); // Ensure this is present to clear ID
    document.getElementById('addInvoiceModalLabel').textContent = 'Create New Invoice';
    const submitButton = document.querySelector('#add-invoice-form button[type="submit"]');
    submitButton.textContent = 'Create Invoice';
    submitButton.className = 'btn btn-success';
    
    // Reset items container to a single empty row
    document.getElementById('add-invoice-items').innerHTML = `
        <div class="row mb-2 invoice-item-row">
            <div class="col-md-4">
                <input type="text" class="form-control item-description" placeholder="Description">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control item-quantity" placeholder="Qty" value="1" step="0.01">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control item-rate" placeholder="Rate" step="0.01" min="0">
            </div>
            <div class="col-md-2">
                <input type="text" class="form-control item-total" placeholder="Total" readonly>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-outline-danger btn-sm remove-item" onclick="removeInvoiceItem(this)">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    calculateInvoiceTotal();
    
    // Set default values for new invoice
    document.getElementById('add-invoice-number').value = generateInvoiceNumber();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('add-invoice-issue-date').value = today;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('add-invoice-due-date').value = dueDate.toISOString().split('T')[0];
    document.getElementById('add-invoice-status').value = 'draft'; // Ensure status defaults
    document.getElementById('add-invoice-client').value = ''; // Ensure client dropdown resets
    document.getElementById('add-invoice-establishments').innerHTML = ''; // Clear client establishments
    document.getElementById('add-invoice-tax-rate').value = '0'; // Reset tax rate
}

// Enhanced Invoice Editing Function
async function editInvoice(invoiceId) {
    // It's important NOT to call resetInvoiceForm() here as we want to populate with existing data
    // However, we should still clear itemsContainer before populating
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // Populate edit invoice form (reuse add invoice modal)
    document.getElementById('add-invoice-client').value = invoice.clientId || '';
    document.getElementById('add-invoice-number').value = invoice.invoiceNumber || '';
    document.getElementById('add-invoice-issue-date').value = invoice.issueDate ? 
        (invoice.issueDate.toDate ? invoice.issueDate.toDate().toISOString().split('T')[0] : 
         new Date(invoice.issueDate).toISOString().split('T')[0]) : '';
    document.getElementById('add-invoice-due-date').value = invoice.dueDate ? 
        (invoice.dueDate.toDate ? invoice.dueDate.toDate().toISOString().split('T')[0] : 
         new Date(invoice.dueDate).toISOString().split('T')[0]) : '';
    document.getElementById('add-invoice-status').value = invoice.status || 'draft';

    // Populate establishments related to the client, then mark invoice-specific ones
    if (invoice.clientId) {
        populateClientEstablishments(invoice.clientId);
        // This timeout ensures DOM is updated before trying to check checkboxes
        // This is where establishments from the specific invoice are marked 'checked'
        setTimeout(() => {
            if (invoice.establishments) {
                invoice.establishments.forEach(estId => {
                    const checkbox = document.querySelector(`#add-invoice-establishments input[value="${estId}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        console.log(`Checked establishment: ${estId}`); // Debugging
                    } else {
                        console.warn(`Checkbox for establishment ID ${estId} not found during edit.`); // Debugging
                    }
                });
            }
        }, 100); // Small delay to ensure DOM update
    }

    // Populate items
    const itemsContainer = document.getElementById('add-invoice-items');
    itemsContainer.innerHTML = ''; // Clear existing items BEFORE populating with invoice items

    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'row mb-2 invoice-item-row';
            itemRow.innerHTML = `
                <div class="col-md-4">
                    <input type="text" class="form-control item-description" placeholder="Description" value="${item.description || ''}">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-quantity" placeholder="Qty" value="${item.quantity || 1}" step="0.01">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-rate" placeholder="Rate" step="0.01" min="0" value="${item.rate || 0}">
                </div>
                <div class="col-md-2">
                    <input type="text" class="form-control item-total" placeholder="Total" readonly value="${formatCurrency(item.total || 0)}">
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-outline-danger btn-sm remove-item" onclick="removeInvoiceItem(this)">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                ${item.mashgiachLogId ? `<input type="hidden" class="mashgiach-log-id" value="${item.mashgiachLogId}">` : ''}
            `;
            itemsContainer.appendChild(itemRow);
        });
    } else {
        addInvoiceItem(); // Add a default empty row if no items in the invoice
    }

    // Set tax rate and calculate totals
    document.getElementById('add-invoice-tax-rate').value = invoice.taxRate || 0;
    calculateInvoiceTotal();

    // Change modal title and button text for editing
    document.getElementById('addInvoiceModalLabel').textContent = 'Edit Invoice';
    const submitButton = document.querySelector('#add-invoice-form button[type="submit"]');
    submitButton.textContent = 'Update Invoice';
    submitButton.className = 'btn btn-primary';

    // Store invoice ID for update
    document.getElementById('add-invoice-form').setAttribute('data-invoice-id', invoiceId);

    new bootstrap.Modal(document.getElementById('addInvoiceModal')).show(); // Show the modal
}

// Function to call when "Create Invoice For Client" is clicked from client table
function createInvoiceForClient(clientId) {
    resetInvoiceForm(); // Reset form first for a clean slate
    
    // Pre-select the client in the invoice modal
    document.getElementById('add-invoice-client').value = clientId;
    populateClientEstablishments(clientId);
    
    // Set due date based on client's billing terms
    const client = clients.find(c => c.id === clientId);
    if (client && client.billingTerms) {
        const issueDate = new Date();
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + client.billingTerms);
        document.getElementById('add-invoice-due-date').value = dueDate.toISOString().split('T')[0];
    }
    
    new bootstrap.Modal(document.getElementById('addInvoiceModal')).show();
}

function viewInvoice(invoiceId) {
    // Open the invoice in a print/view format
    window.open(`invoice-print.html?id=${invoiceId}`, '_blank');
}

function duplicateInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    // Reset form first
    resetInvoiceForm();
    
    // Pre-populate the add invoice form with existing data
    document.getElementById('add-invoice-client').value = invoice.clientId;
    document.getElementById('add-invoice-number').value = generateInvoiceNumber();
    
    // Set dates to today and due date based on client terms
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('add-invoice-issue-date').value = today;
    
    const client = clients.find(c => c.id === invoice.clientId);
    if (client && client.billingTerms) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + client.billingTerms);
        document.getElementById('add-invoice-due-date').value = dueDate.toISOString().split('T')[0];
    }
    
    // Populate items
    const itemsContainer = document.getElementById('add-invoice-items');
    itemsContainer.innerHTML = '';
    
    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'row mb-2 invoice-item-row';
            itemRow.innerHTML = `
                <div class="col-md-4">
                    <input type="text" class="form-control item-description" placeholder="Description" value="${item.description}">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-quantity" placeholder="Qty" value="${item.quantity}" step="0.01">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-rate" placeholder="Rate" step="0.01" min="0" value="${item.rate}">
                </div>
                <div class="col-md-2">
                    <input type="text" class="form-control item-total" placeholder="Total" readonly value="${formatCurrency(item.total)}">
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-outline-danger btn-sm remove-item" onclick="removeInvoiceItem(this)">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                ${item.mashgiachLogId ? `<input type="hidden" class="mashgiach-log-id" value="${item.mashgiachLogId}">` : ''}
            `;
            itemsContainer.appendChild(itemRow);
        });
    }
    
    // Set tax rate and calculate totals
    document.getElementById('add-invoice-tax-rate').value = invoice.taxRate || 0;
    calculateInvoiceTotal();
    
    // Populate establishments
    populateClientEstablishments(invoice.clientId);
    setTimeout(() => {
        if (invoice.establishments) {
            invoice.establishments.forEach(estId => {
                const checkbox = document.querySelector(`#add-invoice-establishments input[value="${estId}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }, 100);
    
    new bootstrap.Modal(document.getElementById('addInvoiceModal')).show();
}

async function deleteInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    if (!confirm(`Are you sure you want to delete invoice "${invoice.invoiceNumber}"?\n\nThis action cannot be undone.`)) return;

    try {
        await db.collection('invoices').doc(invoiceId).delete();
        showMessage('success', 'Invoice deleted successfully!');
        
        // Reload data
        await loadInvoices();
        updateQuickStats();
        
        console.log(`Invoice deleted: ${invoice.invoiceNumber}`);
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showMessage('error', 'Failed to delete invoice. Please try again.');
    }
}

async function deleteClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    if (!confirm(`Are you sure you want to delete client "${client.companyName}"?\n\nThis action cannot be undone.`)) return;

    try {
        await db.collection('clients').doc(clientId).delete();
        showMessage('success', 'Client deleted successfully!');

        // Reload data
        await loadClients();
        updateQuickStats();
        populateDropdowns();
    } catch (error) {
        console.error('Error deleting client:', error);
        showMessage('error', 'Failed to delete client. Please try again.');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const currentUser = netlifyIdentity.currentUser();
    if (currentUser) {
        updateUI(currentUser);
    }
    
    // Handle Netlify Identity events
    netlifyIdentity.on('init', updateUI);
    netlifyIdentity.on('login', updateUI);
    netlifyIdentity.on('logout', function() {
        document.body.innerHTML = '<div class="container my-5"><div class="alert alert-warning">Logged out. Admin privileges required.</div><button class="btn btn-primary" onclick="netlifyIdentity.open()">Login</button></div>';
    });
});

// Mashgiach Logs Integration Functions (from index.html inline script, moved here for better organization)
const mashgiachLogRef = db.collection('mashgiach-logs');
const MASHGIACH_HOURLY_RATE = 50.00;

async function processPendingInvoiceItems() {
    const pendingInvoiceItemsJson = sessionStorage.getItem('pendingInvoiceItems');
    const pendingInvoiceClientId = sessionStorage.getItem('pendingInvoiceClientId');
    const urlParams = new URLSearchParams(window.location.search);
    const openInvoiceModal = urlParams.get('openInvoiceModal') === 'true';

    if (pendingInvoiceItemsJson && pendingInvoiceClientId && openInvoiceModal) {
        const invoiceItems = JSON.parse(pendingInvoiceItemsJson);
        
        // Clear session storage immediately after reading to prevent re-processing
        sessionStorage.removeItem('pendingInvoiceItems');
        sessionStorage.removeItem('pendingInvoiceClientId');

        const addInvoiceModalEl = document.getElementById('addInvoiceModal');
        const addInvoiceModalInstance = bootstrap.Modal.getInstance(addInvoiceModalEl) || new bootstrap.Modal(addInvoiceModalEl);

        // Pre-fill client dropdown
        const addInvoiceClientSelect = document.getElementById('add-invoice-client');
        if (addInvoiceClientSelect) {
            addInvoiceClientSelect.value = pendingInvoiceClientId;
            // Manually trigger change to populate establishments and set due date
            addInvoiceClientSelect.dispatchEvent(new Event('change'));
        }

        // Clear existing items in the modal (e.g., if there's a default empty row)
        const addInvoiceItemsContainer = document.getElementById('add-invoice-items');
        addInvoiceItemsContainer.innerHTML = ''; 

        invoiceItems.forEach(item => {
            const newRow = document.createElement('div');
            newRow.classList.add('row', 'mb-2', 'invoice-item-row');
            newRow.innerHTML = `
                <div class="col-md-4">
                    <input type="text" class="form-control item-description" placeholder="Description" value="${item.description}" required>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-quantity" placeholder="Qty" value="${item.quantity}" step="0.01" required>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-rate" placeholder="Rate" step="0.01" value="${item.unitPrice}" required>
                </div>
                <div class="col-md-2">
                    <input type="text" class="form-control item-total" placeholder="Total" readonly value="${(item.quantity * item.unitPrice).toFixed(2)}">
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-outline-danger btn-sm remove-item">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                ${item.mashgiachLogId ? `<input type="hidden" class="mashgiach-log-id" value="${item.mashgiachLogId}">` : ''}
            `;
            addInvoiceItemsContainer.appendChild(newRow);
            
            // Add event listeners for new row's inputs to recalculate totals
            const qtyInput = newRow.querySelector('.item-quantity');
            const rateInput = newRow.querySelector('.item-rate');
            const removeButton = newRow.querySelector('.remove-item');

            const updateItemTotal = () => {
                const q = parseFloat(qtyInput.value) || 0;
                const r = parseFloat(rateInput.value) || 0;
                newRow.querySelector('.item-total').value = (q * r).toFixed(2);
                calculateInvoiceTotal(); 
            };

            qtyInput.addEventListener('input', updateItemTotal);
            rateInput.addEventListener('input', updateItemTotal);
            removeButton.addEventListener('click', () => {
                newRow.remove();
                calculateInvoiceTotal(); 
            });
        });

        calculateInvoiceTotal(); 
        
        // Show success message
        showMessage('success', `Invoice pre-populated with ${invoiceItems.length} mashgiach log entries`);
        
        // Open the modal
        addInvoiceModalInstance.show();

        // Also switch to billing tab if the URL parameter requested it
        const targetTab = urlParams.get('tab');
        if (targetTab) {
            const tabElement = document.getElementById(`${targetTab}-tab`);
            if (tabElement) {
                const tab = new bootstrap.Tab(tabElement);
                tab.show();
            }
        }
    }
}

async function markLogsAsBilled(logIds) {
    try {
        const batch = db.batch();
        
        logIds.forEach(logId => {
            const logRef = db.collection('mashgiach-logs').doc(logId);
            batch.update(logRef, {
                billingStatus: 'billed',
                billedAt: firebase.firestore.FieldValue.serverTimestamp(),
                billedBy: currentUser.email
            });
        });
        
        await batch.commit();
        console.log('Mashgiach logs marked as billed:', logIds);
    } catch (error) {
        console.error('Error marking logs as billed:', error);
    }
}

function filterClients() {
    const searchTerm = document.getElementById('client-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    const establishmentFilter = document.getElementById('establishment-filter').value;
    
    let filteredClients = clients;
    
    if (searchTerm) {
        filteredClients = filteredClients.filter(client => 
            client.companyName.toLowerCase().includes(searchTerm) ||
            client.contactPerson.toLowerCase().includes(searchTerm) ||
            client.email.toLowerCase().includes(searchTerm)
        );
    }
    
    if (statusFilter) {
        filteredClients = filteredClients.filter(client => client.status === statusFilter);
    }
    
    if (establishmentFilter) {
        filteredClients = filteredClients.filter(client => 
            client.establishments && client.establishments.includes(establishmentFilter)
        );
    }
    
    // Temporarily update clients array for display
    const originalClients = clients;
    clients = filteredClients;
    displayClients();
    clients = originalClients;
}

// Invoice filtering (new function)
function filterInvoices() {
    const clientFilter = document.getElementById('invoice-client-filter').value;
    const statusFilter = document.getElementById('invoice-status-filter').value;
    const dateFrom = document.getElementById('invoice-date-from').value;
    const dateTo = document.getElementById('invoice-date-to').value;

    let filteredInvoices = invoices;

    if (clientFilter) {
        filteredInvoices = filteredInvoices.filter(inv => inv.clientId === clientFilter);
    }

    if (statusFilter) {
        filteredInvoices = filteredInvoices.filter(inv => inv.status === statusFilter);
    }

    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredInvoices = filteredInvoices.filter(inv => {
            const issueDate = inv.issueDate.toDate ? inv.issueDate.toDate() : new Date(inv.issueDate);
            return issueDate >= fromDate;
        });
    }

    if (dateTo) {
        const toDate = new Date(dateTo);
        filteredInvoices = filteredInvoices.filter(inv => {
            const issueDate = inv.issueDate.toDate ? inv.issueDate.toDate() : new Date(inv.issueDate);
            return issueDate <= toDate;
        });
    }

    const tbody = document.getElementById('invoices-table-body');
    if (!tbody) return;

    if (filteredInvoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No invoices found matching criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredInvoices.map(invoice => {
        const client = clients.find(c => c.id === invoice.clientId);
        const establishmentBadges = invoice.establishments ? 
            invoice.establishments.map(estId => {
                const est = establishments.find(e => e.id === estId);
                return est ? `<span class="establishment-badge">${est.name}</span>` : '';
            }).join('') : '';

        return `
            <tr>
                <td><strong>${invoice.invoiceNumber}</strong></td>
                <td>${client ? client.companyName : 'Unknown Client'}</td>
                <td>${establishmentBadges || '<span class="text-muted">None</span>'}</td>
                <td>${formatDate(invoice.issueDate)}</td>
                <td>${formatDate(invoice.dueDate)}</td>
                <td><strong>${formatCurrency(invoice.totalAmount)}</strong></td>
                <td><span class="status-badge status-${invoice.status}">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="editInvoice('${invoice.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="viewInvoice('${invoice.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="duplicateInvoice('${invoice.id}')">
                            <i class="bi bi-files"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteInvoice('${invoice.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}