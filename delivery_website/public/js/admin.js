
if (typeof API_BASE_URL === 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    const isLocalPreview = protocol === 'file:' || ['localhost', '127.0.0.1'].includes(hostname);

    window.API_BASE_URL = isLocalPreview && port !== '5000'
        ? `http://${hostname || '127.0.0.1'}:5000/api`
        : `${origin}/api`;
}

function getStoredUserInfo() {
    try {
        const storedUser = JSON.parse(localStorage.getItem('userInfo'));
        return storedUser && typeof storedUser === 'object' ? storedUser : null;
    } catch (error) {
        console.error('Error reading user info from storage', error);
        localStorage.removeItem('userInfo');
        return null;
    }
}

let revenueChart = null;
let trafficChart = null;
let categoryChart = null;
let currentEditingProductImages = [];
let selectedGalleryFiles = [];

function toggleOtherCategoryInput() {
    const select = document.getElementById('new-prod-cat');
    const otherInput = document.getElementById('new-prod-cat-other');
    if (!select || !otherInput) return;

    const isOther = select.value === '__other__';
    otherInput.style.display = isOther ? 'block' : 'none';
    otherInput.required = isOther;
    if (!isOther) {
        otherInput.value = '';
    }
}

async function createCategoryFromInput(categoryName) {
    const userInfo = getStoredUserInfo();
    if (!userInfo || !userInfo.token) {
        throw new Error('Please login as admin first');
    }

    const formData = new FormData();
    formData.append('name', categoryName);

    const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${userInfo.token}`
        },
        body: formData
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || 'Failed to create category');
    }

    return result;
}

function syncGalleryFileInput() {
    const galleryImageInput = document.getElementById('product-gallery-image-input');
    if (!galleryImageInput) return;

    const dataTransfer = new DataTransfer();
    selectedGalleryFiles.forEach((file) => dataTransfer.items.add(file));
    galleryImageInput.files = dataTransfer.files;
}

function renderMainImagePreview(imageSrc) {
    const previewContainer = document.getElementById('main-preview-container');
    const previewImg = document.getElementById('main-upload-preview');
    const uploadIcon = document.getElementById('main-upload-icon');
    const uploadText = document.getElementById('main-upload-text');

    if (!previewContainer || !previewImg || !uploadIcon || !uploadText) return;

    if (imageSrc) {
        previewImg.src = resolveAssetUrl(imageSrc);
        previewContainer.style.display = 'block';
        uploadIcon.style.display = 'none';
        uploadText.style.display = 'none';
        return;
    }

    previewImg.removeAttribute('src');
    previewContainer.style.display = 'none';
    uploadIcon.style.display = '';
    uploadText.style.display = '';
}

function renderGalleryImagePreviews(images) {
    const container = document.getElementById('gallery-preview-container');
    const grid = document.getElementById('gallery-preview-grid');
    if (!container || !grid) return;

    if (!Array.isArray(images) || images.length === 0) {
        grid.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    grid.innerHTML = images.map((image, index) => {
        const src = typeof image === 'string' ? image : image.src;
        const source = typeof image === 'string' ? 'existing' : image.source;
        const fileIndex = typeof image === 'string' ? index : image.fileIndex;
        return `
        <div style="position:relative;">
            <img
                src="${resolveAssetUrl(src)}"
                alt="Gallery preview ${index + 1}"
                style="width:100%;height:84px;object-fit:cover;border-radius:10px;border:1px solid var(--border-color);"
            />
            <button
                type="button"
                onclick="removeGalleryImage('${source}', ${fileIndex})"
                style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:#fff;border:none;width:24px;height:24px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.18);"
                title="Remove image"
            >
                <i class="fa-solid fa-times" style="font-size:0.75rem;"></i>
            </button>
        </div>
    `;
    }).join('');
    container.style.display = 'block';
}

function resetProductImageInputs() {
    currentEditingProductImages = [];
    selectedGalleryFiles = [];
    const mainImageInput = document.getElementById('product-main-image-input');
    const galleryImageInput = document.getElementById('product-gallery-image-input');

    if (mainImageInput) mainImageInput.value = '';
    if (galleryImageInput) galleryImageInput.value = '';

    renderMainImagePreview('');
    renderGalleryImagePreviews([]);
}

function getGalleryPreviewItems() {
    const existingGalleryImages = currentEditingProductImages.slice(1).map((src, index) => ({
        src,
        source: 'existing',
        fileIndex: index
    }));

    const selectedGalleryPreviews = selectedGalleryFiles.map((file, index) => ({
        src: URL.createObjectURL(file),
        source: 'selected',
        fileIndex: index
    }));

    return [...existingGalleryImages, ...selectedGalleryPreviews];
}

window.removeGalleryImage = function(source, index) {
    if (source === 'existing') {
        currentEditingProductImages.splice(index + 1, 1);
    } else if (source === 'selected') {
        selectedGalleryFiles.splice(index, 1);
        syncGalleryFileInput();
    }

    renderGalleryImagePreviews(getGalleryPreviewItems());
};

function removeCurrentMainImage() {
    const mainImageInput = document.getElementById('product-main-image-input');
    if (mainImageInput) mainImageInput.value = '';

    if (currentEditingProductImages.length > 0) {
        currentEditingProductImages.shift();
    }

    renderMainImagePreview(currentEditingProductImages[0] || '');
    renderGalleryImagePreviews(getGalleryPreviewItems());
}

// ========= TOAST NOTIFICATION =========
function showToast(message, type = 'success') {
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    const colors = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: ${colors[type] || colors.success};
        color: white; padding: 1rem 1.5rem; border-radius: 12px;
        font-family: 'Outfit', sans-serif; font-weight: 500;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        animation: fadeIn 0.3s ease; max-width: 350px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========= MAIN INIT =========
document.addEventListener('DOMContentLoaded', () => {
    const userInfo = getStoredUserInfo();
    if (!userInfo || userInfo.role !== 'admin') {
        alert('Unauthorized Area. Redirecting to home.');
        window.location.href = 'index.html';
        return;
    }

    const body = document.body;
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const mobileSidebarBackdrop = document.getElementById('mobileSidebarBackdrop');

    const openAdminNav = () => body.classList.add('admin-nav-open');
    const closeAdminNav = () => body.classList.remove('admin-nav-open');

    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', openAdminNav);
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeAdminNav);
    }

    if (mobileSidebarBackdrop) {
        mobileSidebarBackdrop.addEventListener('click', closeAdminNav);
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeAdminNav();
        }
    });

    // Navigation Active State Setup
    const navLinks = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            const targetId = this.getAttribute('data-target');
            if (targetId) {
                tabContents.forEach(content => {
                    content.style.display = 'none';
                    content.classList.remove('active');
                });
                
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.style.display = 'block';
                    targetElement.classList.add('active');
                }

                // Load data specific to tab
                if(targetId === 'dashboard') loadDashboard();
                if(targetId === 'products') loadProducts();
                if(targetId === 'customers') loadCustomers();
                if(targetId === 'analytics') loadAnalytics();
                if(targetId === 'orders') loadAllOrders();
                if(targetId === 'messages') loadFeedbackInbox();
                if(targetId === 'add-product') {
                    loadCategories();
                    if (!editingProductId) {
                        const addProductForm = document.getElementById('add-product-form');
                        if (addProductForm) addProductForm.reset();
                        resetProductImageInputs();
                        toggleOtherCategoryInput();
                        document.getElementById('add-product').querySelector('h1').textContent = 'Add Product';
                        const submitBtn = document.getElementById('add-product')?.querySelector('.btn-primary');
                        if (submitBtn) submitBtn.textContent = 'Save Product';
                    }
                }
            }

            closeAdminNav();
        });
    });

    // Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userInfo');
            window.location.href = 'index.html';
        });
    }

    // ========= SEARCH FILTERS =========
    const customerSearch = document.getElementById('customer-search');
    if (customerSearch) {
        customerSearch.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#customers tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        productSearch.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#products tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    const orderSearch = document.getElementById('order-search');
    if (orderSearch) {
        orderSearch.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#orders tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    const orderStatusFilter = document.getElementById('order-status-filter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', function() {
            const status = this.value.toLowerCase();
            const rows = document.querySelectorAll('#orders tbody tr');
            rows.forEach(row => {
                if (!status) { row.style.display = ''; return; }
                const rowStatus = row.querySelector('.status')?.textContent.toLowerCase();
                row.style.display = rowStatus?.includes(status) ? '' : 'none';
            });
        });
    }

    const categorySelect = document.getElementById('new-prod-cat');
    if (categorySelect) {
        categorySelect.addEventListener('change', toggleOtherCategoryInput);
    }

    // ========= IMAGE UPLOAD PREVIEW =========
    const mainImageInput = document.getElementById('product-main-image-input');
    const galleryImageInput = document.getElementById('product-gallery-image-input');

    if (mainImageInput) {
        mainImageInput.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) {
                renderMainImagePreview(currentEditingProductImages[0] || '');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                renderMainImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    if (galleryImageInput) {
        galleryImageInput.addEventListener('change', function() {
            const files = Array.from(this.files || []);
            if (files.length === 0) {
                selectedGalleryFiles = [];
                renderGalleryImagePreviews(getGalleryPreviewItems());
                return;
            }

            if (files.length > 5) {
                showToast('You can upload up to 5 additional images.', 'error');
                this.value = '';
                selectedGalleryFiles = [];
                renderGalleryImagePreviews(getGalleryPreviewItems());
                return;
            }

            selectedGalleryFiles = files;
            syncGalleryFileInput();
            renderGalleryImagePreviews(getGalleryPreviewItems());
        });
    }

    const removeMainImageBtn = document.getElementById('remove-main-image-btn');
    if (removeMainImageBtn) {
        removeMainImageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            removeCurrentMainImage();
        });
    }

    // ========= CUSTOMER MODAL =========
    const customerModal = document.getElementById('add-customer-modal');
    const openCustomerModalBtn = document.getElementById('open-customer-modal-btn');
    const closeCustomerModal = document.getElementById('close-customer-modal');
    const addCustomerForm = document.getElementById('add-customer-form');

    if (openCustomerModalBtn && customerModal) {
        openCustomerModalBtn.addEventListener('click', () => {
            document.getElementById('add-customer-modal').querySelector('h2').textContent = 'Add New Customer';
            document.getElementById('add-customer-modal').querySelector('.btn-primary').textContent = 'Save Customer';
            addCustomerForm.reset();
            customerModal.style.display = 'flex';
        });
        
        closeCustomerModal.addEventListener('click', () => {
            customerModal.style.display = 'none';
        });

        customerModal.addEventListener('click', (e) => {
            if (e.target === customerModal) customerModal.style.display = 'none';
        });

        if (addCustomerForm) {
            addCustomerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                showToast('Customer feature is view-only (managed via user registration)');
                customerModal.style.display = 'none';
                addCustomerForm.reset();
            });
        }
    }

    // ========= ADD / EDIT PRODUCT FORM =========
    let editingProductId = null;
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const userInfo = getStoredUserInfo();
            if(!userInfo || !userInfo.token) {
                showToast('Please login as admin first', 'error');
                return;
            }

            const name = document.getElementById('new-prod-name')?.value;
            const price = document.getElementById('new-prod-price')?.value;
            let cat = document.getElementById('new-prod-cat')?.value;
            const otherCategoryInput = document.getElementById('new-prod-cat-other');
            const description = document.getElementById('new-prod-desc')?.value;
            const mainImageInput = document.getElementById('product-main-image-input');
            const galleryImageInput = document.getElementById('product-gallery-image-input');
            const mainImageFile = mainImageInput?.files?.[0] || null;
            const galleryFiles = [...selectedGalleryFiles];

            if (!name || !price || !cat || !description) {
                showToast('Please fill all required fields', 'error');
                return;
            }

            if (!editingProductId && !mainImageFile) {
                showToast('Please upload a main product image.', 'error');
                return;
            }

            if (cat === '__other__') {
                const newCategoryName = otherCategoryInput?.value?.trim();
                if (!newCategoryName) {
                    showToast('Please enter the new category name.', 'error');
                    return;
                }

                try {
                    const createdCategory = await createCategoryFromInput(newCategoryName);
                    cat = createdCategory._id;
                    await loadCategories(cat);
                } catch (error) {
                    showToast(error.message || 'Failed to create category', 'error');
                    return;
                }
            }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('category', cat);
            formData.append('description', description);
            formData.append('existingImages', JSON.stringify(currentEditingProductImages));
            
            if (mainImageFile) {
                formData.append('productMainImage', mainImageFile);
            }

            galleryFiles.forEach((file) => {
                formData.append('productGalleryImages', file);
            });

            if ((mainImageFile ? 1 : 0) + galleryFiles.length > 6) {
                showToast('You can upload 1 main image and up to 5 additional images.', 'error');
                return;
            }

            try {
                const submitBtn = addProductForm.querySelector('.btn-primary');
                submitBtn.textContent = 'Saving...';
                submitBtn.disabled = true;

                const url = editingProductId 
                    ? `${API_BASE_URL}/products/${editingProductId}` 
                    : `${API_BASE_URL}/products`;
                const method = editingProductId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${userInfo.token}`
                    },
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(editingProductId ? 'Product Updated Successfully!' : 'Product Added Successfully!');
                    addProductForm.reset();
                    editingProductId = null;
                    resetProductImageInputs();
                    
                    // Reset form headers
                    document.getElementById('add-product').querySelector('h1').textContent = 'Add Product';
                    submitBtn.textContent = 'Save Product';
                    submitBtn.disabled = false;

                    // Refresh products table and navigate back
                    loadProducts();
                    const productsTab = document.querySelector('[data-target="products"]');
                    if (productsTab) productsTab.click();
                } else {
                    showToast('Error: ' + result.message, 'error');
                    submitBtn.textContent = editingProductId ? 'Update Product' : 'Save Product';
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error saving product:', error);
                showToast('Failed to save product. Check console.', 'error');
                const submitBtn = addProductForm.querySelector('.btn-primary');
                submitBtn.textContent = editingProductId ? 'Update Product' : 'Save Product';
                submitBtn.disabled = false;
            }
        });
    }

    // ========= EDIT / DELETE PRODUCT (global functions) =========
    window.editProduct = async function(id) {
        editingProductId = id;
        try {
            const response = await fetch(`${API_BASE_URL}/products/${id}`);
            const product = await response.json();
            
            if (response.ok) {
                currentEditingProductImages = Array.isArray(product.images) ? product.images : [];
                selectedGalleryFiles = [];
                if (galleryImageInput) galleryImageInput.value = '';
                document.getElementById('new-prod-name').value = product.name;
                document.getElementById('new-prod-price').value = product.price;
                document.getElementById('new-prod-desc').value = product.description || '';
                
                renderMainImagePreview(currentEditingProductImages[0] || '');
                renderGalleryImagePreviews(getGalleryPreviewItems());

                document.getElementById('add-product').querySelector('h1').textContent = 'Edit Product';
                document.getElementById('add-product').querySelector('.btn-primary').textContent = 'Update Product';
                
                // Load categories before switching
                await loadCategories(product.category?._id || product.category);
                
                const addProductMenu = document.querySelector('[data-target="add-product"]');
                if (addProductMenu) addProductMenu.click();
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            showToast('Failed to load product details', 'error');
        }
    };

    window.deleteProduct = async function(id) {
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
        
        const userInfo = getStoredUserInfo();
        if(!userInfo || !userInfo.token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${userInfo.token}`
                }
            });

            if (response.ok) {
                showToast('Product Deleted Successfully');
                loadProducts();
            } else {
                const result = await response.json();
                showToast('Error: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            showToast('Failed to delete product.', 'error');
        }
    };

    // ========= UPDATE ORDER STATUS (global function) =========
    window.updateOrderStatus = async function(orderId, newStatus) {
        const userInfo = getStoredUserInfo();
        if(!userInfo || !userInfo.token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userInfo.token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                showToast(`Order status updated to "${newStatus}"`);
                loadAllOrders();
                loadDashboard(); // Refresh dashboard stats too
            } else {
                const result = await response.json();
                showToast('Error: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            showToast('Failed to update order status.', 'error');
        }
    };

    const feedbackSearchInput = document.getElementById('feedbackSearchInput');
    if (feedbackSearchInput) {
        feedbackSearchInput.addEventListener('input', function(e) {
            filterFeedbackInbox(e.target.value);
        });
    }

    // ========= PDF DOWNLOAD =========
    function downloadPDF(elementId, filename) {
        const element = document.getElementById(elementId);
        if (!element) return;
        const opt = {
            margin: 0.5, filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    }

    document.getElementById('download-sales-report')?.addEventListener('click', () => downloadPDF('dashboard', 'Sales_Report.pdf'));
    document.getElementById('download-inventory-report')?.addEventListener('click', () => downloadPDF('products', 'Inventory_Report.pdf'));
    document.getElementById('download-tax-report')?.addEventListener('click', () => downloadPDF('dashboard', 'Tax_Summary.pdf'));

    // ========= INITIAL LOAD =========
    loadDashboard();
    loadProducts();
    loadFeedbackInbox();
});

// ===================================================
// ============ DATA LOADING FUNCTIONS ===============
// ===================================================

async function loadDashboard() {
    const userInfo = getStoredUserInfo();
    if(!userInfo || !userInfo.token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/orders/stats`, {
            headers: { 'Authorization': `Bearer ${userInfo.token}` }
        });
        const stats = await res.json();
        
        if (res.ok) {
            // Update Stats Cards
            const revenueEl = document.querySelector('#dashboard .stat-card:nth-child(1) h2');
            const ordersEl = document.querySelector('#dashboard .stat-card:nth-child(2) h2');
            if (revenueEl) revenueEl.textContent = `₹${stats.totalRevenue.toLocaleString()}`;
            if (ordersEl) ordersEl.textContent = stats.totalOrders.toLocaleString();
            
            // Get customer count
            const userRes = await fetch(`${API_BASE_URL}/auth/users`, {
                headers: { 'Authorization': `Bearer ${userInfo.token}` }
            });
            const users = await userRes.json();
            if(userRes.ok) {
                const customersEl = document.querySelector('#dashboard .stat-card:nth-child(3) h2');
                if (customersEl) customersEl.textContent = users.length;
            }

            // Update Revenue Chart on Dashboard
            updateDashboardChart(stats);

            // Load Recent Orders
            loadRecentOrders();
            loadFeedbackInbox();
        }
    } catch (e) {
        console.error('Error loading dashboard stats', e);
    }
}

let feedbackInboxItems = [];

async function loadFeedbackInbox() {
    const userInfo = getStoredUserInfo();
    if (!userInfo || !userInfo.token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/orders/feedback`, {
            headers: { 'Authorization': `Bearer ${userInfo.token}` }
        });
        const feedbacks = await res.json();

        if (!res.ok) {
            throw new Error(feedbacks.message || 'Failed to load feedback');
        }

        feedbackInboxItems = Array.isArray(feedbacks) ? feedbacks : [];
        renderFeedbackInbox(feedbackInboxItems);
        updateFeedbackIndicators(feedbackInboxItems.length);
    } catch (error) {
        console.error('Error loading feedback inbox', error);
        renderFeedbackInbox([]);
        updateFeedbackIndicators(0);
    }
}

function updateFeedbackIndicators(count) {
    const feedbackBadge = document.getElementById('feedbackBadge');
    const feedbackDot = document.getElementById('adminFeedbackDot');

    if (feedbackBadge) {
        feedbackBadge.textContent = `${count} New`;
        feedbackBadge.style.display = count ? 'inline-flex' : 'none';
    }

    if (feedbackDot) {
        feedbackDot.style.display = count ? 'block' : 'none';
    }
}

function filterFeedbackInbox(searchTerm) {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) {
        renderFeedbackInbox(feedbackInboxItems);
        return;
    }

    const filtered = feedbackInboxItems.filter((item) => {
        const haystack = [
            item.customerName,
            item.customerEmail,
            item.message,
            item.orderCode,
            Array.isArray(item.products) ? item.products.map((prod) => prod.name).join(' ') : '',
        ]
            .join(' ')
            .toLowerCase();
        return haystack.includes(term);
    });

    renderFeedbackInbox(filtered);
}

function renderFeedbackInbox(items) {
    const chatList = document.getElementById('feedbackChatList');
    const messages = document.getElementById('feedbackMessages');
    const profile = document.getElementById('feedbackChatProfile');

    if (!chatList || !messages || !profile) return;

    if (!items.length) {
        chatList.innerHTML = `
            <div class="chat-item active" style="cursor:default;">
                <div class="chat-info">
                    <h4>No feedback yet</h4>
                    <p>Customer feedback will appear here.</p>
                </div>
            </div>
        `;
        profile.querySelector('span').textContent = 'Feedback Inbox';
        messages.innerHTML = `
            <div class="message incoming">
                <p>No feedback has been submitted yet.</p>
                <span class="time">Waiting for customer updates</span>
            </div>
        `;
        return;
    }

    chatList.innerHTML = items
        .map((item, index) => `
            <div class="chat-item ${index === 0 ? 'active unread' : 'unread'}" data-feedback-id="${item.id}">
                <img src="https://i.pravatar.cc/150?u=${encodeURIComponent(item.customerName)}" alt="${item.customerName}">
                <div class="chat-info">
                    <h4>${item.customerName}</h4>
                    <p>${item.message}</p>
                </div>
                <span class="chat-time">${formatAdminDate(item.createdAt, true)}</span>
            </div>
        `)
        .join('');

    const chatItems = chatList.querySelectorAll('.chat-item');
    chatItems.forEach((chatItem) => {
        chatItem.addEventListener('click', () => {
            chatItems.forEach((node) => node.classList.remove('active'));
            chatItem.classList.add('active');
            chatItem.classList.remove('unread');
            const selected = items.find((item) => item.id === chatItem.dataset.feedbackId);
            if (selected) {
                renderFeedbackThread(selected);
            }
        });
    });

    renderFeedbackThread(items[0]);
}

function renderFeedbackThread(item) {
    const profile = document.getElementById('feedbackChatProfile');
    const messages = document.getElementById('feedbackMessages');
    if (!profile || !messages || !item) return;

    const profileImg = profile.querySelector('img');
    const profileText = profile.querySelector('span');
    if (profileImg) {
        profileImg.src = `https://i.pravatar.cc/150?u=${encodeURIComponent(item.customerName)}`;
    }
    if (profileText) {
        profileText.textContent = `${item.customerName} ${item.orderCode}`;
    }

    const productList = Array.isArray(item.products)
        ? item.products.map((product) => `${product.name} x${product.qty}`).join(', ')
        : '';

    messages.innerHTML = `
        <div class="message incoming">
            <p><strong>${item.customerName}</strong> rated this order ${item.rating}/5 and shared: "${item.message}"</p>
            <span class="time">${formatAdminDate(item.createdAt)}</span>
        </div>
        <div class="message incoming">
            <p>
                Order: ${item.orderCode}<br>
                Status: ${item.status}<br>
                Total: ₹${Number(item.totalPrice || 0).toLocaleString()}<br>
                Delivered: ${item.deliveredAt ? formatAdminDate(item.deliveredAt) : 'Not delivered yet'}<br>
                Products: ${productList || 'N/A'}
            </p>
            <span class="time">${item.customerEmail || 'Customer feedback notification'}</span>
        </div>
    `;
}

function formatAdminDate(value, compact = false) {
    const date = new Date(value);
    return date.toLocaleString('en-IN', compact
        ? { day: 'numeric', month: 'short' }
        : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function updateDashboardChart(stats) {
    if (revenueChart) revenueChart.destroy();
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const labels = stats.monthlyRevenue ? stats.monthlyRevenue.map(m => m.name) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = stats.monthlyRevenue ? stats.monthlyRevenue.map(m => m.value) : [0,0,0,0,0,0];

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (₹)',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3, tension: 0.4, fill: true,
                pointBackgroundColor: '#0f172a',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1e293b', bodyColor: '#334155',
                    borderColor: 'rgba(15, 23, 42, 0.1)', borderWidth: 1,
                    padding: 10, displayColors: false
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(15, 23, 42, 0.05)', drawBorder: false }, ticks: { color: '#475569', callback: v => '₹' + v } },
                x: { grid: { color: 'rgba(15, 23, 42, 0.05)', drawBorder: false }, ticks: { color: '#475569' } }
            }
        }
    });
}

async function loadRecentOrders() {
    const userInfo = getStoredUserInfo();
    if(!userInfo || !userInfo.token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${userInfo.token}` }
        });
        const orders = await res.json();
        
        const tbody = document.querySelector('#dashboard table tbody');
        if(!tbody) return;

        if (res.ok && Array.isArray(orders)) {
            if (orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">No orders yet</td></tr>';
                return;
            }
            let html = '';
            orders.slice(-5).reverse().forEach(order => {
                const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const statusClass = order.status?.toLowerCase() || 'pending';
                
                html += `
                    <tr>
                        <td>#${order._id.slice(-6).toUpperCase()}</td>
                        <td>${order.shippingAddress?.name || 'N/A'}</td>
                        <td>${order.products[0]?.name || 'N/A'} ${order.products.length > 1 ? `+${order.products.length-1} more` : ''}</td>
                        <td>${date}</td>
                        <td><span class="status ${statusClass}">${order.status}</span></td>
                        <td>₹${order.totalPrice?.toLocaleString() || 0}<br><small style="color:var(--text-secondary);">${order.paymentMethod || 'Cash on Delivery'}${order.isPaid ? ' | Paid' : ''}</small></td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    } catch (e) {
        console.error('Error loading recent orders', e);
    }
}

async function loadAllOrders() {
    const userInfo = getStoredUserInfo();
    if(!userInfo || !userInfo.token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${userInfo.token}` }
        });
        const orders = await res.json();
        
        const tbody = document.querySelector('#orders table tbody');
        if(!tbody) return;

        if (res.ok && Array.isArray(orders)) {
            if (orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);">No orders yet</td></tr>';
                return;
            }
            let html = '';
            orders.reverse().forEach(order => {
                const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const statusClass = order.status?.toLowerCase() || 'pending';
                const productNames = order.products.map(p => p.name).join(', ');
                
                // Build status change dropdown
                const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered'];
                let statusOptions = statuses.map(s => 
                    `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`
                ).join('');

                html += `
                    <tr>
                        <td style="font-weight:600;">#${order._id.slice(-6).toUpperCase()}</td>
                        <td>${order.shippingAddress?.name || 'N/A'}</td>
                        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${productNames}">
                            ${order.products[0]?.name || 'N/A'} ${order.products.length > 1 ? `<span style="color:var(--text-secondary);">+${order.products.length-1} more</span>` : ''}
                        </td>
                        <td>₹${order.totalPrice?.toLocaleString() || 0}<br><small style="color:var(--text-secondary);">${order.paymentMethod || 'Cash on Delivery'}${order.isPaid ? ' | Paid' : ''}</small></td>
                        <td>${date}</td>
                        <td><span class="status ${statusClass}">${order.status}</span></td>
                        <td>
                            <select onchange="updateOrderStatus('${order._id}', this.value)" 
                                style="background:rgba(255,255,255,0.9);border:1px solid var(--border-color);padding:0.4rem 0.6rem;border-radius:8px;font-size:0.8rem;font-family:inherit;cursor:pointer;">
                                ${statusOptions}
                            </select>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    } catch (e) {
        console.error('Error loading orders', e);
        const tbody = document.querySelector('#orders table tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef4444;">Failed to load orders</td></tr>';
    }
}

async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE_URL}/products`);
        const products = await res.json();
        
        const tbody = document.querySelector('#products table tbody');
        if(!tbody) return;

        if (res.ok && Array.isArray(products)) {
            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">No products yet. Add your first product!</td></tr>';
                return;
            }
            let html = '';
            products.reverse().forEach(prod => {
                const stockCount = prod.stock || 0;
                const status = stockCount > 0 ? 'In Stock' : 'Out of Stock';
                const statusClass = stockCount > 0 ? 'completed' : 'pending';
                const statusStyle = stockCount > 0 ? '' : 'color:#ef4444;background:rgba(239,68,68,0.1);';
                
                html += `
                    <tr data-id="${prod._id}">
                        <td>
                            <div class="profile" style="gap:1rem;">
                                <div style="width:40px;height:40px;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#f59e0b;overflow:hidden;border:1px solid var(--border-color);">
                                    ${prod.images && prod.images[0] ? `<img src="${resolveAssetUrl(prod.images[0])}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fa-solid fa-box"></i>'}
                                </div>
                                <span>${prod.name}</span>
                            </div>
                        </td>
                        <td>${prod.category ? (prod.category.name || prod.category) : 'General'}</td>
                        <td>₹${Number(prod.price).toFixed(2)}</td>
                        <td>${stockCount} items</td>
                        <td><span class="status ${statusClass}" style="${statusStyle}">${status}</span></td>
                        <td>
                            <i class="fa-solid fa-pen action-icon" onclick="editProduct('${prod._id}')" title="Edit"></i> 
                            <i class="fa-solid fa-trash action-icon delete" onclick="deleteProduct('${prod._id}')" title="Delete"></i>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    } catch (e) {
        console.error('Error loading products', e);
    }
}

async function loadCustomers() {
    const userInfo = getStoredUserInfo();
    if(!userInfo || !userInfo.token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/users`, {
            headers: { 'Authorization': `Bearer ${userInfo.token}` }
        });
        const users = await res.json();
        
        const tbody = document.querySelector('#customers table tbody');
        if(!tbody) return;

        if (res.ok && Array.isArray(users)) {
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">No customers yet</td></tr>';
                return;
            }
            let html = '';
            users.reverse().forEach((user, idx) => {
                const avatarId = (idx * 7 + 3) % 70; // deterministic avatar
                html += `
                    <tr>
                        <td>
                            <div class="profile">
                                <img src="https://i.pravatar.cc/150?img=${avatarId}" alt="Customer">
                                <span>${user.name}</span>
                            </div>
                        </td>
                        <td>${user.email}</td>
                        <td>--</td>
                        <td>--</td>
                        <td><span class="status completed">${user.role === 'admin' ? 'Admin' : 'Active'}</span></td>
                        <td>
                            <span style="font-size:0.8rem;color:var(--text-secondary);">${new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    } catch (e) {
        console.error('Error loading customers', e);
    }
}

async function loadCategories(selectedCategoryId = '') {
    try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        const categories = await res.json();
        const select = document.getElementById('new-prod-cat');
        if(!select) return;

        if (res.ok && Array.isArray(categories)) {
            let html = '<option value="">Select Category</option>';
            categories.forEach(cat => {
                html += `<option value="${cat._id}">${cat.name}</option>`;
            });
            html += '<option value="__other__">Other (Add New Category)</option>';
            select.innerHTML = html;
            if (selectedCategoryId) {
                select.value = selectedCategoryId;
            }
            toggleOtherCategoryInput();
        }
    } catch (e) {
        console.error('Error loading categories', e);
    }
}

async function loadAnalytics() {
    const userInfo = getStoredUserInfo();
    if(!userInfo || !userInfo.token) return;

    try {
        // Fetch order stats
        const res = await fetch(`${API_BASE_URL}/orders/stats`, {
            headers: { 'Authorization': `Bearer ${userInfo.token}` }
        });
        const stats = await res.json();

        // Fetch product count
        const prodRes = await fetch(`${API_BASE_URL}/products`);
        const products = await prodRes.json();

        if (res.ok) {
            // Update analytics summary cards
            const revenueEl = document.getElementById('analytics-revenue');
            const ordersEl = document.getElementById('analytics-orders');
            const productsEl = document.getElementById('analytics-products');
            
            if (revenueEl) revenueEl.textContent = `₹${stats.totalRevenue?.toLocaleString() || 0}`;
            if (ordersEl) ordersEl.textContent = stats.totalOrders?.toLocaleString() || 0;
            if (productsEl && Array.isArray(products)) productsEl.textContent = products.length;

            updateAnalyticsCharts(stats);
        }
    } catch (e) {
        console.error('Error loading analytics', e);
    }
}

function updateAnalyticsCharts(stats) {
    // Traffic Chart (Doughnut)
    if (trafficChart) trafficChart.destroy();
    const trafficCtx = document.getElementById('trafficChart');
    if (trafficCtx) {
        trafficChart = new Chart(trafficCtx, {
            type: 'doughnut',
            data: {
                labels: ['Direct', 'Social', 'Organic Search'],
                datasets: [{
                    data: [55, 25, 20],
                    backgroundColor: ['#3b82f6', '#ec4899', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#475569' } }
                }
            }
        });
    }

    // Category Sales Chart (Bar)
    if (categoryChart) categoryChart.destroy();
    const catCtx = document.getElementById('categoryChart');
    if (catCtx && stats.categorySales) {
        categoryChart = new Chart(catCtx, {
            type: 'bar',
            data: {
                labels: stats.categorySales.length > 0 ? stats.categorySales.map(c => c.name) : ['No Data'],
                datasets: [{
                    label: 'Sales (₹)',
                    data: stats.categorySales.length > 0 ? stats.categorySales.map(c => c.value) : [0],
                    backgroundColor: '#8b5cf6',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(15, 23, 42, 0.05)', drawBorder: false }, ticks: { color: '#475569' } },
                    x: { grid: { display: false }, ticks: { color: '#475569' } }
                }
            }
        });
    }
}
