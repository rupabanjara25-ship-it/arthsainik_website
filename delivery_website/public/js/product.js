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
            <div class="product-image-section" id="zoomContainer">
                <img src="${mainImage}" id="mainProductImage" alt="${product.name}">
            </div>
            <div class="product-info-section">
                <span class="product-category" style="color: var(--primary-color); font-weight: bold; font-size: 0.9rem;">${product.category ? product.category.name : 'General'}</span>
                <h1 style="font-size: 1.8rem; margin: 5px 0;">${product.name}</h1>
                <div class="price" style="font-size: 1.5rem; font-weight: 700; color: #333; margin-bottom: 10px;">₹${product.price}</div>
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">${product.description}</p>
                <div class="product-detail-actions">
                    ${product.stock > 0 
                        ? `<button type="button" class="btn-primary" onclick="addToCart('${product._id}', '${product.name}', ${product.price}, '${mainImage}')">Add to Cart</button>`
                        : `<button type="button" class="btn-primary" disabled style="background:#ccc;cursor:not-allowed;">Out of Stock</button>`
                    }
                </div>
            </div>
        `;

        // Initialize Zoom
        const zoomContainer = document.getElementById('zoomContainer');
        const zoomImg = zoomContainer.querySelector('img');
        zoomContainer.addEventListener('mousemove', (e) => {
            const rect = zoomContainer.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            zoomImg.style.transformOrigin = `${x}% ${y}%`;
            zoomImg.style.transform = "scale(2.5)";
        });
        zoomContainer.addEventListener('mouseleave', () => {
            zoomImg.style.transform = "scale(1)";
        });

        // Fetch related products from SAME category
        if (typeof fetchProducts === 'function' && product.category) {
            fetchProducts(product.category._id);
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
