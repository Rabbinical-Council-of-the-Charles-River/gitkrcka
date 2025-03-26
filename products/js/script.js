let productRef = db.collection('products');
let deleteIDs = [];

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


const displayProducts = async (doc) => {
	console.log('displayProducts');

	let products = productRef;
	// .startAfter(doc || 0).limit(10000)

	const data = await products.get();

	data.docs.forEach(doc => {
		const product = doc.data();
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
					<td class="product-company">${product.company}</td>
					<td>
							<a href="#" id="${doc.id}" class="edit js-edit-product"><i class="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i>
							</a>
							<a href="#" id="${doc.id}" class="delete js-delete-product"><i class="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i>
							</a>
					</td>
			</tr>`;

		$('#product-table').append(item);

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
			ukd: product.ukd,
			company: product.company
		})
		.then(function (docRef) {
			console.log("Document written with ID: ", docRef.id);
			$("#addProductModal").modal('hide');

			let newProduct =
				`<tr data-id="${docRef.id}">
					<td>
							<span class="custom-checkbox">
									<input type="checkbox" id="${docRef.id}" name="options[]" value="${docRef.id}">
									<label for="${docRef.id}"></label>
							</span>
					</td>
					<td class="product-name">${product.name}</td>
					<td class="product-kashrus">${product.kashrus}</td>
					<td class="product-ukd">${product.ukd}</td>
					<td class="product-company">${product.company}</td>
					<td>
							<a href="#" id="${docRef.id}" class="edit js-edit-product"><i class="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i>
							</a>
							<a href="#" id="${docRef.id}" class="delete js-delete-product"><i class="material-icons" data-toggle="tooltip" title="Delete">&#xE872;</i>
							</a>
					</td>
				</tr>`;

			$('#product-table tbody').prepend(newProduct);
			})
			.catch(function (error) {
				console.error("Error writing document: ", error);
			});
}

// INITIALIZE MATERIALIZE COMPONENTS
$(document).ready(function () {

	// DISPLAY EMPLOYEES ON LOAD
	displayProducts();

	$("#add-product-form").submit(function (event) {
		event.preventDefault();
		let productName = $('#product-name').val();
		let productKashrus = $('#product-kashrus').val();
		let productUkd = $('#product-ukd').val();
		let productCompany = $('#product-company').val();

		let product = {
			name: productName,
			kashrus: productKashrus,
			ukd: productUkd,
			company: productCompany
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
				$('#edit-product-form #edit-product-kashrus').val(document.data().kashrus);
				$('#edit-product-form #edit-product-ukd').val(document.data().ukd);
				$('#edit-product-form #edit-product-company').val(document.data().company);
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
		let productCompany =  $('#edit-product-form #edit-product-company').val();

		db.collection('products').doc(id).update({
			name: productName,
			kashrus: productKashrus,
			ukd: productUkd,
			company: productCompany,
			updatedAt : firebase.firestore.FieldValue.serverTimestamp()
		});

		$('#editProductModal').modal('hide');

		// SHOW UPDATED DATA ON BROWSER
		$('tr[data-id=' + id + '] td.product-name').html(productName);
		$('tr[data-id=' + id + '] td.product-kashrus').html(productKashrus);
		$('tr[data-id=' + id + '] td.product-ukd').html(productUkd);
		$('tr[data-id=' + id + '] td.product-company').html(productCompany);
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
	$("#search-name").keyup(function () {
		$('#product-table tbody').html('');
		let nameKeyword = $("#search-name").val();
		console.log(nameKeyword);
		productRef.orderBy('name', 'asc').startAt(nameKeyword).endAt(nameKeyword + "\uf8ff").get()
			.then(function (documentSnapshots) {
				documentSnapshots.docs.forEach(doc => {
					renderProduct(doc);
				});
			});
	});

	// RESET FORMS
	$("#addProductModal").on('hidden.bs.modal', function () {
		$('#add-product-form .form-control').val('');
	});

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