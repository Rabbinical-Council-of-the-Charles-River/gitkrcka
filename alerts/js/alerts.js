// --- Configuration ---
// WARNING: Hardcoding keys is a security risk for production. Consider environment variables or Netlify Functions.
const firebaseConfig = {
    apiKey: "AIzaSyAhOboBWpkzHegBBXIwQBa6SWD7JoLJvUg", // Replace with your actual API key if different
    authDomain: "richardrccr-10a9d.firebaseapp.com",
    projectId: "richardrccr-10a9d",
    storageBucket: "richardrccr-10a9d.firebasestorage.app",
    messagingSenderId: "867270362103",
    appId: "1:867270362103:web:7653459445810350b864f2"
};

// --- Initialize Firebase & Firestore ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- DOM Elements ---
const loginSection = document.getElementById('login-section');
const adminContent = document.getElementById('admin-content');
const publicAlertsSection = document.getElementById('public-alerts');
const netlifyLoginButton = document.getElementById('netlify-login-button');
const messageDiv = document.getElementById('message');
const addAlertForm = document.getElementById('add-alert-form');
const alertDescriptionInput = document.getElementById('alert-description');
const adminAlertsList = document.getElementById('alerts-list');
const publicAlertsList = document.getElementById('public-alerts-list');
const addAlertModalElement = document.getElementById('addAlertModal'); // Get modal element

// --- Netlify Identity ---
const netlifyIdentity = window.netlifyIdentity;

// --- Helper Functions ---

/**
 * Displays a message to the user.
 * @param {'info' | 'error' | 'success'} type - The type of message.
 * @param {string} text - The message text.
 */
function showMessage(type, text) {
    if (messageDiv) {
        messageDiv.className = `message ${type}`; // Ensure you have CSS styles for .message.info, .message.error, etc.
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
    }
}

/** Clears any displayed messages. */
function clearMessage() {
    if (messageDiv) {
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }
}

/**
 * Checks if a user object indicates an admin role.
 * @param {object | null} user - The Netlify Identity user object.
 * @returns {boolean} True if the user is an admin, false otherwise.
 */
function isAdmin(user) {
    // IMPORTANT: Ensure 'admin' role is correctly configured in Netlify Identity UI
    // and that Git Gateway service is enabled in site settings for roles to populate.
    return user?.app_metadata?.roles?.includes('admin') ?? false;
}

/**
 * Updates the UI visibility based on user login status and role.
 * @param {object | null} user - The Netlify Identity user object.
 */
function updateUI(user) {
    clearMessage();
    const userIsAdmin = isAdmin(user);

    loginSection.classList.toggle('hidden', !!user); // Hide login if user exists
    adminContent.classList.toggle('hidden', !userIsAdmin); // Show admin if admin
    publicAlertsSection.classList.toggle('hidden', userIsAdmin || !user); // Show public if logged out OR logged in non-admin

    if (userIsAdmin) {
        fetchAndDisplayAlerts(adminAlertsList); // Fetch for admin view
    } else if (!user) {
        // Logged out - login section is shown above
        publicAlertsList.innerHTML = ''; // Clear public list when logged out
    } else {
        // Logged in, but not admin
        fetchAndDisplayAlerts(publicAlertsList); // Fetch for public view
        showMessage('info', 'You are logged in, but admin access is required to manage alerts.');
        // Optionally show a logout button somewhere accessible if needed
    }
}


// --- Firestore Functions ---

/**
 * Fetches alerts from Firestore and displays them in the target element.
 * @param {HTMLElement} targetElement - The DOM element to display alerts in.
 */
async function fetchAndDisplayAlerts(targetElement) {
    if (!targetElement) {
        console.error("Target element for alerts not found.");
        return;
    }
    targetElement.innerHTML = '<p>Loading alerts...</p>'; // Provide loading feedback

    try {
        const querySnapshot = await db.collection('alerts')
                                      .orderBy('timestamp', 'desc')
                                      .get();

        targetElement.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            targetElement.innerHTML = '<p>No alerts found.</p>';
            return;
        }

        const currentUser = netlifyIdentity.currentUser(); // Get current user for delete check
        const userIsAdmin = isAdmin(currentUser);

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const alertElement = document.createElement('div');
            alertElement.classList.add('alert-card'); // Use existing class

            // Format timestamp (handle potential null timestamp)
            let formattedDate = 'Date unknown';
            if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                try {
                    const date = data.timestamp.toDate();
                    formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                } catch (dateError) {
                    console.error("Error formatting date:", dateError, data.timestamp);
                    formattedDate = "Invalid date";
                }
            } else if (data.timestamp) {
                 console.warn("Timestamp field is not a Firestore Timestamp object:", data.timestamp);
                 try {
                     const date = new Date(data.timestamp);
                     if (!isNaN(date)) {
                        formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                     }
                 } catch(e){} // Ignore errors if parsing fails
            }

            // Sanitize description - using textContent is safer than innerHTML for user input
            const descriptionPara = document.createElement('p');
            descriptionPara.textContent = data.description || 'No description.';

            alertElement.innerHTML = `<div class="alert-date">${formattedDate}</div>`;
            alertElement.appendChild(descriptionPara); // Append sanitized description

            // Add delete button only for admins and if target is the admin list
            if (userIsAdmin && targetElement === adminAlertsList) {
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-danger btn-sm delete-alert-btn float-end'; // Use float-end for BS5
                deleteButton.textContent = 'Delete';
                deleteButton.dataset.id = doc.id;
                deleteButton.addEventListener('click', handleDeleteAlert);
                alertElement.appendChild(deleteButton);
            }

            targetElement.appendChild(alertElement);
        });

    } catch (error) {
        console.error('Error getting alerts: ', error);
        targetElement.innerHTML = '<p class="text-danger">Could not load alerts. Please try again later.</p>';
        // Don't show global message for load errors unless desired
        // showMessage('error', 'Failed to load alerts.');
    }
}

/**
 * Adds a new alert to Firestore.
 * @param {string} description - The text of the alert.
 */
async function addAlert(description) {
    if (!description || description.trim() === '') {
        showMessage('error', 'Alert description cannot be empty.');
        return;
    }

    try {
        await db.collection('alerts').add({
            description: description.trim(), // Trim whitespace
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Alert added successfully!');
        // Don't show global message, success is implied by list refresh & modal close
        // showMessage('success', 'Alert added successfully!');
        fetchAndDisplayAlerts(adminAlertsList); // Refresh the admin list
        if (addAlertForm) addAlertForm.reset(); // Reset form

        // --- Close Bootstrap 5 Modal ---
        if (addAlertModalElement) {
            // Get the instance associated with the element
            const modalInstance = bootstrap.Modal.getInstance(addAlertModalElement);
            if (modalInstance) {
                modalInstance.hide();
            } else {
                // If no instance found (e.g., modal wasn't shown via JS), create one to hide
                console.warn("Modal instance not found, creating new one to hide.");
                new bootstrap.Modal(addAlertModalElement).hide();
            }
        } else {
             console.warn("Add alert modal element not found for closing.");
        }
        // --- End of BS5 modal closing ---

    } catch (error) {
        console.error('Error adding alert: ', error);
        showMessage('error', 'Failed to add alert. Please try again.');
    }
}

/**
 * Handles the click event for deleting an alert.
 * @param {Event} event - The click event object.
 */
async function handleDeleteAlert(event) {
    const alertId = event.target.dataset.id;
    if (!alertId) return;

    // Use Bootstrap 5 modal for confirmation if available, otherwise use confirm()
    if (confirm('Are you sure you want to delete this alert? This action cannot be undone.')) {
        try {
            await db.collection('alerts').doc(alertId).delete();
            console.log('Alert deleted successfully!');
            // showMessage('success', 'Alert deleted.'); // Optional feedback
            fetchAndDisplayAlerts(adminAlertsList); // Refresh list
        } catch (error) {
            console.error('Error deleting alert:', error);
            showMessage('error', 'Failed to delete alert.');
        }
    }
}


// --- Event Listeners ---

// Login Button
if (netlifyLoginButton) {
    netlifyLoginButton.addEventListener('click', (e) => {
        e.preventDefault(); // Good practice for buttons/links
        netlifyIdentity.open(); // Open Netlify login modal
    });
} else {
    console.warn("Netlify login button not found.");
}

// Add Alert Form Submission
if (addAlertForm) {
    addAlertForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission
        const description = alertDescriptionInput ? alertDescriptionInput.value : '';
        addAlert(description);
    });
} else {
    console.warn("Add alert form not found.");
}

// --- Netlify Identity Event Handlers ---

netlifyIdentity.on('login', user => {
    console.log('Login event triggered:', user);
    updateUI(user);
});

netlifyIdentity.on('logout', () => {
    console.log('Logout event triggered');
    updateUI(null); // Pass null for user on logout
});

netlifyIdentity.on('init', user => {
    console.log('Init event triggered:', user);
    updateUI(user); // Initial UI setup based on logged-in status
});

// --- Initialisation ---
// Initialize Netlify Identity - Call init() only once
// It's often better to let the script included in HTML handle the init() call
// unless you need specific configurations passed to init.
// netlifyIdentity.init(); // -> This might already be called by the widget script itself.
// If you face issues with double initialization, remove this line.

// Initial UI state is set by the 'init' event handler above.
