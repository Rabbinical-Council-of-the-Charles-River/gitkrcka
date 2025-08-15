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
let allEstablishments = []; // Added for client-overview.html

// Set your Google Apps Script Web App URL here
const APPSCRIPT_URL = 'YOUR_APPSCRIPT_WEB_APP_URL';

// DOM Elements
const loginSection = document.getElementById('login-section');
const crmContent = document.getElementById('crm-content');
const netlifyLoginButton = document.getElementById('netlify-login-button');
const messageDiv = document.getElementById('message');
const addInvoiceModalElement = document.getElementById('addInvoiceModal');

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
        if (loginSection) loginSection.classList.add('hidden');
        if (crmContent) crmContent.classList.remove('hidden');
        clearMessage();
        initializeCRM();
    } else if (user) {
        showMessage('error', 'Admin access required for CRM system.');
        if (loginSection) loginSection.classList.remove('hidden');
        if (crmContent) crmContent.classList.add('hidden');
    } else {
        if (loginSection) loginSection.classList.remove('hidden');
        if (crmContent) crmContent.classList.add('hidden');
        clearMessage();
    }
}

// CRM Initialization
async function initializeCRM() {
    try {
        await loadEstablishments();
        await loadClients();
        await loadInvoices();
        updateQuickStats();
        populateDropdowns();
        setupEventListeners();
        processPendingInvoiceItems();
    } catch (error) {
        console.error('Error initializing CRM:', error);
        showMessage('error', 'Failed to initialize CRM system.');
    }
}

// Data Loading Functions
async function loadEstablishments() {
    try {
        const snapshot = await db.collection('establishments').get();
        establishments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading establishments:', error);
        showMessage('error', 'Failed to load establishments.');
    }
}

async function loadClients() {
    try {
        const snapshot = await db.collection('clients').orderBy('companyName').get();
        clients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        if (document.getElementById('clients-table-body')) {
            displayClients();
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        showMessage('error', 'Failed to load clients.');
    }
}

async function loadInvoices() {
    try {
        const snapshot = await db.collection('invoices').orderBy('issueDate', 'desc').get();
        invoices = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        if (document.getElementById('invoices-table-body')) {
            displayInvoices();
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
        showMessage('error', 'Failed to load invoices.');
    }
}

// Display Functions (updated to include new buttons)
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
                        <button class="btn btn-outline-info btn-sm" onclick="sendClientEmail('${client.email}')">
                            <i class="bi bi-envelope"></i>
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

        // Added invoice view link logic
        const invoiceLink = window.location.origin + `/client-overview.html?id=${invoice.clientId}&invoiceId=${invoice.id}`;

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
                        <button class="btn btn-outline-info btn-sm" onclick="sendInvoiceEmail('${client.email}', '${invoiceLink}', '${invoice.invoiceNumber}')">
                             <i class="bi bi-envelope"></i>
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

// New API call functions
async function sendInvoiceEmail(recipient, link, invoiceNumber) {
    if (!APPSCRIPT_URL || APPSCRIPT_URL === 'YOUR_APPSCRIPT_WEB_APP_URL') {
        showMessage('error', 'Apps Script URL is not configured. Please set APPSCRIPT_URL in crm.js');
        return;
    }

    try {
        const response = await fetch(`${APPSCRIPT_URL}?recipient=${encodeURIComponent(recipient)}&link=${encodeURIComponent(link)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}`);
        const result = await response.json();
        if (result.status === "success") {
            showMessage('success', 'Invoice email draft created successfully in your Gmail.');
        } else {
            showMessage('error', `Failed to create email draft: ${result.message}`);
        }
    } catch (error) {
        console.error('Error sending email via API:', error);
        showMessage('error', 'An error occurred while trying to create the email draft.');
    }
}

// Function for the client overview page
function sendClientEmail(recipient) {
    if (!APPSCRIPT_URL || APPSCRIPT_URL === 'YOUR_APPSCRIPT_WEB_APP_URL') {
        showMessage('error', 'Apps Script URL is not configured. Please set APPSCRIPT_URL in crm.js');
        return;
    }

    // Since there's no invoice link or number, we just open a mailto link
    const mailtoLink = `mailto:${encodeURIComponent(recipient)}`;
    window.location.href = mailtoLink;
}

// Event Listeners for Authentication
document.addEventListener('DOMContentLoaded', function() {
    if (netlifyIdentity) {
        netlifyIdentity.on('init', updateUI);
        netlifyIdentity.on('login', updateUI);
        netlifyIdentity.on('logout', () => updateUI(null));
        netlifyLoginButton.addEventListener('click', () => netlifyIdentity.open());
    } else {
        console.error('Netlify Identity widget not loaded.');
        showMessage('error', 'Authentication system is not available. Please check the script loading.');
    }
});