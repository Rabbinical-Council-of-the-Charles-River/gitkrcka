// Initialize Firebase (if not already initialized)
const firebaseConfig = {
    apiKey: "AIzaSyAhOboBWpkzHegBBXIwQBa6SWD7JoLJvUg",
            authDomain: "richardrccr-10a9d.firebaseapp.com",
            projectId: "richardrccr-10a9d",
            storageBucket: "richardrccr-10a9d.firebasestorage.app",
            messagingSenderId: "867270362103",
            appId: "1:867270362103:web:7653459445810350b864f2"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// New Collection Reference
const mashgiachLogRef = db.collection('mashgiach-logs');

// Function to add a new Mashgiach Log
async function addMashgiachLog(logData) {
    try {
        // Get current user
        const user = window.netlifyIdentity.currentUser();
        if (!user) {
            console.error("No user logged in.");
            return;
        }
        // Data to be added to the log
        const logEntry = {
            mashgiachId: user.id, // Netlify Identity user ID
            mashgiachName: user.user_metadata.full_name || user.email, // Netlify Identity user name or email
            venue: logData.venue,
            dateTime: firebase.firestore.FieldValue.serverTimestamp(), // Server timestamp
            description: logData.description,
            timeSpent: logData.timeSpent,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt : firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add the log to the "mashgiach-logs" collection
        const docRef = await mashgiachLogRef.add(logEntry);
        console.log("Mashgiach log written with ID: ", docRef.id);
        return docRef;
    } catch (error) {
        console.error("Error adding Mashgiach log: ", error);
        throw error;
    }
}

// Function to fetch and display Mashgiach Logs
async function displayMashgiachLogs() {
    try {
        // Clear the table first
        $('#mashgiach-log-table tbody').empty();

        // Get the logs from the "mashgiach-logs" collection
        const querySnapshot = await mashgiachLogRef.orderBy('dateTime', 'desc').get();
        if (querySnapshot.empty) {
            $('#mashgiach-log-table tbody').append('<tr><td colspan="6">No logs found.</td></tr>');
            return;
        }

        // Loop through the logs and display them
        querySnapshot.forEach(doc => {
            const log = doc.data();
            const formattedDate = log.dateTime ? log.dateTime.toDate().toLocaleString() : 'N/A'; // Format timestamp

            const logEntry = `
                <tr data-id="${doc.id}">
                    <td>${log.mashgiachName || log.mashgiachId || 'Unknown'}</td>
                    <td>${log.venue}</td>
                    <td>${formattedDate}</td>
                    <td>${log.description}</td>
                    <td>${log.timeSpent}</td>
                    <td>
                        <a href="#" id="${doc.id}" class="edit js-edit-log"><i class="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i></a>
                        <a href="#" id="${doc.id}" class="delete js-delete-log"><i class="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i></a>
                    </td>
                </tr>
            `;

            $('#mashgiach-log-table tbody').append(logEntry);
        });

        // Re-initialize tooltips
        $('[data-toggle="tooltip"]').tooltip();
    } catch (error) {
        console.error("Error fetching Mashgiach logs: ", error);
    }
}
// Function to delete Mashgiach log
$(document).on('click', '.js-delete-log', function (e) {
    e.preventDefault();
    let id = $(this).attr('id');
    $('#delete-log-form').attr('delete-id', id);
    $('#deleteLogModal').modal('show');
});

$("#delete-log-form").submit(function (event) {
    event.preventDefault();
    let id = $(this).attr('delete-id');
    mashgiachLogRef.doc(id).delete()
        .then(function () {
            console.log("Document successfully deleted!");
            $("#deleteLogModal").modal('hide');
            // Refresh the log display
            displayMashgiachLogs();
        })
        .catch(function (error) {
            console.error("Error deleting document: ", error);
        });
});
// Function to handle editing a log
$(document).on('click', '.js-edit-log', async function (e) {
    e.preventDefault();
    let id = $(this).attr('id');
    $('#edit-log-form').attr('edit-id', id);
    try {
        const doc = await mashgiachLogRef.doc(id).get();
        if (doc.exists) {
            const logData = doc.data();
            $('#edit-log-form #edit-log-venue').val(logData.venue);
            $('#edit-log-form #edit-log-description').val(logData.description);
            $('#edit-log-form #edit-log-time-spent').val(logData.timeSpent);
            $('#editLogModal').modal('show');
        } else {
            console.log("No such document!");
        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
});
// Function to handle saving edited log
$("#edit-log-form").submit(async function (event) {
    event.preventDefault();
    let id = $(this).attr('edit-id');
    const venue = $('#edit-log-form #edit-log-venue').val();
    const description = $('#edit-log-form #edit-log-description').val();
    const timeSpent = $('#edit-log-form #edit-log-time-spent').val();

    try {
        await mashgiachLogRef.doc(id).update({
            venue: venue,
            description: description,
            timeSpent: timeSpent,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        $('#editLogModal').modal('hide');
        // Refresh the log display
        displayMashgiachLogs();
    } catch (error) {
        console.error("Error updating document: ", error);
    }
});

// Initialize when the document is ready
$(document).ready(function () {
    // Display the logs
    displayMashgiachLogs();

    // Function to handle adding a new log
    $("#add-log-form").submit(function (event) {
        event.preventDefault();
        const venue = $('#log-venue').val();
        const description = $('#log-description').val();
        const timeSpent = $('#log-time-spent').val();

        const logData = {
            venue: venue,
            description: description,
            timeSpent: timeSpent
        };

        addMashgiachLog(logData)
            .then(() => {
                $('#addLogModal').modal('hide');
                $('#add-log-form')[0].reset();
                displayMashgiachLogs();
            })
            .catch(error => console.error("Failed to add log:", error));
    });

});

// netlify
// Function to display messages
function showMessage(type, text) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
    }
}

// Function to clear messages
function clearMessage() {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }
}
const loginSection = document.getElementById('login-section');
const adminContent = document.getElementById('admin-content');
const netlifyLoginButton = document.getElementById('netlify-login-button');
const netlifyIdentity = window.netlifyIdentity;
netlifyIdentity.init();

// Add event listener to the custom button to trigger Netlify Identity
if (netlifyLoginButton) {
    netlifyLoginButton.addEventListener('click', () => {
        netlifyIdentity.open();
    });
}

// Listen for login and logout events
netlifyIdentity.on('login', user => {
    console.log('Login event triggered:', user);
    if (user && user.app_metadata && user.app_metadata.roles && user.app_metadata.roles.includes('admin')) {
        loginSection.classList.add('hidden');
        adminContent.classList.remove('hidden');
    } else {
        showMessage('error', 'Admin access required.');
        loginSection.classList.remove('hidden');
        adminContent.classList.add('hidden');
    }
});

netlifyIdentity.on('logout', () => {
    console.log('Logout event triggered');
    loginSection.classList.remove('hidden');
    adminContent.classList.add('hidden');
    clearMessage();
});

// Check if the user is already logged in on page load
netlifyIdentity.on('init', user => {
    if (user) {
        console.log('User is already logged in:', user);
        if (user.app_metadata && user.app_metadata.roles && user.app_metadata.roles.includes('admin')) {
            loginSection.classList.add('hidden');
            adminContent.classList.remove('hidden');
        } else {
            showMessage('error', 'Admin access required.');
            loginSection.classList.remove('hidden');
            adminContent.classList.add('hidden');
        }
    } else {
        console.log('No user logged in.');
        loginSection.classList.remove('hidden');
        adminContent.classList.add('hidden');
    }
});
