// Product details logic
document.addEventListener('DOMContentLoaded', () => {
    fetchProductDetails();
    updateCartIcon();
});

async function fetchProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const container = document.getElementById('productContainer');

    if(!productId) {
        container.innerHTML = '<h2>Product not found</h2>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/products/${productId}`);
        const product = await res.json();

        if (!res.ok || !product || !product.name) {
            container.innerHTML = '<h2>Product not found</h2><p>This product may have been removed by the admin.</p>';
            const relatedGrid = document.getElementById('productGrid');
            if (relatedGrid) relatedGrid.innerHTML = '';
            return;
        }

        const productImages = Array.isArray(product.images) && product.images.length > 0
            ? product.images.map((image) => resolveAssetUrl(image))
            : ['https://via.placeholder.com/400'];

        let imagesHtml = '';
        const mainImage = productImages[0];
        
        if (productImages.length > 0) {
            productImages.forEach((img, idx) => {
                imagesHtml += `<img src="${img}" class="thumbnail ${idx === 0 ? 'active' : ''}" onclick="changeMainImage(this, '${img}')">`;
            });
        }

        container.innerHTML = `
            <div class="gallery">
                <img src="${mainImage}" id="mainProductImage" class="main-image" alt="${product.name}">
                <div class="thumbnails">
                    ${imagesHtml}
                </div>
            </div>
            <div class="details">
                <span class="product-category" style="color: var(--primary-color); font-weight: bold;">${product.category ? product.category.name : 'General'}</span>
                <h1>${product.name}</h1>
                <div class="price">₹${product.price}</div>
                <p>${product.description}</p>
                <div class="product-detail-actions">
                    <button type="button" class="btn-primary" onclick="addToCart('${product._id}', '${product.name}', ${product.price}, '${mainImage}')">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <button type="button" class="btn-primary" style="background: var(--secondary-color);" onclick="buyNow('${product._id}', '${product.name}', ${product.price}, '${mainImage}')">
                        <i class="fas fa-bolt"></i> Order Now
                    </button>
                </div>
            </div>
        `;

        // Fetch related products (using the main.js function, which automatically populates #productGrid)
        if (typeof fetchProducts === 'function') {
            fetchProducts();
        }

    } catch (e) {
        console.error('Error loading product', e);
        container.innerHTML = '<h2>Error loading product</h2>';
    }
}

function changeMainImage(element, src) {
    document.getElementById('mainProductImage').src = src;
    document.querySelectorAll('.thumbnail').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
}

function buyNow(id, name, price, image) {
    addToCart(id, name, price, image);
    window.location.href = 'cart.html';
}
