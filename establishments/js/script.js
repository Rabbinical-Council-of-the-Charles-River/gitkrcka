// establishments/js/script.js

let establishmentRef = db.collection('establishments');
let deleteIDs = [];

// REAL TIME LISTENER
establishmentRef.onSnapshot(snapshot => {
	let changes = snapshot.docChanges();
	changes.forEach(change => {
		if (change.type == 'added') {
			console.log('added');
		} else if (change.type == 'modified') {
			console.log('modified');
		} else if (change.type == 'removed') {
			$('tr[data-id=' + change.doc.id + ']').remove();
			console.log('removed');
		}
	});
});

// GET TOTAL SIZE
establishmentRef.onSnapshot(snapshot => {
	let size = snapshot.size;
	$('.count').text(size);
	if (size == 0) {
		$('#selectAll').attr('disabled', true);
	} else {
		$('#selectAll').attr('disabled', false);
	}
});


const displayEstablishments = async (doc) => {
	console.log('displayEstablishments');

	let establishments = establishmentRef;
	// .startAfter(doc || 0).limit(10000)

	const data = await establishments.get();

	data.docs.forEach(doc => {
		const establishment = doc.data();
		let item =
			`<tr data-id="${doc.id}">
					<td>
							<span class="custom-checkbox">
									<input type="checkbox" id="${doc.id}" name="options[]" value="${doc.id}">
									<label for="${doc.id}"></label>
							</span>
					</td>
					<td class="establishment-name">${establishment.name}</td>
					<td class="establishment-location">${establishment.location}</td>
					<td class="establishment-company">${establishment.company}</td>
					<td class="establishment-kosher-status">${establishment.kosherStatus}</td>
					<td class="establishment-certificate"><a href="${establishment.certificate}" target="_blank">View</a></td>
					<td>
							<a href="#" id="${doc.id}" class="edit js-edit-establishment"><i class="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i>
							</a>
							<a href="#" id="${doc.id}" class="delete js-delete-establishment"><i class="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i>
							</a>
					</td>
			</tr>`;

		$('#establishment-table').append(item);

		// ACTIVATE TOOLTIP
		$('[data-toggle="tooltip"]').tooltip();

		// SELECT/DESELECT CHECKBOXES
		var checkbox = $('table tbody input[type="checkbox"]');
		$("#selectAll").click(function () {
			if (this.checked) {
				checkbox.each(function () {
					console.log(this.id);
					deleteIDs.push(this.id);
					this.checked = true;
				});
			} else {
				checkbox.each(function () {
					this.checked = false;
				});
			}
		});
		checkbox.click(function () {
			if (!this.checked) {
				$("#selectAll").prop("checked", false);
			}
		});
	})

	// UPDATE LATEST DOC
	latestDoc = data.docs[data.docs.length - 1];

	// UNATTACH EVENT LISTENERS IF NO MORE DOCS
	if (data.empty) {
		$('.js-loadmore').hide();
	}
}

// ADD TEST DATA
function addTestData() {
	const establishmentsData = [
		{
			"name": "Miller's Bakery",
			"location": "123 Main St, Brooklyn, NY",
			"company": "Miller's Inc.",
			"kosherStatus": "Cholov Yisroel",
			"certificate": "https://www.example.com/millers-certificate.pdf"
		},
		{
			"name": "Wonder Cafe",
			"location": "456 Ocean Ave, Lakewood, NJ",
			"company": "Wonder Foods",
			"kosherStatus": "Pas Yisroel",
			"certificate": "https://www.example.com/wonder-certificate.pdf"
		},
		{
			"name": "Organic Delights",
			"location": "789 Broad St, Monsey, NY",
			"company": "Organic Co.",
			"kosherStatus": "Cholov Yisroel",
			"certificate": "https://www.example.com/organic-certificate.pdf"
		},
		{
			"name": "General Grills",
			"location": "101 Central Park, Queens, NY",
			"company": "Grills Ltd.",
			"kosherStatus": "Kosher",
			"certificate": "https://www.example.com/grills-certificate.pdf"
		},
		{
			"name": "Elite Sweets",
			"location": "202 Liberty Ave, Manhattan, NY",
			"company": "Elite Brands",
			"kosherStatus": "Pareve",
			"certificate": "https://www.example.com/elite-certificate.pdf"
		},
		{
			"name": "Bartenura Bistro",
			"location": "303 River Rd, Clifton, NJ",
			"company": "Bartenura Group",
			"kosherStatus": "Mevushal",
			"certificate": "https://www.example.com/bartenura-certificate.pdf"
		},
		{
			"name": "Stella D'oro Pizzeria",
			"location": "404 Park Pl, Boro Park, NY",
			"company": "Stella Inc.",
			"kosherStatus": "Pareve",
			"certificate": "https://www.example.com/stella-certificate.pdf"
		},
		{
			"name": "Dagim Seafood",
			"location": "505 Beach Ave, Deal, NJ",
			"company": "Dagim Co.",
			"kosherStatus": "Kosher",
			"certificate": "https://www.example.com/dagim-certificate.pdf"
		},
		{
			"name": "Agri Steakhouse",
			"location": "606 Highland Blvd, Five Towns, NY",
			"company": "Agri Steaks",
			"kosherStatus": "Glatt Kosher",
			"certificate": "https://www.example.com/agri-certificate.pdf"
		},
		{
			"name": "Kedem Cafe",
			"location": "707 Main St, Passaic, NJ",
			"company": "Kedem Foods",
			"kosherStatus": "Kosher",
			"certificate": "https://www.example.com/kedem-certificate.pdf"
		}
	];

	establishmentsData.forEach(establishment => {
		addEstablishment(establishment);
	});
}

// ADD ESTABLISHMENT
function addEstablishment(establishment) {
	establishmentRef.add({
			name: establishment.name,
			location: establishment.location,
			company: establishment.company,
			kosherStatus: establishment.kosherStatus,
			certificate: establishment.certificate
		})
		.then(function (docRef) {
			console.log("Document written with ID: ", docRef.id);
			$("#addEstablishmentModal").modal('hide');

			let newEstablishment =
				`<tr data-id="${docRef.id}">
					<td>
							<span class="custom-checkbox">
									<input type="checkbox" id="${docRef.id}" name="options[]" value="${docRef.id}">
									<label for="${docRef.id}"></label>
							</span>
					</td>
					<td class="establishment-name">${establishment.name}</td>
					<td class="establishment-location">${establishment.location}</td>
					<td class="establishment-company">${establishment.company}</td>
					<td class="establishment-kosher-status">${establishment.kosherStatus}</td>
					<td class="establishment-certificate"><a href="${establishment.certificate}" target="_blank">View</a></td>
                    <td>
							<a href="#" id="${docRef.id}" class="edit js-edit-establishment"><i class="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i>
							</a>
							<a href="#" id="${docRef.id}" class="delete js-delete-establishment"><i class="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i>
							</a>
					</td>
				</tr>`;

			$('#establishment-table tbody').prepend(newEstablishment);
			})
			.catch(function (error) {
				console.error("Error writing document: ", error);
			});
}

// INITIALIZE MATERIALIZE COMPONENTS
$(document).ready(function () {

	// DISPLAY EMPLOYEES ON LOAD
	displayEstablishments();
   // addTestData()

	$("#add-establishment-form").submit(function (event) {
		event.preventDefault();
		let establishmentName = $('#establishment-name').val();
		let establishmentLocation = $('#establishment-location').val();
		let establishmentCompany = $('#establishment-company').val();
		let establishmentKosherStatus = $('#establishment-kosher-status').val();
		let establishmentCertificate = $('#establishment-certificate').val();

		let establishment = {
			name: establishmentName,
			location: establishmentLocation,
			company: establishmentCompany,
			kosherStatus: establishmentKosherStatus,
			certificate: establishmentCertificate
		};

		addEstablishment(establishment);
	});

	// UPDATE ESTABLISHMENT
	$(document).on('click', '.js-edit-establishment', function (e) {
		e.preventDefault();
		let id = $(this).attr('id');
		$('#edit-establishment-form').attr('edit-id', id);
		db.collection('establishments').doc(id).get().then(function (document) {
			if (document.exists) {
				$('#edit-establishment-form #edit-establishment-name').val(document.data().name);
				$('#edit-establishment-form #edit-establishment-location').val(document.data().location);
				$('#edit-establishment-form #edit-establishment-company').val(document.data().company);
				$('#edit-establishment-form #edit-establishment-kosher-status').val(document.data().kosherStatus);
				$('#edit-establishment-form #edit-establishment-certificate').val(document.data().certificate);

				$('#editEstablishmentModal').modal('show');
			} else {
				console.log("No such document!");
			}
		}).catch(function (error) {
			console.log("Error getting document:", error);
		});
	});

	$("#edit-establishment-form").submit(function (event) {
		event.preventDefault();
		let id = $(this).attr('edit-id');
		let establishmentName = $('#edit-establishment-form #edit-establishment-name').val();
		let establishmentLocation = $('#edit-establishment-form #edit-establishment-location').val();
		let establishmentCompany = $('#edit-establishment-form #edit-establishment-company').val();
		let establishmentKosherStatus = $('#edit-establishment-form #edit-establishment-kosher-status').val();
		let establishmentCertificate = $('#edit-establishment-form #edit-establishment-certificate').val();

		db.collection('establishments').doc(id).update({
			name: establishmentName,
			location: establishmentLocation,
			company: establishmentCompany,
			kosherStatus: establishmentKosherStatus,
			certificate: establishmentCertificate,
			updatedAt : firebase.firestore.FieldValue.serverTimestamp()
		});

		$('#editEstablishmentModal').modal('hide');

		// SHOW UPDATED DATA ON BROWSER
		$('tr[data-id=' + id + '] td.establishment-name').html(establishmentName);
		$('tr[data-id=' + id + '] td.establishment-location').html(establishmentLocation);
		$('tr[data-id=' + id + '] td.establishment-company').html(establishmentCompany);
		$('tr[data-id=' + id + '] td.establishment-kosher-status').html(establishmentKosherStatus);
		$('tr[data-id=' + id + '] td.establishment-certificate').html(`<a href="${establishmentCertificate}" target="_blank">View</a>`);
	});

	// DELETE ESTABLISHMENT
	$(document).on('click', '.js-delete-establishment', function (e) {
		e.preventDefault();
		let id = $(this).attr('id');
		$('#delete-establishment-form').attr('delete-id', id);
		$('#deleteEstablishmentModal').modal('show');
	});

	$("#delete-establishment-form").submit(function (event) {
		event.preventDefault();
		let id = $(this).attr('delete-id');
		if (id != undefined) {
			db.collection('establishments').doc(id).delete()
				.then(function () {
					console.log("Document successfully delete!");
					$("#deleteEstablishmentModal").modal('hide');
				})
				.catch(function (error) {
					console.error("Error deleting document: ", error);
				});
		} else {
			let checkbox = $('table tbody input:checked');
			checkbox.each(function () {
				db.collection('establishments').doc(this.value).delete()
					.then(function () {
						console.log("Document successfully delete!");
						displayEstablishments();
					})
					.catch(function (error) {
						console.error("Error deleting document: ", error);
					});
			});
			$("#deleteEstablishmentModal").modal('hide');
		}
	});

	// SEARCH
	$("#search-name").keyup(function () {
		$('#establishment-table tbody').html('');
		let nameKeyword = $("#search-name").val();
		console.log(nameKeyword);
		establishmentRef.orderBy('name', 'asc').startAt(nameKeyword).endAt(nameKeyword + "\uf8ff").get()
			.then(function (documentSnapshots) {
				documentSnapshots.docs.forEach(doc => {
					renderEstablishment(doc);
				});
			});
	});

	// RESET FORMS
	$("#addEstablishmentModal").on('hidden.bs.modal', function () {
		$('#add-establishment-form .form-control').val('');
	});

	$("#editEstablishmentModal").on('hidden.bs.modal', function () {
		$('#edit-establishment-form .form-control').val('');
	});
});

// CENTER MODAL
(function ($) {
	"use strict";

	function centerModal() {
		$(this).css('display', 'block');
		var $dialog = $(this).find(".modal-dialog"),
			offset = ($(window).height() - $dialog.height()) / 2,
			bottomMargin = parseInt($dialog.css('marginBottom'), 10);

		// Make sure you don't hide the top part of the modal w/ a negative margin if it's longer than the screen height, and keep the margin equal to the bottom margin of the modal
		if (offset < bottomMargin) offset = bottomMargin;
		$dialog.css("margin-top", offset);
	}

	$(document).on('show.bs.modal', '.modal', centerModal);
	$(window).on("resize", function () {
		$('.modal:visible').each(centerModal);
	});
}(jQuery));
