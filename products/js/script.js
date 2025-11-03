let productRef = db.collection('products');
let deleteIDs = [];
let clients = []; // To store clients from CRM

// REAL TIME LISTENER
productRef.onSnapshot(snapshot => {
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
productRef.onSnapshot(snapshot => {
	let size = snapshot.size;
	$('.count').text(size);
	if (size == 0) {
		$('#selectAll').attr('disabled', true);
	} else {
		$('#selectAll').attr('disabled', false);
	}
});

// Fetch clients from CRM
const fetchClients = async () => {
	try {
		const snapshot = await db.collection('clients').orderBy('companyName').get();
		clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		populateClientDropdowns();
	} catch (error) {
		console.error("Error fetching clients: ", error);
	}
};

// Populate client dropdowns in modals
const populateClientDropdowns = () => {
	const addClientSelect = $('#product-client');
	const editClientSelect = $('#edit-product-client');
	
	addClientSelect.empty().append('<option value="">Select a Client</option>');
	editClientSelect.empty().append('<option value="">Select a Client</option>');

	clients.forEach(client => {
		const option = `<option value="${client.id}">${client.companyName}</option>`;
		addClientSelect.append(option);
		editClientSelect.append(option);
	});
};

const getClientNameById = (clientId) => {
	const client = clients.find(c => c.id === clientId);
	return client ? client.companyName : 'N/A';
};


const displayProducts = async (doc) => {
	console.log('displayProducts');

	let products = productRef;
	// .startAfter(doc || 0).limit(10000)

	const data = await products.get();

	data.docs.forEach(doc => {
		renderProduct(doc);
	})

	// UPDATE LATEST DOC
	latestDoc = data.docs[data.docs.length - 1];

	// UNATTACH EVENT LISTENERS IF NO MORE DOCS
	if (data.empty) {
		$('.js-loadmore').hide();
	}
}

const renderProduct = (doc, prepend = false) => {
	const product = doc.data();
	const clientName = getClientNameById(product.clientId);
	let item =
		`<tr data-id="${doc.id}">
				<td>
						<span class="custom-checkbox">
								<input type="checkbox" id="${doc.id}" name="options[]" value="${doc.id}">
								<label for="${doc.id}"></label>
						</span>
				</td>
				<td class="product-name">${product.name}</td>
				<td class="product-kashrus">${product.kashrus}</td>
				<td class="product-ukd">${product.ukd}</td>
				<td class="product-company">${clientName}</td>
				<td>
						<a href="#" id="${doc.id}" class="edit js-edit-product"><i class="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i>
						</a>
						<a href="#" id="${doc.id}" class="delete js-delete-product"><i class="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i>
						</a>
				</td>
		</tr>`;

	if (prepend) {
		$('#product-table tbody').prepend(item);
	} else {
		$('#product-table tbody').append(item);
	}

	// ACTIVATE TOOLTIP
	$('[data-toggle="tooltip"]').tooltip();

	// SELECT/DESELECT CHECKBOXES
	var checkbox = $('table tbody input[type="checkbox"]');
	$("#selectAll").click(function () {
		checkbox.prop('checked', this.checked);
	});
	checkbox.click(function () {
		if (!this.checked) {
			$("#selectAll").prop("checked", false);
		}
	});
}

// ADD TEST DATA
function addTestData() {
	const productsData = [{
			"name": "Cheese",
			"kashrus": "Cholov Yisroel",
			"ukd": "KLBD-D",
			"company": "Miller's Cheese"
		},
		{
			"name": "Bread",
			"kashrus": "Pas Yisroel",
			"ukd": "OU-P",
			"company": "Wonder Bread"
		},
		{
			"name": "Milk",
			"kashrus": "Cholov Yisroel",
			"ukd": "KF-D",
			"company": "Organic Valley"
		},
		{
			"name": "Cereal",
			"kashrus": "Kosher",
			"ukd": "OU",
			"company": "General Mills"
		},
		{
			"name": "Chocolate",
			"kashrus": "Pareve",
			"ukd": "OK-P",
			"company": "Elite"
		},
		{
			"name": "Wine",
			"kashrus": "Mevushal",
			"ukd": "OU-P",
			"company": "Bartenura"
		},
		{
			"name": "Cookies",
			"kashrus": "Pareve",
			"ukd": "OK-P",
			"company": "Stella D'oro"
		},
		{
			"name": "Fish",
			"kashrus": "Kosher",
			"ukd": "OU-F",
			"company": "Dagim"
		},
		{
			"name": "Meat",
			"kashrus": "Glatt Kosher",
			"ukd": "OU-M",
			"company": "Agri"
		},
		{
			"name": "Juice",
			"kashrus": "Kosher",
			"ukd": "OU",
			"company": "Kedem"
		}
	];

	productsData.forEach(product => {
		addProduct(product);
	});
}

// ADD PRODUCT
function addProduct(product) {
	productRef.add({
			name: product.name,
			kashrus: product.kashrus,
			ukd: product.ukd, // Already generated
			clientId: product.clientId,
			barcode: product.barcode,
			createdAt: firebase.firestore.FieldValue.serverTimestamp()
		})
		.then(function (docRef) {
			console.log("Document written with ID: ", docRef.id);
			$("#addProductModal").modal('hide');
			// The real-time listener will handle adding the row to the table.
		})
		.catch(function (error) {
			console.error("Error writing document: ", error);
		});
}

// INITIALIZE MATERIALIZE COMPONENTS
$(document).ready(function () {

	// DISPLAY PRODUCTS ON LOAD
	fetchClients().then(() => {
	displayProducts();
	});

	$("#add-product-form").submit(function (event) {
		event.preventDefault();
		let productName = $('#product-name').val();
		let productKashrus = $('#product-kashrus').val();
		let productUkd = $('#product-ukd').val();
		let productClientId = $('#product-client').val();
		let productBarcode = $('#product-barcode').val();

		let product = {
			name: productName,
			kashrus: productKashrus,
			ukd: productUkd,
			clientId: productClientId,
			barcode: productBarcode
		};

		addProduct(product);
	});

	// UPDATE PRODUCT
	$(document).on('click', '.js-edit-product', function (e) {
		e.preventDefault();
		let id = $(this).attr('id');
		$('#edit-product-form').attr('edit-id', id);
		db.collection('products').doc(id).get().then(function (document) {
			if (document.exists) {
				$('#edit-product-form #edit-product-name').val(document.data().name);
				$('#edit-product-form #edit-product-id').val(id);
				$('#edit-product-form #edit-product-kashrus').val(document.data().kashrus);
				$('#edit-product-form #edit-product-ukd').val(document.data().ukd);
				$('#edit-product-form #edit-product-client').val(document.data().clientId);
				$('#edit-product-form #edit-product-barcode').val(document.data().barcode || '');
				$('#editProductModal').modal('show');
			} else {
				console.log("No such document!");
			}
		}).catch(function (error) {
			console.log("Error getting document:", error);
		});
	});

	$("#edit-product-form").submit(function (event) {
		event.preventDefault();
		let id = $(this).attr('edit-id');
		let productName = $('#edit-product-form #edit-product-name').val();
		let productKashrus = $('#edit-product-form #edit-product-kashrus').val();
		let productUkd = $('#edit-product-form #edit-product-ukd').val();
		let productClientId =  $('#edit-product-form #edit-product-client').val();
		let productBarcode = $('#edit-product-form #edit-product-barcode').val();

		db.collection('products').doc(id).update({
			name: productName,
			kashrus: productKashrus,
			ukd: productUkd,
			clientId: productClientId,
			barcode: productBarcode,
			updatedAt : firebase.firestore.FieldValue.serverTimestamp()
		});

		$('#editProductModal').modal('hide');

		// SHOW UPDATED DATA ON BROWSER
		$('tr[data-id=' + id + '] td.product-name').html(productName);
		$('tr[data-id=' + id + '] td.product-kashrus').html(productKashrus);
		$('tr[data-id=' + id + '] td.product-ukd').html(productUkd);
		$('tr[data-id=' + id + '] td.product-company').html(getClientNameById(productClientId));
	});

	// DELETE PRODUCT
	$(document).on('click', '.js-delete-product', function (e) {
		e.preventDefault();
		let id = $(this).attr('id');
		$('#delete-product-form').attr('delete-id', id);
		$('#deleteProductModal').modal('show');
	});

	$("#delete-product-form").submit(function (event) {
		event.preventDefault();
		let id = $(this).attr('delete-id');
		if (id != undefined) {
			db.collection('products').doc(id).delete()
				.then(function () {
					console.log("Document successfully delete!");
					$("#deleteProductModal").modal('hide');
				})
				.catch(function (error) {
					console.error("Error deleting document: ", error);
				});
		} else {
			let checkbox = $('table tbody input:checked');
			checkbox.each(function () {
				db.collection('products').doc(this.value).delete()
					.then(function () {
						console.log("Document successfully delete!");
						displayProducts();
					})
					.catch(function (error) {
						console.error("Error deleting document: ", error);
					});
			});
			$("#deleteProductModal").modal('hide');
		}
	});

	// SEARCH
	$("#search-input").keyup(function () {
		performSearch();
	});

	const performSearch = async (barcode = null) => {
		$('#product-table tbody').html('');
		let keyword = $("#search-input").val().toLowerCase();

		let query = productRef;

		if (barcode) {
			query = query.where('barcode', '==', barcode);
		}

		const snapshot = await query.get();
		snapshot.docs.forEach(doc => {
			const product = doc.data();
			const clientName = getClientNameById(product.clientId).toLowerCase();
			const productName = product.name.toLowerCase();
			const productBarcode = product.barcode ? product.barcode.toLowerCase() : '';

			if (barcode || clientName.includes(keyword) || productName.includes(keyword) || productBarcode.includes(keyword)) {
				renderProduct(doc);
			}
		});
	};

	// Barcode Scanner
	const codeReader = new ZXing.BrowserMultiFormatReader();
	const scannerContainer = $('#scanner-container');
	const scannerVideo = scannerContainer.find('video')[0];

	$('#barcode-scanner-button').click(() => {
		scannerContainer.removeClass('hidden');
		codeReader.decodeFromVideoDevice(undefined, scannerVideo, (result, err) => {
			if (result) {
				console.log('Barcode detected:', result.getText());
				$('#search-input').val(result.getText());
				performSearch(result.getText());
				codeReader.reset();
				scannerContainer.addClass('hidden');
			}
			if (err && !(err instanceof ZXing.NotFoundException)) {
				console.error(err);
			}
		});
	});

	$('#scanner-close-button').click(() => {
		codeReader.reset();
		scannerContainer.addClass('hidden');
	});

	// Show "Add New Client" modal from within the "Add Product" modal
	$('#show-add-client-modal-btn').click(function() {
		$('#addProductModal').modal('hide');
		$('#addNewClientModal').modal('show');
	});

	// Handle new client form submission
	$('#add-new-client-form').submit(async function(event) {
		event.preventDefault();
		const newClientName = $('#new-client-name').val().trim();
		if (!newClientName) {
			alert('Please enter a client name.');
			return;
		}

		try {
			const docRef = await db.collection('clients').add({
				companyName: newClientName,
				status: 'active',
				createdAt: firebase.firestore.FieldValue.serverTimestamp()
			});
			console.log("New client added with ID:", docRef.id);

			// Refresh client list and select the new one
			await fetchClients();
			$('#product-client').val(docRef.id);

			$('#addNewClientModal').modal('hide');
			$('#addProductModal').modal('show');
		} catch (error) {
			console.error("Error adding new client:", error);
			alert('Failed to add new client.');
		}
	});

	// RESET FORMS
	$("#addProductModal").on('hidden.bs.modal', function () {
		$('#add-product-form .form-control').val('');
	});

	// Auto-generate UKD on modal show
	$('#addProductModal').on('show.bs.modal', function () {
		generateUkdCode();
	});

	const generateUkdCode = () => {
		const randomPart = Math.floor(100000 + Math.random() * 900000);
		const ukd = `UKD-${randomPart}`;
		$('#product-ukd').val(ukd);
	};

	$("#editProductModal").on('hidden.bs.modal', function () {
		$('#edit-product-form .form-control').val('');
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