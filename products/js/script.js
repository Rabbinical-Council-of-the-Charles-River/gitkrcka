document.addEventListener('DOMContentLoaded', () => {
    const productRef = db.collection('products');
    const clientRef = db.collection('clients');
    
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    
    let clients = [];
    let products = [];

    // Fetch all clients and products once to enable fast, local searching
    const fetchData = async () => {
        try {
            // Fetch clients
            const clientSnapshot = await clientRef.get();
            clients = clientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch products
            const productSnapshot = await productRef.get();
            products = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            console.log(`Fetched ${products.length} products and ${clients.length} clients.`);
        } catch (error) {
            console.error("Error fetching initial data:", error);
            resultsContainer.innerHTML = '<p class="no-results-message">Error: Could not connect to the product directory.</p>';
        }
    };

    const getClientNameById = (clientId) => {
        if (!clientId) return 'N/A';
        const client = clients.find(c => c.id === clientId);
        return client ? client.companyName : 'Unknown';
    };

    const renderResults = (results) => {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="no-results-message">No products found matching your search.</p>';
            return;
        }

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

    const performSearch = () => {
        const query = searchInput.value.toLowerCase().trim();

        if (query.length < 2) {
            resultsContainer.innerHTML = '<p class="initial-message">Enter a search term above to find products.</p>';
            return;
        }

        const filteredProducts = products.filter(product => {
            const clientName = getClientNameById(product.clientId).toLowerCase();
            const productName = (product.name || '').toLowerCase();
            const ukd = (product.ukd || '').toLowerCase();
            const barcode = (product.barcode || '').toLowerCase();

            return (
                productName.includes(query) ||
                clientName.includes(query) ||
                ukd.includes(query) ||
                barcode.includes(query)
            );
        });

        renderResults(filteredProducts);
    };

    // Debounce function to limit how often the search function is called
    let debounceTimer;
    const debounceSearch = (func, delay) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, delay);
    };

    searchInput.addEventListener('keyup', () => {
        debounceSearch(performSearch, 300); // Wait 300ms after user stops typing
    });

    // Initial data fetch
    fetchData();
});