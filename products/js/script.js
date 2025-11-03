let productRef = db.collection('products');
let deleteIDs = [];
let clients = []; // To store clients from CRM
document.addEventListener('DOMContentLoaded', () => {
    const productRef = db.collection('products');
    const clientRef = db.collection('clients');
    
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    
    let clients = [];
    let products = [];

// REAL TIME LISTENER
productRef.onSnapshot(snapshot => {
	let changes = snapshot.docChanges();
	changes.forEach(change => {
		if (change.type == 'added') {
			// console.log('added');
			renderProduct(change.doc, true);
		} else if (change.type == 'removed') {
			let tr = $(`tr[data-id='${change.doc.id}']`);
			tr.remove();
			// console.log('removed');
		} else if (change.type == 'modified') {
			// console.log('modified');
		}
	});
    // Fetch all clients and products once to enable fast, local searching
    const fetchData = async () => {
        try {
            // Fetch clients
            const clientSnapshot = await clientRef.get();
            clients = clientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

	// UPDATE TOTAL
	let size = 0;
	if (snapshot.size) {
		size = snapshot.size;
	}
	$('.count').text(size);
	if (size == 0) {
		$('#product-table tbody').html('<tr><td colspan="7">No products found</td></tr>');
	}
});
            // Fetch products
            const productSnapshot = await productRef.get();
            products = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            console.log(`Fetched ${products.length} products and ${clients.length} clients.`);
        } catch (error) {
            console.error("Error fetching initial data:", error);
            resultsContainer.innerHTML = '<p class="no-results-message">Error: Could not connect to the product directory.</p>';
        }
    };

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
    const getClientNameById = (clientId) => {
        if (!clientId) return 'N/A';
        const client = clients.find(c => c.id === clientId);
        return client ? client.companyName : 'Unknown';
    };

// Populate client dropdowns in modals
const populateClientDropdowns = () => {
	const addClientSelect = $('#product-client');
	const editClientSelect = $('#edit-product-client');
	
	addClientSelect.empty().append('<option value="">Select a Client</option>');
	editClientSelect.empty().append('<option value="">Select a Client</option>');
    const renderResults = (results) => {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="no-results-message">No products found matching your search.</p>';
            return;
        }

	clients.forEach(client => {
		const option = `<option value="${client.id}">${client.companyName}</option>`;
		addClientSelect.append(option);
		editClientSelect.append(option);
	});
};
        resultsContainer.innerHTML = results.map(product => `
            <div class="product-card">
                <h3>${product.name}</h3>
                <p><strong>Kashrus Status:</strong> ${product.kashrus || 'N/A'}</p>
                <p><strong>UKD:</strong> ${product.ukd || 'N/A'}</p>
                <p><strong>Company:</strong> ${getClientNameById(product.clientId)}</p>
                ${product.barcode ? `<p><strong>Barcode:</strong> ${product.barcode}</p>` : ''}
            </div>
        `).join('');
    };

const getClientNameById = (clientId) => {
	if (!clientId) return 'N/A';
	const client = clients.find(c => c.id === clientId);
	return client ? client.companyName : 'N/A';
};
    const performSearch = () => {
        const query = searchInput.value.toLowerCase().trim();

        if (query.length < 2) {
            resultsContainer.innerHTML = '<p class="initial-message">Enter a search term above to find products.</p>';
            return;
        }

const displayProducts = async (doc) => {
	console.log('displayProducts');
	$('#product-table tbody').html('');
	let products;
	if (doc) {
		products = await productRef.orderBy('createdAt', 'desc').startAfter(doc).limit(100).get();
	} else {
		products = await productRef.orderBy('createdAt', 'desc').limit(100).get();
	}
        const filteredProducts = products.filter(product => {
            const clientName = getClientNameById(product.clientId).toLowerCase();
            const productName = (product.name || '').toLowerCase();
            const ukd = (product.ukd || '').toLowerCase();
            const barcode = (product.barcode || '').toLowerCase();

	const data = await products.get();
            return (
                productName.includes(query) ||
                clientName.includes(query) ||
                ukd.includes(query) ||
                barcode.includes(query)
            );
        });

	data.docs.forEach(doc => {
		renderProduct(doc);
	})
        renderResults(filteredProducts);
    };

	// UPDATE LATEST DOC
	latestDoc = products.docs[products.docs.length - 1];
    // Debounce function to limit how often the search function is called
    let debounceTimer;
    const debounceSearch = (func, delay) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, delay);
    };

	// UNATTACH EVENT LISTENERS
	$('.js-loadmore').off('click');
    searchInput.addEventListener('keyup', () => {
        debounceSearch(performSearch, 300); // Wait 300ms after user stops typing
    });

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
const addTestData = () => {
	productRef.add({
			name: 'Richard',
			kashrus: 'Mehadrin',
			ukd: 'UKD-123456',
			company: 'KRCKA',
			createdAt: firebase.firestore.FieldValue.serverTimestamp()
		})
		.then(function (docRef) {
			console.log("Document written with ID: ", docRef.id);
		})
		.catch(function (error) {
			console.error("Error adding document: ", error);
		});
}

const addProduct = (product) => {
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
	// displayProducts(); // This is handled by the real-time listener now
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

	// GET PRODUCT FOR EDIT
	$(document).on('click', ".js-edit-product", function (e) {
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

	// EDIT PRODUCT
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

		// UPDATE TABLE
		$('tr[data-id=' + id + '] td.product-name').html(productName);
		$('tr[data-id=' + id + '] td.product-kashrus').html(productKashrus);
		$('tr[data-id=' + id + '] td.product-ukd').html(productUkd);
		$('tr[data-id=' + id + '] td.product-company').html(getClientNameById(productClientId));
	});

	// DELETE PRODUCT
	$(document).on('click', ".js-delete-product", function (e) {
		e.preventDefault();
		let id = $(this).attr('id');
		$('#delete-product-form').attr('delete-id', id);
		$('#deleteProductModal').modal('show');
	});

	$("#delete-product-form").submit(function (event) {
		event.preventDefault();
		let id = $(this).attr('delete-id');
		db.collection('products').doc(id).delete();
		$('#deleteProductModal').modal('hide');
	});

	// DELETE MULTIPLE
	$("#delete-multiple-form").submit(function (event) {
		event.preventDefault();
		$('tbody tr td input:checked').each(function () {
			let id = $(this).attr('id');
			db.collection('products').doc(id).delete();
		});
		$('#deleteProductModal').modal('hide');
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
    // Initial data fetch
    fetchData();
});