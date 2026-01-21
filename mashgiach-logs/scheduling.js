$(document).ready(function() {
    // --- Firebase Configuration ---
    const firebaseConfig = {
        apiKey: "AIzaSyAhOboBWpkzHegBBXIwQBa6SWD7JoLJvUg", // Replace if needed
        authDomain: "richardrccr-10a9d.firebaseapp.com", // Replace if needed
        projectId: "richardrccr-10a9d", // Replace if needed
        storageBucket: "richardrccr-10a9d.firebasestorage.app", // Replace if needed
        messagingSenderId: "867270362103", // Replace if needed
        appId: "1:867270362103:web:7653459445810350b864f2" // Replace if needed
    };

    // --- Initialize Firebase ---
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    // --- DOM Element References ---
    const loginSection = $('#login-section');
    const scheduleContent = $('#schedule-content');
    const netlifyLoginButton = $('#netlify-login-button');
    const messageDiv = $('#message');
    const scheduleTableBody = $('#schedule-table tbody');
    const cardView = $('#card-view');
    const calendarView = $('#calendar-view');
    const calendarGrid = $('#calendar-grid');
    const calendarMonthDisplay = $('#calendar-month');
    const prevMonthButton = $('#prev-month');
    const nextMonthButton = $('#next-month');
    const addScheduleForm = $('#add-schedule-form');
    const editScheduleForm = $('#edit-schedule-form');
    const deleteScheduleForm = $('#delete-schedule-form');
    const mashgiachSelect = $('#schedule-mashgiach');
    const establishmentSelect = $('#schedule-establishment');
    const editMashgiachSelect = $('#edit-schedule-mashgiach');
    const editEstablishmentSelect = $('#edit-schedule-establishment');

    // --- State Variables ---
    let currentMonth = moment();
    let schedules = [];
    let mashgiachs = [];
    let establishments = [];
    let currentUser = null;
    let currentUserIsAdmin = false;

    // --- Netlify Identity ---
    const netlifyIdentity = window.netlifyIdentity;

    // --- Helper Functions ---
    function showMessage(type, text) {
        messageDiv.removeClass().addClass(`message ${type}`).text(text).show();
    }

    function clearMessage() {
        messageDiv.hide().text('').removeClass();
    }

    function formatDate(timestamp) {
        return moment(timestamp.toDate()).format('MMMM DD, YYYY');
    }

    function formatTime(timeString) {
        return moment(timeString, 'HH:mm').format('h:mm A');
    }

    // --- Data Loading ---
    async function loadSchedules() {
        try {
            let query = db.collection('schedules').orderBy('date');
            const snapshot = await query.get();
            schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateView();
        } catch (error) {
            console.error("Error loading schedules: ", error);
            showMessage('error', 'Failed to load schedules.');
        }
    }

    async function loadMashgiachs() {
        try {
            const snapshot = await db.collection('users').where('app_metadata.roles', 'array-contains', 'mashgiach').get();
            mashgiachs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            populateDropdown(mashgiachSelect, mashgiachs);
            populateDropdown(editMashgiachSelect, mashgiachs);
        } catch (error) {
            console.error("Error loading mashgiachs: ", error);
            showMessage('error', 'Failed to load mashgiachs.');
        }
    }

    async function loadEstablishments() {
        try {
            const snapshot = await db.collection('establishments').get();
            establishments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            populateDropdown(establishmentSelect, establishments);
            populateDropdown(editEstablishmentSelect, establishments);
        } catch (error) {
            console.error("Error loading establishments: ", error);
            showMessage('error', 'Failed to load establishments.');
        }
    }

    function populateDropdown(selectElement, data) {
        selectElement.empty().append('<option value="">Select...</option>');
        data.forEach(item => {
            selectElement.append(`<option value="${item.id}">${item.name}</option>`);
        });
    }

    // --- UI Update ---
    function updateUI(user) {
        currentUser = user;
        currentUserIsAdmin = user?.app_metadata?.roles?.includes('admin') ?? false;

        if (currentUser) {
            loginSection.hide();
            scheduleContent.show();
            clearMessage();
            loadSchedules();
            loadMashgiachs();
            loadEstablishments();
        } else {
            loginSection.show();
            scheduleContent.hide();
        }
    }

    // --- View Updates ---
    function updateView() {
        const viewMode = $('input[name="view-mode"]:checked').val();
        $('#table-view, #card-view, #calendar-view').hide();

        if (viewMode === 'table') {
            updateTableView();
            $('#table-view').show();
        } else if (viewMode === 'card') {
            updateCardView();
            $('#card-view').show();
        } else if (viewMode === 'calendar') {
            updateCalendarView();
            $('#calendar-view').show();
        }
    }

    function updateTableView() {
        scheduleTableBody.empty();
        if (schedules.length === 0) {
            scheduleTableBody.append('<tr><td colspan="6">No schedules found.</td></tr>');
            return;
        }

        schedules.forEach(schedule => {
            const mashgiach = mashgiachs.find(m => m.id === schedule.mashgiachId);
            const establishment = establishments.find(e => e.id === schedule.establishmentId);
            const row = `
                <tr>
                    <td>${mashgiach ? mashgiach.name : 'Unknown'}</td>
                    <td>${establishment ? establishment.name : 'Unknown'}</td>
                    <td>${formatDate(schedule.date)}</td>
                    <td>${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</td>
                    <td>${schedule.status || 'Assigned'}</td>
                    <td>
                        <a href="#" class="edit" data-id="${schedule.id}" title="Edit"><i class="material-icons">&#xE254;</i></a>
                        <a href="#" class="delete" data-id="${schedule.id}" title="Delete"><i class="material-icons">&#xE872;</i></a>
                    </td>
                </tr>
            `;
            scheduleTableBody.append(row);
        });
    }

    function updateCardView() {
        cardView.empty();
        if (schedules.length === 0) {
            cardView.append('<p>No schedules found.</p>');
            return;
        }

        schedules.forEach(schedule => {
            const mashgiach = mashgiachs.find(m => m.id === schedule.mashgiachId);
            const establishment = establishments.find(e => e.id === schedule.establishmentId);
            const card = `
                <div class="schedule-card">
                    <h5>${establishment ? establishment.name : 'Unknown'}</h5>
                    <p><strong>Mashgiach:</strong> ${mashgiach ? mashgiach.name : 'Unknown'}</p>
                    <p><strong>Date:</strong> ${formatDate(schedule.date)}</p>
                    <p><strong>Time:</strong> ${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</p>
                    <span class="badge badge-primary">${schedule.status || 'Assigned'}</span>
                    <div class="mt-2">
                        <a href="#" class="edit" data-id="${schedule.id}" title="Edit">Edit</a>
                        <a href="#" class="delete" data-id="${schedule.id}" title="Delete">Delete</a>
                    </div>
                </div>
            `;
            cardView.append(card);
        });
    }

    function updateCalendarView() {
        calendarMonthDisplay.text(currentMonth.format('MMMM YYYY'));
        calendarGrid.empty();

        const startOfMonth = currentMonth.clone().startOf('month').startOf('week');
        const endOfMonth = currentMonth.clone().endOf('month').endOf('week');

        let currentDate = startOfMonth.clone();

        const calendarTable = $('<table>').addClass('table table-bordered');
        const thead = $('<thead>').append('<tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>');
        calendarTable.append(thead);
        const tbody = $('<tbody>');

        while (currentDate.isBefore(endOfMonth)) {
            const row = $('<tr>');
            for (let i = 0; i < 7; i++) {
                const day = $('<td>').text(currentDate.format('D'));
                if (!currentDate.isSame(currentMonth, 'month')) {
                    day.addClass('text-muted');
                }

                // Add schedules for this day
                const schedulesForDay = schedules.filter(schedule => {
                    const scheduleDate = moment(schedule.date.toDate());
                    return scheduleDate.isSame(currentDate, 'day');
                });

                if (schedulesForDay.length > 0) {
                    const scheduleList = $('<ul>').addClass('list-unstyled');
                    schedulesForDay.forEach(schedule => {
                        const mashgiach = mashgiachs.find(m => m.id === schedule.mashgiachId);
                        const establishment = establishments.find(e => e.id === schedule.establishmentId);
                        const listItem = $('<li>').text(`${establishment ? establishment.name : 'Unknown'} (${mashgiach ? mashgiach.name : 'Unknown'})`);
                        scheduleList.append(listItem);
                    });
                    day.append(scheduleList);
                }

                row.append(day);
                currentDate.add(1, 'day');
            }
            tbody.append(row);
        }

        calendarTable.append(tbody);
        calendarGrid.append(calendarTable);
    }

    // --- Event Handling ---
    $('input[name="view-mode"]').change(updateView);

    prevMonthButton.click(() => {
        currentMonth.subtract(1, 'month');
        updateCalendarView();
    });

    nextMonthButton.click(() => {
        currentMonth.add(1, 'month');
        updateCalendarView();
    });

    // --- Add Schedule ---
    addScheduleForm.submit(async function(e) {
        e.preventDefault();
        const schedule = {
            mashgiachId: $('#schedule-mashgiach').val(),
            establishmentId: $('#schedule-establishment').val(),
            date: firebase.firestore.Timestamp.fromDate(moment($('#schedule-date').val()).toDate()),
            startTime: $('#schedule-start-time').val(),
            endTime: $('#schedule-end-time').val(),
            notes: $('#schedule-notes').val(),
            status: 'assigned'
        };

        try {
            await db.collection('schedules').add(schedule);
            $('#addScheduleModal').modal('hide');
            loadSchedules();
            showMessage('success', 'Schedule added successfully.');
        } catch (error) {
            console.error("Error adding schedule: ", error);
            showMessage('error', 'Failed to add schedule.');
        }
    });

    // --- Edit Schedule ---
    scheduleTableBody.on('click', '.edit', async function() {
        const id = $(this).data('id');
        try {
            const doc = await db.collection('schedules').doc(id).get();
            if (doc.exists) {
                const schedule = doc.data();
                $('#edit-schedule-mashgiach').val(schedule.mashgiachId);
                $('#edit-schedule-establishment').val(schedule.establishmentId);
                $('#edit-schedule-date').val(moment(schedule.date.toDate()).format('YYYY-MM-DD'));
                $('#edit-schedule-start-time').val(schedule.startTime);
                $('#edit-schedule-end-time').val(schedule.endTime);
                $('#edit-schedule-notes').val(schedule.notes);
                $('#edit-schedule-status').val(schedule.status);
                editScheduleForm.data('id', id);
                $('#editScheduleModal').modal('show');
            } else {
                showMessage('warning', 'Schedule not found.');
            }
        } catch (error) {
            console.error("Error fetching schedule: ", error);
            showMessage('error', 'Failed to fetch schedule for editing.');
        }
    });

    editScheduleForm.submit(async function(e) {
        e.preventDefault();
        const id = editScheduleForm.data('id');
        const schedule = {
            mashgiachId: $('#edit-schedule-mashgiach').val(),
            establishmentId: $('#edit-schedule-establishment').val(),
            date: firebase.firestore.Timestamp.fromDate(moment($('#edit-schedule-date').val()).toDate()),
            startTime: $('#edit-schedule-start-time').val(),
            endTime: $('#edit-schedule-end-time').val(),
            notes: $('#edit-schedule-notes').val(),
            status: $('#edit-schedule-status').val()
        };

        try {
            await db.collection('schedules').doc(id).update(schedule);
            $('#editScheduleModal').modal('hide');
            loadSchedules();
            showMessage('success', 'Schedule updated successfully.');
        } catch (error) {
            console.error("Error updating schedule: ", error);
            showMessage('error', 'Failed to update schedule.');
        }
    });

    // --- Delete Schedule ---
    scheduleTableBody.on('click', '.delete', function() {
        $('#deleteScheduleModal').data('id', $(this).data('id')).modal('show');
    });

    deleteScheduleForm.submit(async function(e) {
        e.preventDefault();
        const id = $('#deleteScheduleModal').data('id');
        try {
            await db.collection('schedules').doc(id).delete();
            $('#deleteScheduleModal').modal('hide');
            loadSchedules();
            showMessage('success', 'Schedule deleted successfully.');
        } catch (error) {
            console.error("Error deleting schedule: ", error);
            showMessage('error', 'Failed to delete schedule.');
        }
    });

    // --- Netlify Identity ---
    netlifyLoginButton.on('click', () => netlifyIdentity.open());

    netlifyIdentity.on('init', user => {
        updateUI(user);
    });

    netlifyIdentity.on('login', user => {
        updateUI(user);
        netlifyIdentity.close();
    });

    netlifyIdentity.on('logout', () => {
        updateUI(null);
    });

    // --- Initialization ---
    updateUI(netlifyIdentity.currentUser());
});