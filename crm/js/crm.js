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

// Global Variables
let currentUser = null;
let clients = [];
let establishments = [];
let invoices = [];
let selectedEstablishments = {
    add: [],
    edit: []
};

// DOM Elements
const loginSection = document.getElementById('login-section');
const crmContent = document.getElementById('crm-content');
const netlifyLoginButton = document.getElementById('netlify-login-button');
const logoutButton = document.getElementById('logout-button');
const messageDiv = document.getElementById('message');

// Initialize Netlify Identity
const netlifyIdentity = window.netlifyIdentity;
if (netlifyIdentity) {
    netlifyIdentity.init();
} else {
    console.error("Netlify Identity widget not loaded.");
    showMessage('error', 'Authentication service failed to load.');
}

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

    if (user && isAdmin) {
        loginSection.classList.add('hidden');
        crmContent.classList.remove('hidden');
        clearMessage();
        initializeCRM();
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
if (netlifyLoginButton) {
    netlifyLoginButton.addEventListener('click', () => {
        netlifyIdentity.open();
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        netlifyIdentity.logout();
    });
}

// Netlify Identity Event Listeners
netlifyIdentity.on('login', user => {
    console.log('Login event triggered:', user);
    updateUI(user);
    netlifyIdentity.close();
});

netlifyIdentity.on('logout', () => {
    console.log('Logout event triggered');
    updateUI(null);
});

netlifyIdentity.on('init', user => {
    console.log('Init event triggered:', user);
    updateUI(user);
});

// CRM Initialization
async function initializeCRM() {
    try {
        await loadEstablishments();
        await loadClients();
        await loadInvoices();
        updateQuickStats();
        setupEventListeners();
        populateDropdowns();
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
        console.log('Loaded establishments:', establishments.length);
    } catch (error) {
        console.error('Error loading establishments:', error);
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
        displayClients();
        console.log('Loaded clients:', clients.length);
    } catch (error) {
        console.error('Error loading clients:', error);
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
        displayInvoices();
        console.log('Loaded invoices:', invoices.length);
    } catch (error) {
        console.error('Error loading invoices:', error);
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
                    <strong>${client.companyName}</strong><br>
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
                        <button class="btn btn-outline-info btn-sm" onclick="viewClientDetails('${client.id}')">
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
    // Populate establishment filter
    const establishmentFilter = document.getElementById('establishment-filter');
    if (establishmentFilter) {
        establishmentFilter.innerHTML = '<option value="">All Establishments</option>' +
            establishments.map(est => `<option value="${est.id}">${est.name}</option>`).join('');
    }

    // Populate client dropdowns
    const clientSelects = ['add-invoice-client', 'invoice-client-filter'];
    clientSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Choose a client...</option>' +
                clients.map(client => `<option value="${client.id}">${client.companyName}</option>`).join('');
            if (currentValue) select.value = currentValue;
        }
    });
}

// Event Listeners Setup
function setupEventListeners() {
    // Client form submission
    document.getElementById('add-client-form').addEventListener('submit', handleAddClient);
    document.getElementById('edit-client-form').addEventListener('submit', handleEditClient);
    
    // Invoice form submission
    document.getElementById('add-invoice-form').addEventListener('submit', handleAddInvoice);
    
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
            populateClientEstablishments(clientId);
            const client = clients.find(c => c.id === clientId);
            if (client && client.billingTerms) {
                const issueDate = new Date();
                const dueDate = new Date(issueDate);
                dueDate.setDate(dueDate.getDate() + client.billingTerms);
                document.getElementById('add-invoice-due-date').value = dueDate.toISOString().split('T')[0];
            }
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

// Invoice Management Functions
function populateClientEstablishments(clientId) {
    const client = clients.find(c => c.id === clientId);
    const container = document.getElementById('add-invoice-establishments');
    
    if (!client || !client.establishments || client.establishments.length === 0) {
        container.innerHTML = '<p class="text-muted">No establishments assigned to this client.</p>';
        return;
    }

    container.innerHTML = client.establishments.map(estId => {
        const est = establishments.find(e => e.id === estId);
        return est ? `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${estId}" id="est-${estId}" checked>
                <label class="form-check-label" for="est-${estId}">
                    ${est.name} - ${est.location}
                </label>
            </div>
        ` : '';
    }).join('');
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
            <input type="number" class="form-control item-quantity" placeholder="Qty" value="1" min="1">
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
    
    const clientId = document.getElementById('add-invoice-client').value;
    const selectedEstablishments = Array.from(document.querySelectorAll('#add-invoice-establishments input:checked'))
        .map(cb => cb.value);
    
    // Collect invoice items
    const items = [];
    document.querySelectorAll('.invoice-item-row').forEach(row => {
        const description = row.querySelector('.item-description').value;
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
        
        if (description && quantity > 0 && rate >= 0) {
            items.push({
                description,
                quantity,
                rate,
                total: quantity * rate
            });
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
        totalAmount: totalAmount,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.email
    };

    try {
        await db.collection('invoices').add(invoiceData);
        showMessage('success', 'Invoice created successfully!');
        
        // Reset form and close modal
        document.getElementById('add-invoice-form').reset();
        document.getElementById('add-invoice-items').innerHTML = `
            <div class="row mb-2 invoice-item-row">
                <div class="col-md-4">
                    <input type="text" class="form-control item-description" placeholder="Description">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-quantity" placeholder="Qty" value="1" min="1">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-rate" placeholder="Rate" step="0.01" min="0">
                </div>
                <div class="col-md-2">
                    <input type="text" class="form-control item-total" placeholder="Total" readonly>
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-outline-danger btn-sm remove-item">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        calculateInvoiceTotal();
        bootstrap.Modal.getInstance(document.getElementById('addInvoiceModal')).hide();
        
        // Reload data
        await loadInvoices();
        updateQuickStats();
    } catch (error) {
        console.error('Error creating invoice:', error);
        showMessage('error', 'Failed to create invoice. Please try again.');
    }
}

// Filter Functions
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

function filterInvoices() {
    const clientFilter = document.getElementById('invoice-client-filter').value;
    const statusFilter = document.getElementById('invoice-status-filter').value;
    const dateFrom = document.getElementById('invoice-date-from').value;
    const dateTo = document.getElementById('invoice-date-to').value;
    
    let filteredInvoices = invoices;
    
    if (clientFilter) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.clientId === clientFilter);
    }
    
    if (statusFilter) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.status === statusFilter);
    }
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredInvoices = filteredInvoices.filter(invoice => {
            const invoiceDate = invoice.issueDate.toDate ? invoice.issueDate.toDate() : new Date(invoice.issueDate);
            return invoiceDate >= fromDate;
        });
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        filteredInvoices = filteredInvoices.filter(invoice => {
            const invoiceDate = invoice.issueDate.toDate ? invoice.issueDate.toDate() : new Date(invoice.issueDate);
            return invoiceDate <= toDate;
        });
    }
    
    // Temporarily update invoices array for display
    const originalInvoices = invoices;
    invoices = filteredInvoices;
    displayInvoices();
    invoices = originalInvoices;
}

// Client Deletion Function
async function deleteClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Check if client has invoices
    const clientInvoices = invoices.filter(inv => inv.clientId === clientId);
    
    let confirmMessage = `Are you sure you want to delete "${client.companyName}"?`;
    if (clientInvoices.length > 0) {
        confirmMessage += `\n\nWarning: This client has ${clientInvoices.length} associated invoice(s). Deleting the client will not delete the invoices, but they will lose their client reference.`;
    }
    
    if (!confirm(confirmMessage)) return;

    try {
        await db.collection('clients').doc(clientId).delete();
        showMessage('success', 'Client deleted successfully!');
        
        // Reload data
        await loadClients();
        updateQuickStats();
        populateDropdowns();
        
        log(`Client deleted: ${client.companyName}`);
    } catch (error) {
        console.error('Error deleting client:', error);
        showMessage('error', 'Failed to delete client. Please try again.');
    }
}

// Invoice Deletion Function
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
        
        log(`Invoice deleted: ${invoice.invoiceNumber}`);
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showMessage('error', 'Failed to delete invoice. Please try again.');
    }
}

// Enhanced Invoice Editing Function
async function editInvoice(invoiceId) {
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

    // Populate establishments
    if (invoice.clientId) {
        populateClientEstablishments(invoice.clientId);
        setTimeout(() => {
            if (invoice.establishments) {
                invoice.establishments.forEach(estId => {
                    const checkbox = document.querySelector(`#add-invoice-establishments input[value="${estId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }, 100);
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
                    <input type="text" class="form-control item-description" placeholder="Description" value="${item.description || ''}">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-quantity" placeholder="Qty" value="${item.quantity || 1}" min="1">
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
            `;
            itemsContainer.appendChild(itemRow);
        });
    } else {
        // Add default empty row
        addInvoiceItem();
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

    new bootstrap.Modal(document.getElementById('addInvoiceModal')).show();
}

// Update handleAddInvoice to handle both create and update
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
    document.querySelectorAll('.invoice-item-row').forEach(row => {
        const description = row.querySelector('.item-description').value;
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
        
        if (description && quantity > 0 && rate >= 0) {
            items.push({
                description,
                quantity,
                rate,
                total: quantity * rate
            });
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
            log(`Invoice updated: ${invoiceData.invoiceNumber}`);
        } else {
            await db.collection('invoices').add(invoiceData);
            showMessage('success', 'Invoice created successfully!');
            log(`Invoice created: ${invoiceData.invoiceNumber}`);
        }
        
        // Reset form and close modal
        resetInvoiceForm();
        bootstrap.Modal.getInstance(document.getElementById('addInvoiceModal')).hide(); // Close the modal here
        
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
    document.getElementById('add-invoice-form').removeAttribute('data-invoice-id');
    document.getElementById('addInvoiceModalLabel').textContent = 'Create New Invoice';
    const submitButton = document.querySelector('#add-invoice-form button[type="submit"]');
    submitButton.textContent = 'Create Invoice';
    submitButton.className = 'btn btn-success';
    
    // Reset items container
    document.getElementById('add-invoice-items').innerHTML = `
        <div class="row mb-2 invoice-item-row">
            <div class="col-md-4">
                <input type="text" class="form-control item-description" placeholder="Description">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control item-quantity" placeholder="Qty" value="1" min="1">
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
    
    // Set default values
    document.getElementById('add-invoice-number').value = generateInvoiceNumber();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('add-invoice-issue-date').value = today;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('add-invoice-due-date').value = dueDate.toISOString().split('T')[0];
}

// Additional Action Functions
function viewClientDetails(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    const clientInvoices = invoices.filter(inv => inv.clientId === clientId);
    const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const pendingAmount = clientInvoices
        .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const establishmentNames = client.establishments ? 
        client.establishments.map(estId => {
            const est = establishments.find(e => e.id === estId);
            return est ? est.name : 'Unknown';
        }).join(', ') : 'None assigned';
    
    const details = `
Client Details:

Company: ${client.companyName}
Contact: ${client.contactPerson}
Email: ${client.email}
Phone: ${client.phone || 'N/A'}
Status: ${client.status}
Billing Terms: ${client.billingTerms} days

Establishments: ${establishmentNames}

Financial Summary:
• Total Invoices: ${clientInvoices.length}
• Total Invoiced: ${formatCurrency(totalInvoiced)}
• Pending Payments: ${formatCurrency(pendingAmount)}

Notes: ${client.notes || 'None'}
    `;
    
    alert(details);
}

function createInvoiceForClient(clientId) {
    // Reset form first
    resetInvoiceForm();
    
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
                    <input type="number" class="form-control item-quantity" placeholder="Qty" value="${item.quantity}" min="1">
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const currentUser = netlifyIdentity.currentUser();
    if (currentUser) {
        updateUI(currentUser);
    }
    
    // Check for URL parameters to handle mashgiach logs import
    handleURLParameters();
});

// Handle URL parameters for mashgiach logs integration
function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const action = urlParams.get('action');
    const source = urlParams.get('source');
    
    if (tab === 'billing' && action === 'create' && source === 'mashgiach-logs') {
        // Switch to billing tab
        setTimeout(() => {
            const billingTab = document.getElementById('billing-tab');
            if (billingTab) {
                billingTab.click();
                
                // Wait a bit more then open invoice modal with mashgiach data
                setTimeout(() => {
                    openInvoiceWithMashgiachLogs();
                }, 500);
            }
        }, 1000);
    }
}

// Open invoice modal with mashgiach logs data
function openInvoiceWithMashgiachLogs() {
    const selectedLogsData = sessionStorage.getItem('selectedMashgiachLogs');
    const totalTimeData = sessionStorage.getItem('mashgiachLogsTotalTime');
    
    if (!selectedLogsData) {
        showMessage('error', 'No mashgiach logs data found. Please select logs from the Mashgiach Logs page.');
        return;
    }
    
    try {
        const selectedLogs = JSON.parse(selectedLogsData);
        const totalMinutes = parseInt(totalTimeData) || 0;
        
        // Reset and open invoice form
        resetInvoiceForm();
        
        // Pre-populate invoice items with mashgiach logs
        const itemsContainer = document.getElementById('add-invoice-items');
        itemsContainer.innerHTML = '';
        
        // Group logs by venue for better organization
        const logsByVenue = {};
        selectedLogs.forEach(log => {
            if (!logsByVenue[log.venue]) {
                logsByVenue[log.venue] = [];
            }
            logsByVenue[log.venue].push(log);
        });
        
        // Create invoice items for each venue
        Object.keys(logsByVenue).forEach(venue => {
            const venueLogs = logsByVenue[venue];
            const totalVenueMinutes = venueLogs.reduce((sum, log) => sum + log.timeSpent, 0);
            const totalVenueHours = (totalVenueMinutes / 60).toFixed(2);
            
            // Create description with all mashgiach names and activities
            const mashgiachNames = [...new Set(venueLogs.map(log => log.mashgiach))].join(', ');
            const activities = venueLogs.map(log => log.description).join('; ');
            
            const description = `Mashgiach Services - ${venue}\nMashgiach(im): ${mashgiachNames}\nActivities: ${activities}`;
            
            const itemRow = document.createElement('div');
            itemRow.className = 'row mb-2 invoice-item-row';
            itemRow.innerHTML = `
                <div class="col-md-4">
                    <textarea class="form-control item-description" placeholder="Description" rows="3">${description}</textarea>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-quantity" placeholder="Hours" value="${totalVenueHours}" min="0" step="0.25">
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-rate" placeholder="Rate per Hour" step="0.01" min="0" value="50.00">
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
            itemsContainer.appendChild(itemRow);
        });
        
        // Calculate totals
        calculateInvoiceTotal();
        
        // Set invoice description
        const totalHours = (totalMinutes / 60).toFixed(2);
        const invoiceNote = `Generated from Mashgiach Logs - Total Time: ${totalHours} hours (${totalMinutes} minutes)`;
        
        // Show success message
        showMessage('success', `Invoice pre-populated with ${selectedLogs.length} mashgiach log entries (${totalHours} hours total)`);
        
        // Open the modal
        new bootstrap.Modal(document.getElementById('addInvoiceModal')).show();
        
        // Clear session storage
        sessionStorage.removeItem('selectedMashgiachLogs');
        sessionStorage.removeItem('mashgiachLogsTotalTime');
        
    } catch (error) {
        console.error('Error processing mashgiach logs data:', error);
        showMessage('error', 'Error processing mashgiach logs data.');
    }
}

// Function to mark mashgiach logs as billed
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