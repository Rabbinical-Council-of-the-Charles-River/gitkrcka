$(document).ready(function() {
    // Firebase refs (firebase is initialized in index.html)
    const db = firebase.firestore();
    const establishmentsCollection = db.collection('establishments');

    // DOM Elements
    const establishmentTableBody = $('#establishment-table tbody');
    const addEstablishmentForm = $('#add-establishment-form');
    const addEstablishmentModal = $('#addEstablishmentModal');
    const editEstablishmentForm = $('#edit-establishment-form');
    const editEstablishmentModal = $('#editEstablishmentModal');
    const deleteEstablishmentModal = $('#deleteEstablishmentModal');
    const deleteEstablishmentForm = $('#delete-establishment-form');
    const totalEntriesCount = $('.count'); // For displaying total entries

    // --- Helper Functions for Kosher Status Checkboxes ---
    function getSelectedKosherStatusesFromForm(modalTypePrefix) { // 'add' or 'edit'
        const selectedStatuses = [];
        $(`.${modalTypePrefix}-modal-checkbox:checked`).each(function() {
            selectedStatuses.push($(this).val());
        });
        return selectedStatuses;
    }

    function populateKosherStatusCheckboxes(modalTypePrefix, statuses) {
        // Uncheck all first
        $(`.${modalTypePrefix}-modal-checkbox`).prop('checked', false);
        if (Array.isArray(statuses)) {
            statuses.forEach(status => {
                // Ensure the value being matched is exactly what's in the checkbox value attribute
                $(`.${modalTypePrefix}-modal-checkbox[value="${status}"]`).prop('checked', true);
            });
        } else if (typeof statuses === 'string' && statuses.trim() !== '') { // Handle old string data
            $(`.${modalTypePrefix}-modal-checkbox[value="${statuses}"]`).prop('checked', true);
        }
    }

    function resetKosherStatusCheckboxes(modalTypePrefix) {
        $(`.${modalTypePrefix}-modal-checkbox`).prop('checked', false);
    }

    // --- Fetch and render establishments ---
    function renderEstablishments() {
        establishmentsCollection.orderBy("name").onSnapshot(snapshot => {
            establishmentTableBody.empty();
            let count = 0;
            if (snapshot.empty) {
                establishmentTableBody.append('<tr><td colspan="7" style="text-align:center;">No establishments found. Add one to get started!</td></tr>');
            }
            snapshot.forEach(doc => {
                count++;
                const establishment = doc.data();
                let kosherStatusDisplay = '-'; // Default
                if (Array.isArray(establishment.kosherStatus) && establishment.kosherStatus.length > 0) {
                    kosherStatusDisplay = establishment.kosherStatus.join(', ');
                } else if (typeof establishment.kosherStatus === 'string' && establishment.kosherStatus.trim() !== '') {
                    kosherStatusDisplay = establishment.kosherStatus; // For backward compatibility
                }

                // Determine active status display
                const activeStatusDisplay = (establishment.active === true || establishment.active === undefined) ? 'Yes' : 'No';

                const row = `
                    <tr>
                        <td>
                            <span class="custom-checkbox">
                                <input type="checkbox" id="checkbox${count}" name="options[]" value="${doc.id}">
                                <label for="checkbox${count}"></label>
                            </span>
                        </td>
                        <td>${establishment.name || '-'}</td>
                        <td>${establishment.location || '-'}</td>
                        <td>${kosherStatusDisplay}</td>
                        <td><a href="certificate.html?id=${doc.id}" target="_blank" class="btn btn-sm btn-outline-primary">View Cert</a></td>
                        <td>${activeStatusDisplay}</td>
                        <td>
                            <a href="#editEstablishmentModal" class="edit" data-toggle="modal" data-id="${doc.id}"><i class="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i></a>
                            <a href="#deleteEstablishmentModal" class="delete" data-toggle="modal" data-id="${doc.id}" data-name="${establishment.name || 'this establishment'}"><i class="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i></a>
                        </td>
                    </tr>
                `;
                establishmentTableBody.append(row);
            });
            totalEntriesCount.text(count);
            // Reinitialize tooltips for dynamically added elements
            $('[data-toggle="tooltip"]').tooltip();
        }, error => {
            console.error("Error fetching establishments: ", error);
            establishmentTableBody.append('<tr><td colspan="7" style="text-align:center; color:red;">Error loading establishments.</td></tr>');
        });
    }

    // --- Add Establishment ---
    addEstablishmentForm.on('submit', function(e) {
        e.preventDefault();
        const establishmentName = $('#establishment-name').val().trim();
        if (!establishmentName) {
            alert('Establishment Name is required.');
            return;
        }
        const newEstablishment = {
            name: establishmentName,
            location: $('#establishment-location').val().trim(),
            kosherStatus: getSelectedKosherStatusesFromForm('add'),
            certificateUrl: $('#establishment-certificate').val().trim(), // This is the external link
            supervisionNotes: $('#establishment-supervision-notes').val().trim(),
            validFrom: $('#establishment-valid-from').val(),
            validTo: $('#establishment-valid-to').val(),
            active: $('#establishment-active').is(':checked') // Add active status
        };

        establishmentsCollection.add(newEstablishment).then(() => {
            addEstablishmentModal.modal('hide');
            // Form reset is handled by 'hidden.bs.modal'
        }).catch(error => {
            console.error("Error adding document: ", error);
            alert("Error adding establishment: " + error.message);
        });
    });

    // --- Edit Establishment - Populate form ---
    establishmentTableBody.on('click', '.edit', function() {
        const id = $(this).data('id');
        editEstablishmentForm.attr('data-id', id); // Store ID on the form

        establishmentsCollection.doc(id).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                $('#edit-establishment-name').val(data.name || '');
                $('#edit-establishment-location').val(data.location || '');
                populateKosherStatusCheckboxes('edit', data.kosherStatus);
                $('#edit-establishment-certificate').val(data.certificateUrl || '');
                $('#edit-establishment-supervision-notes').val(data.supervisionNotes || '');
                $('#edit-establishment-valid-from').val(data.validFrom || '');
                $('#edit-establishment-valid-to').val(data.validTo || '');
                // Set the active checkbox
                $('#edit-establishment-active').prop('checked', data.active !== false); // Default to true if undefined or null
                // editEstablishmentModal.modal('show'); // Modal is shown by data-toggle attribute
            } else {
                console.error("No such document for editing!");
                alert("Could not find the establishment to edit.");
            }
        }).catch(error => {
            console.error("Error fetching document for edit: ", error);
            alert("Error fetching establishment details: " + error.message);
        });
    });

    // --- Edit Establishment - Submit form ---
    editEstablishmentForm.on('submit', function(e) {
        e.preventDefault();
        const id = $(this).attr('data-id');
        if (!id) {
            console.error("No ID found for editing.");
            alert("Cannot save changes, establishment ID is missing.");
            return;
        }
        const establishmentName = $('#edit-establishment-name').val().trim();
        if (!establishmentName) {
            alert('Establishment Name is required.');
            return;
        }
        const updatedData = {
            name: establishmentName,
            location: $('#edit-establishment-location').val().trim(),
            kosherStatus: getSelectedKosherStatusesFromForm('edit'),
            certificateUrl: $('#edit-establishment-certificate').val().trim(),
            supervisionNotes: $('#edit-establishment-supervision-notes').val().trim(),
            validFrom: $('#edit-establishment-valid-from').val(),
            validTo: $('#edit-establishment-valid-to').val(),
            active: $('#edit-establishment-active').is(':checked') // Update active status
        };

        establishmentsCollection.doc(id).update(updatedData).then(() => {
            editEstablishmentModal.modal('hide');
            // Form reset is handled by 'hidden.bs.modal'
        }).catch(error => {
            console.error("Error updating document: ", error);
            alert("Error saving changes: " + error.message);
        });
    });

    // --- Delete Establishment ---
    let idToDelete = null; // For single delete from row icon
    let nameToDelete = '';

    // Prepare for single deletion from row icon
    establishmentTableBody.on('click', '.delete', function() {
        idToDelete = $(this).data('id');
        nameToDelete = $(this).data('name');
        $('#deleteEstablishmentModal .modal-body p:first-child').html(`Are you sure you want to delete <b>${nameToDelete}</b>?`);
    });

    // Prepare for bulk deletion (triggered by main delete button)
    $('a.btn-danger[data-target="#deleteEstablishmentModal"]').on('click', function() {
        const selectedIds = [];
        $('table tbody input[type="checkbox"]:checked').each(function() {
            selectedIds.push($(this).val());
        });

        if (selectedIds.length === 0) {
            idToDelete = null; // Clear single delete if nothing is selected
            $('#deleteEstablishmentModal .modal-body p:first-child').text('Please select at least one establishment to delete.');
            // Optionally, disable the delete button in the modal footer or hide the modal
            // For now, we'll let the modal show with this message.
            // To prevent submission, clear idToDelete or handle in submit.
            return; // Or show modal with a message and prevent deletion
        } else if (selectedIds.length === 1) {
            idToDelete = selectedIds[0];
            const rowName = $(`table tbody input[value="${idToDelete}"]`).closest('tr').find('td:nth-child(2)').text();
            nameToDelete = rowName || 'the selected establishment';
            $('#deleteEstablishmentModal .modal-body p:first-child').html(`Are you sure you want to delete <b>${nameToDelete}</b>?`);
        } else {
            idToDelete = selectedIds; // Store array for batch delete
            nameToDelete = `${selectedIds.length} selected establishments`;
            $('#deleteEstablishmentModal .modal-body p:first-child').html(`Are you sure you want to delete these <b>${selectedIds.length} establishments</b>?`);
        }
    });


    // Confirm and delete
    deleteEstablishmentForm.on('submit', function(e) {
        e.preventDefault();
        if (!idToDelete) {
            alert("No establishment selected for deletion.");
            deleteEstablishmentModal.modal('hide');
            return;
        }

        const batch = db.batch();
        if (Array.isArray(idToDelete)) { // Bulk delete
            idToDelete.forEach(id => {
                batch.delete(establishmentsCollection.doc(id));
            });
        } else { // Single delete
            batch.delete(establishmentsCollection.doc(idToDelete));
        }

        batch.commit().then(() => {
            deleteEstablishmentModal.modal('hide');
            idToDelete = null; // Clear selection
            nameToDelete = '';
            $('#selectAll').prop('checked', false); // Uncheck selectAll
            // Uncheck all individual checkboxes as well
             $('table tbody input[type="checkbox"]').prop('checked', false);
        }).catch(error => {
            console.error("Error deleting document(s): ", error);
            alert("Error deleting establishment(s): " + error.message);
            deleteEstablishmentModal.modal('hide');
        });
    });


    // --- Select/Deselect checkboxes ---
    const selectAllCheckbox = $("#selectAll");
    establishmentTableBody.on('change', 'input[type="checkbox"]', function() {
        if (!this.checked) {
            selectAllCheckbox.prop('checked', false);
        } else {
            // Check if all checkboxes in body are checked
            if ($('table tbody input[type="checkbox"]:checked').length === $('table tbody input[type="checkbox"]').length) {
                selectAllCheckbox.prop('checked', true);
            }
        }
    });

    selectAllCheckbox.on('click', function() {
        $('table tbody input[type="checkbox"]').prop('checked', this.checked);
    });

    // --- Modal Cleanup on Hide ---
    $('.modal').on('hidden.bs.modal', function () {
        const form = $(this).find('form');
        if (form.length) {
            form[0].reset();
        }
        // Reset kosher status checkboxes specifically for add and edit modals
        if ($(this).is(addEstablishmentModal)) {
            resetKosherStatusCheckboxes('add');
            $('#establishment-active').prop('checked', true); // Reset active to default true
        }
        if ($(this).is(editEstablishmentModal)) {
            resetKosherStatusCheckboxes('edit');
            editEstablishmentForm.removeAttr('data-id'); // Clear stored ID
            $('#edit-establishment-active').prop('checked', false); // Reset active checkbox
        }
        if ($(this).is(deleteEstablishmentModal)) {
            idToDelete = null; // Clear delete context
            nameToDelete = '';
            $('#deleteEstablishmentModal .modal-body p:first-child').text('Are you sure you want to delete?'); // Reset message
        }
    });

    // Initial render
    renderEstablishments();

    // Activate Bootstrap tooltips
    $('[data-toggle="tooltip"]').tooltip();
});
