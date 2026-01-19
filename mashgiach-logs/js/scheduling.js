// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAhOboBWpkzHegBBXIwQBa6SWD7JoLJvUg",
    authDomain: "richardrccr-10a9d.firebaseapp.com",
    projectId: "richardrccr-10a9d",
    storageBucket: "richardrccr-10a9d.firebasestorage.app",
    messagingSenderId: "867270362103",
    appId: "1:867270362103:web:7653459445810350b864f2"
};

// --- Initialize Firebase ---
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- Firestore Collection References ---
const scheduleRef = db.collection('mashgiach-schedules');
const mashgiachLogsRef = db.collection('mashgiach-logs');
const establishmentsRef = db.collection('establishments');

// --- DOM Element References ---
const loginSection = document.getElementById('login-section');
const scheduleContent = document.getElementById('schedule-content');
const netlifyLoginButton = document.getElementById('netlify-login-button');
const messageDiv = document.getElementById('message');
const scheduleTable = document.getElementById('schedule-table');
const scheduleTableBody = document.querySelector('#schedule-table tbody');
const cardView = document.getElementById('card-view');
const tableView = document.getElementById('table-view');
const viewModeRadios = document.querySelectorAll('input[name="view-mode"]');

const addScheduleForm = document.getElementById('add-schedule-form');
const editScheduleForm = document.getElementById('edit-schedule-form');
const deleteScheduleForm = document.getElementById('delete-schedule-form');

const scheduleMashgiachSelect = document.getElementById('schedule-mashgiach');
const scheduleEstablishmentSelect = document.getElementById('schedule-establishment');
const editScheduleMashgiachSelect = document.getElementById('edit-schedule-mashgiach');
const editScheduleEstablishmentSelect = document.getElementById('edit-schedule-establishment');

// --- Netlify Identity Initialization ---
const netlifyIdentity = window.netlifyIdentity;
if (netlifyIdentity) {
    netlifyIdentity.init();
} else {
    console.error("Netlify Identity widget not loaded.");
    showMessage('error', 'Authentication service failed to load.');
}

// --- State Variables ---
let currentUser = null;
let currentUserIsAdmin = false;
let mashgichim = [];
let establishments = [];

let mashgiachChoices;
let establishmentChoices;
let editMashgiachChoices;
let editEstablishmentChoices;

// --- Helper Functions ---
function showMessage(type, text) {
    if (messageDiv) {
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
    }
}

function clearMessage() {
    if (messageDiv) {
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }
}

function formatDate(date) {
    if (!date) return 'N/A';
    if (typeof date.toDate === 'function') {
        date = date.toDate();
    }
    return new Date(date).toLocaleDateString();
}

function getStatusBadge(status) {
    const statusMap = {
        'assigned': 'status-assigned',
        'completed': 'status-completed',
        'no-log': 'status-no-log',
        'cancelled': 'secondary'
    };
    const badgeClass = statusMap[status] || 'secondary';
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    return `<span class="badge ${badgeClass}">${statusText}</span>`;
}

function calculateDurationMinutes(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    return Math.max(0, endTotalMin - startTotalMin);
}

async function loadMashgichimAndEstablishments() {
    try {
        // Load mashgichim (users with mashgiach role)
        const usersSnapshot = await db.collection('users').get();
        mashgichim = usersSnapshot.docs
            .map(doc => ({
                id: doc.id,
                name: doc.data().full_name || doc.data().email || doc.id
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // Load establishments
        const estSnapshot = await establishmentsRef.orderBy('name').get();
        establishments = estSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name
        }));

        // Initialize Choices.js for add modal
        if (scheduleMashgiachSelect && !mashgiachChoices) {
            mashgiachChoices = new Choices(scheduleMashgiachSelect, {
                searchEnabled: true,
                itemSelectText: '',
                placeholder: true,
                placeholderValue: 'Select a mashgiach',
                choices: mashgichim.map(m => ({ value: m.id, label: m.name })),
                removeItemButton: true,
            });
        }

        if (scheduleEstablishmentSelect && !establishmentChoices) {
            establishmentChoices = new Choices(scheduleEstablishmentSelect, {
                searchEnabled: true,
                itemSelectText: '',
                placeholder: true,
                placeholderValue: 'Select an establishment',
                choices: establishments.map(e => ({ value: e.id, label: e.name })),
                removeItemButton: true,
            });
        }

        // Initialize Choices.js for edit modal
        if (editScheduleMashgiachSelect && !editMashgiachChoices) {
            editMashgiachChoices = new Choices(editScheduleMashgiachSelect, {
                searchEnabled: true,
                itemSelectText: '',
                placeholder: true,
                placeholderValue: 'Select a mashgiach',
                choices: mashgichim.map(m => ({ value: m.id, label: m.name })),
                removeItemButton: true,
            });
        }

        if (editScheduleEstablishmentSelect && !editEstablishmentChoices) {
            editEstablishmentChoices = new Choices(editScheduleEstablishmentSelect, {
                searchEnabled: true,
                itemSelectText: '',
                placeholder: true,
                placeholderValue: 'Select an establishment',
                choices: establishments.map(e => ({ value: e.id, label: e.name })),
                removeItemButton: true,
            });
        }

    } catch (error) {
        console.error('Error loading mashgichim and establishments:', error);
        showMessage('error', 'Failed to load mashgichim and establishment list.');
    }
}

async function checkForLogsForSchedule(scheduleId, scheduleData) {
    try {
        const logsSnapshot = await mashgiachLogsRef
            .where('mashgiachId', '==', scheduleData.mashgiachId)
            .where('venue', '==', scheduleData.establishmentName)
            .where('dateTime', '>=', new Date(scheduleData.date))
            .where('dateTime', '<', new Date(new Date(scheduleData.date).getTime() + 86400000))
            .get();

        return !logsSnapshot.empty;
    } catch (error) {
        console.error('Error checking for logs:', error);
        return false;
    }
}

async function getScheduleStatus(schedule) {
    if (schedule.status === 'cancelled') {
        return 'cancelled';
    }
    if (schedule.status === 'completed') {
        return 'completed';
    }
    const hasLog = await checkForLogsForSchedule(schedule.id, schedule);
    return hasLog ? 'completed' : 'assigned';
}

async function displaySchedules() {
    if (!currentUser) return;

    const scheduleViewMode = document.querySelector('input[name="view-mode"]:checked').value;

    try {
        let query = scheduleRef;

        // Non-admin users only see their own schedules
        if (!currentUserIsAdmin) {
            query = query.where('mashgiachId', '==', currentUser.id);
        }

        const querySnapshot = await query.orderBy('date', 'desc').get();

        // Clear both views
        scheduleTableBody.innerHTML = '';
        cardView.innerHTML = '';

        if (querySnapshot.empty) {
            const emptyMsg = `<tr><td colspan="6">No schedules found${!currentUserIsAdmin ? ' for you' : ''}.</td></tr>`;
            scheduleTableBody.innerHTML = emptyMsg;
            cardView.innerHTML = '<p class="text-muted">No schedules found.</p>';
            return;
        }

        // Get mashgiach names map
        const mashgiachMap = {};
        mashgichim.forEach(m => {
            mashgiachMap[m.id] = m.name;
        });

        // Process each schedule
        for (const doc of querySnapshot.docs) {
            const schedule = doc.data();
            schedule.id = doc.id;
            const status = await getScheduleStatus(schedule);

            const mashgiachName = mashgiachMap[schedule.mashgiachId] || 'Unknown';
            const formattedDate = formatDate(new Date(schedule.date));

            // Add to table
            const tableRow = `
                <tr data-id="${doc.id}">
                    <td>${mashgiachName}</td>
                    <td>${schedule.establishmentName || 'N/A'}</td>
                    <td>${formattedDate}</td>
                    <td>${schedule.startTime} - ${schedule.endTime}</td>
                    <td>${getStatusBadge(status)}</td>
                    <td>
                        <a href="#" class="edit-schedule" data-id="${doc.id}" title="Edit">
                            <i class="material-icons">&#xE254;</i>
                        </a>
                        <a href="#" class="delete-schedule" data-id="${doc.id}" title="Delete">
                            <i class="material-icons">&#xE872;</i>
                        </a>
                        <a href="#" class="log-schedule" data-id="${doc.id}" data-schedule="${encodeURIComponent(JSON.stringify(schedule))}" title="Create Log">
                            <i class="material-icons">&#xE145;</i>
                        </a>
                    </td>
                </tr>
            `;
            scheduleTableBody.innerHTML += tableRow;

            // Add to card view
            const cardHtml = `
                <div class="schedule-card">
                    <h5>${mashgiachName}</h5>
                    <p><strong>${schedule.establishmentName}</strong></p>
                    <p>
                        <small><strong>Date:</strong> ${formattedDate}</small><br>
                        <small><strong>Time:</strong> ${schedule.startTime} - ${schedule.endTime}</small>
                    </p>
                    ${schedule.notes ? `<p><small><strong>Notes:</strong> ${schedule.notes}</small></p>` : ''}
                    <div>
                        ${getStatusBadge(status)}
                    </div>
                    <div class="mt-3">
                        <a href="#" class="edit-schedule text-primary" data-id="${doc.id}" title="Edit">
                            <i class="material-icons" style="font-size: 18px;">&#xE254;</i>
                        </a>
                        <a href="#" class="delete-schedule text-danger" data-id="${doc.id}" title="Delete" style="margin-left: 10px;">
                            <i class="material-icons" style="font-size: 18px;">&#xE872;</i>
                        </a>
                        <a href="#" class="log-schedule text-success" data-id="${doc.id}" data-schedule="${encodeURIComponent(JSON.stringify(schedule))}" title="Create Log" style="margin-left: 10px;">
                            <i class="material-icons" style="font-size: 18px;">&#xE145;</i>
                        </a>
                    </div>
                </div>
            `;
            cardView.innerHTML += cardHtml;
        }

    } catch (error) {
        console.error('Error fetching schedules:', error);
        showMessage('error', `Error loading schedules: ${error.message}`);
    }
}

async function addScheduleSubmit(event) {
    event.preventDefault();

    if (!currentUserIsAdmin) {
        alert('Only admins can create schedules.');
        return;
    }

    const mashgiachId = mashgiachChoices ? mashgiachChoices.getValue(true) : scheduleMashgiachSelect.value;
    const establishmentId = establishmentChoices ? establishmentChoices.getValue(true) : scheduleEstablishmentSelect.value;
    const date = document.getElementById('schedule-date').value;
    const startTime = document.getElementById('schedule-start-time').value;
    const endTime = document.getElementById('schedule-end-time').value;
    const notes = document.getElementById('schedule-notes').value.trim();

    if (!mashgiachId || !establishmentId || !date || !startTime || !endTime) {
        alert('Please fill in all required fields.');
        return;
    }

    if (startTime >= endTime) {
        alert('End time must be after start time.');
        return;
    }

    try {
        // Find establishment name
        const estName = establishments.find(e => e.id === establishmentId)?.name || establishmentId;

        const scheduleData = {
            mashgiachId: mashgiachId,
            establishmentId: establishmentId,
            establishmentName: estName,
            date: date,
            startTime: startTime,
            endTime: endTime,
            notes: notes,
            status: 'assigned',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.id
        };

        await scheduleRef.add(scheduleData);
        showMessage('success', 'Schedule added successfully!');
        
        const addModalEl = document.getElementById('addScheduleModal');
        const modal = bootstrap.Modal.getInstance(addModalEl);
        if (modal) modal.hide();
        
        addScheduleForm.reset();
        if (mashgiachChoices) mashgiachChoices.setChoiceByValue('');
        if (establishmentChoices) establishmentChoices.setChoiceByValue('');
        
        displaySchedules();
    } catch (error) {
        console.error('Error adding schedule:', error);
        showMessage('error', `Failed to add schedule: ${error.message}`);
    }
}

async function openEditScheduleModal(scheduleId) {
    if (!currentUserIsAdmin) {
        alert('Only admins can edit schedules.');
        return;
    }

    try {
        const doc = await scheduleRef.doc(scheduleId).get();
        if (doc.exists) {
            const schedule = doc.data();
            editScheduleForm.setAttribute('data-edit-id', scheduleId);

            if (editMashgiachChoices) {
                editMashgiachChoices.setChoiceByValue(schedule.mashgiachId);
            }
            if (editEstablishmentChoices) {
                editEstablishmentChoices.setChoiceByValue(schedule.establishmentId);
            }

            document.getElementById('edit-schedule-date').value = schedule.date;
            document.getElementById('edit-schedule-start-time').value = schedule.startTime;
            document.getElementById('edit-schedule-end-time').value = schedule.endTime;
            document.getElementById('edit-schedule-notes').value = schedule.notes || '';
            document.getElementById('edit-schedule-status').value = schedule.status || 'assigned';

            const editModalEl = document.getElementById('editScheduleModal');
            const modal = bootstrap.Modal.getOrCreateInstance(editModalEl);
            modal.show();
        }
    } catch (error) {
        console.error('Error loading schedule for edit:', error);
        showMessage('error', `Error loading schedule: ${error.message}`);
    }
}

async function editScheduleSubmit(event) {
    event.preventDefault();

    const scheduleId = editScheduleForm.getAttribute('data-edit-id');
    if (!scheduleId) return;

    const mashgiachId = editMashgiachChoices ? editMashgiachChoices.getValue(true) : editScheduleMashgiachSelect.value;
    const establishmentId = editEstablishmentChoices ? editEstablishmentChoices.getValue(true) : editScheduleEstablishmentSelect.value;
    const date = document.getElementById('edit-schedule-date').value;
    const startTime = document.getElementById('edit-schedule-start-time').value;
    const endTime = document.getElementById('edit-schedule-end-time').value;
    const notes = document.getElementById('edit-schedule-notes').value.trim();
    const status = document.getElementById('edit-schedule-status').value;

    if (!mashgiachId || !establishmentId || !date || !startTime || !endTime) {
        alert('Please fill in all required fields.');
        return;
    }

    if (startTime >= endTime) {
        alert('End time must be after start time.');
        return;
    }

    try {
        const estName = establishments.find(e => e.id === establishmentId)?.name || establishmentId;

        const updateData = {
            mashgiachId: mashgiachId,
            establishmentId: establishmentId,
            establishmentName: estName,
            date: date,
            startTime: startTime,
            endTime: endTime,
            notes: notes,
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await scheduleRef.doc(scheduleId).update(updateData);
        showMessage('success', 'Schedule updated successfully!');

        const editModalEl = document.getElementById('editScheduleModal');
        const modal = bootstrap.Modal.getInstance(editModalEl);
        if (modal) modal.hide();

        editScheduleForm.removeAttribute('data-edit-id');
        displaySchedules();
    } catch (error) {
        console.error('Error updating schedule:', error);
        showMessage('error', `Failed to update schedule: ${error.message}`);
    }
}

async function openDeleteScheduleModal(scheduleId) {
    if (!currentUserIsAdmin) {
        alert('Only admins can delete schedules.');
        return;
    }

    deleteScheduleForm.setAttribute('data-delete-id', scheduleId);
    const deleteModalEl = document.getElementById('deleteScheduleModal');
    const modal = bootstrap.Modal.getOrCreateInstance(deleteModalEl);
    modal.show();
}

async function deleteScheduleSubmit(event) {
    event.preventDefault();

    const scheduleId = deleteScheduleForm.getAttribute('data-delete-id');
    if (!scheduleId) return;

    try {
        await scheduleRef.doc(scheduleId).delete();
        showMessage('success', 'Schedule deleted successfully!');

        const deleteModalEl = document.getElementById('deleteScheduleModal');
        const modal = bootstrap.Modal.getInstance(deleteModalEl);
        if (modal) modal.hide();

        deleteScheduleForm.removeAttribute('data-delete-id');
        displaySchedules();
    } catch (error) {
        console.error('Error deleting schedule:', error);
        showMessage('error', `Failed to delete schedule: ${error.message}`);
    }
}

// --- UI Update Logic ---
function updateAccessUI(user) {
    currentUser = user;
    const userRoles = user?.app_metadata?.roles || [];
    currentUserIsAdmin = userRoles.includes('admin');
    const isMashgiach = userRoles.includes('mashgiach');
    const canAccess = currentUserIsAdmin || isMashgiach;

    if (canAccess) {
        loginSection.classList.add('hidden');
        scheduleContent.classList.remove('hidden');
        clearMessage();
        loadMashgichimAndEstablishments();
        displaySchedules();

        // Show/hide admin elements
        const adminElements = document.querySelectorAll('.admin-only-func');
        adminElements.forEach(el => {
            el.style.setProperty('display', currentUserIsAdmin ? '' : 'none', currentUserIsAdmin ? 'important' : '');
        });
    } else {
        loginSection.classList.remove('hidden');
        scheduleContent.classList.add('hidden');

        const adminElements = document.querySelectorAll('.admin-only-func');
        adminElements.forEach(el => { el.style.display = 'none'; });

        if (user) {
            showMessage('error', 'Access Denied. Required roles: admin or mashgiach.');
        } else {
            clearMessage();
        }
    }
}

// --- Event Listeners ---

if (netlifyLoginButton) {
    netlifyLoginButton.addEventListener('click', () => {
        netlifyIdentity.open();
    });
}

netlifyIdentity.on('init', user => updateAccessUI(user));
netlifyIdentity.on('login', user => {
    updateAccessUI(user);
    netlifyIdentity.close();
});
netlifyIdentity.on('logout', () => updateAccessUI(null));

if (addScheduleForm) addScheduleForm.addEventListener('submit', addScheduleSubmit);
if (editScheduleForm) editScheduleForm.addEventListener('submit', editScheduleSubmit);
if (deleteScheduleForm) deleteScheduleForm.addEventListener('submit', deleteScheduleSubmit);

// View mode toggle
viewModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'table') {
            tableView.style.display = '';
            cardView.style.display = 'none';
        } else {
            tableView.style.display = 'none';
            cardView.style.display = '';
        }
    });
});

// Table click listeners
scheduleTableBody.addEventListener('click', (event) => {
    const target = event.target.closest('a');
    if (!target) return;

    const scheduleId = target.getAttribute('data-id');
    if (!scheduleId) return;

    if (target.classList.contains('edit-schedule')) {
        event.preventDefault();
        openEditScheduleModal(scheduleId);
    } else if (target.classList.contains('delete-schedule')) {
        event.preventDefault();
        openDeleteScheduleModal(scheduleId);
    } else if (target.classList.contains('log-schedule')) {
        event.preventDefault();
        const scheduleData = JSON.parse(decodeURIComponent(target.getAttribute('data-schedule')));
        // Redirect to log creation with schedule data
        sessionStorage.setItem('scheduleForLog', JSON.stringify(scheduleData));
        window.location.href = 'index.html?schedule=true';
    }
});

// Card view click listeners
cardView.addEventListener('click', (event) => {
    const target = event.target.closest('a');
    if (!target) return;

    const scheduleId = target.getAttribute('data-id');
    if (!scheduleId) return;

    if (target.classList.contains('edit-schedule')) {
        event.preventDefault();
        openEditScheduleModal(scheduleId);
    } else if (target.classList.contains('delete-schedule')) {
        event.preventDefault();
        openDeleteScheduleModal(scheduleId);
    } else if (target.classList.contains('log-schedule')) {
        event.preventDefault();
        const scheduleData = JSON.parse(decodeURIComponent(target.getAttribute('data-schedule')));
        sessionStorage.setItem('scheduleForLog', JSON.stringify(scheduleData));
        window.location.href = 'index.html?schedule=true';
    }
});

// Modal cleanup
const addModalEl = document.getElementById('addScheduleModal');
if (addModalEl) {
    addModalEl.addEventListener('hidden.bs.modal', () => {
        addScheduleForm.reset();
        if (mashgiachChoices) mashgiachChoices.setChoiceByValue('');
        if (establishmentChoices) establishmentChoices.setChoiceByValue('');
    });
}

const editModalEl = document.getElementById('editScheduleModal');
if (editModalEl) {
    editModalEl.addEventListener('hidden.bs.modal', () => {
        editScheduleForm.reset();
        editScheduleForm.removeAttribute('data-edit-id');
        if (editMashgiachChoices) editMashgiachChoices.setChoiceByValue('');
        if (editEstablishmentChoices) editEstablishmentChoices.setChoiceByValue('');
    });
}

const deleteModalEl = document.getElementById('deleteScheduleModal');
if (deleteModalEl) {
    deleteModalEl.addEventListener('hidden.bs.modal', () => {
        deleteScheduleForm.removeAttribute('data-delete-id');
    });
}
