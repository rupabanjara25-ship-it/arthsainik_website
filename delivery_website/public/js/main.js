// 📍 Location Gate Logic
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
  checkLocationAccess();
  attachSearchHandler();

 
});

function checkLocationAccess() {
  const hasAccess = sessionStorage.getItem("jashpurAccessGranted");
  if (hasAccess) {
    unlockWebsite();
  }
}

function verifyLocation() {
  const city = document.getElementById("cityInput").value.trim().toLowerCase();
  const pin = document.getElementById("pinInput").value.trim();
  const errorMsg = document.getElementById("locationError");

  if (city === "jashpur" && pin === "496331") {
    sessionStorage.setItem("jashpurAccessGranted", "true");
    unlockWebsite();
  } else {
    errorMsg.style.display = "block";
  }
}

function unlockWebsite() {
  const locationGate = document.getElementById("locationGate");
  if (locationGate) {
    locationGate.classList.add("hidden");
  }

  const mainHeader = document.getElementById("mainHeader");
  if (mainHeader) {
    mainHeader.classList.remove("hidden");
  }

  const mainContent = document.getElementById("mainContent");
  if (mainContent) {
    mainContent.classList.remove("hidden");
  }

  const mainFooter = document.getElementById("mainFooter");
  if (mainFooter) {
    mainFooter.classList.remove("hidden");
  }

  const mobileBottomNav = document.getElementById("mobileBottomNav");
  if (mobileBottomNav) {
    mobileBottomNav.classList.remove("hidden");
  }

  // Fetch initial data
  if (
    document.getElementById("categoryGrid") ||
    document.getElementById("productGrid")
  ) {
    fetchCategories();
    fetchProducts();
  }

  if (typeof updateCartIcon === "function") {
    updateCartIcon();
  }

  if (typeof checkAuthState === "function") {
    checkAuthState();
  }
}

// 📦 API Fetching
if (typeof API_BASE_URL === "undefined") {
  const { protocol, hostname, port, origin } = window.location;
  const isLocalPreview =
    protocol === "file:" || ["localhost", "127.0.0.1"].includes(hostname);

  window.API_BASE_URL =
    isLocalPreview && port !== "5000"
      ? `http://${hostname || "127.0.0.1"}:5000/api`
      : `${origin}/api`;
}

if (typeof window.resolveAssetUrl !== "function") {
  window.resolveAssetUrl = function resolveAssetUrl(assetPath) {
    if (!assetPath) return "";
    if (/^(https?:)?\/\//i.test(assetPath) || assetPath.startsWith("data:")) {
      return assetPath;
    }

    const apiOrigin = window.API_BASE_URL.replace(/\/api$/, "");
    if (assetPath.startsWith("/")) {
      return `${apiOrigin}${assetPath}`;
    }

    return `${apiOrigin}/${assetPath.replace(/^\.?\//, "")}`;
  };
}

function getCartItems() {
  try {
    const savedCart = JSON.parse(localStorage.getItem("cart"));
    return Array.isArray(savedCart) ? savedCart : [];
  } catch (error) {
    console.error("Error reading cart from storage", error);
    localStorage.removeItem("cart");
    return [];
  }
}

async function fetchCategories() {
  const grid = document.getElementById("categoryGrid");
  const sidebar = document.getElementById("sidebarCategoryList");
  if (!grid && !sidebar) return;

  try {
    const res = await fetch(`${API_BASE_URL}/categories`);
    const categories = await res.json();
    if (!res.ok || !Array.isArray(categories)) {
      throw new Error("Unable to load categories");
    }

    if (grid) {
      if (categories.length === 0) {
        grid.innerHTML =
          '<div class="empty-state">No categories available yet.</div>';
      } else {
      grid.innerHTML = categories
          .map(
            (cat, idx) => `
                <div class="category-card" onclick="window.location.href='category.html?category=${cat._id}'">
                    <div class="category-image-box">
                        <img src="${resolveAssetUrl(cat.image) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80'}" alt="${cat.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80';">
                    </div>
                    <span class="category-name">${cat.name}</span>
                </div>
            `
          )
          .join("");
      }
    }

    if (sidebar) {
      const urlParams = new URLSearchParams(window.location.search);
      const activeCategory = urlParams.get("category");

      // Add "All Categories" option at the top
      let sidebarHtml = `
                <div class="sidebar-category-item ${
                  !activeCategory ? "active" : ""
                }" onclick="window.location.href='category.html'">
                    <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80" alt="All">
                    <span>All Products</span>
                </div>
            `;

      sidebarHtml += categories
        .map((cat) => {
          const isActive = activeCategory === cat._id ? "active" : "";
          return `
                <div class="sidebar-category-item ${isActive}" onclick="window.location.href='category.html?category=${
            cat._id
          }'">
                    <img src="${
                      resolveAssetUrl(cat.image) ||
                      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80"
                    }" alt="${
            cat.name
          }" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80';">
                    <span>${cat.name}</span>
                </div>
                `;
        })
        .join("");
      sidebar.innerHTML = sidebarHtml;

      if (activeCategory) {
        const titleNode = document.getElementById("selectedCategoryTitle");
        const catObj = categories.find((c) => c._id === activeCategory);
        if (titleNode && catObj) titleNode.innerText = catObj.name;
      }
    }
  } catch (e) {
    console.error("Error fetching categories", e);
    if (grid)
      grid.innerHTML =
        '<div class="empty-state">Unable to load categories right now.</div>';
    if (sidebar)
      sidebar.innerHTML =
        '<div class="empty-state">Unable to load categories right now.</div>';
  }
}

async function fetchProducts(categoryId = null) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  // Show loading spinner
  grid.innerHTML =
    '<div class="loading-spinner"><div class="spinner"></div><p>Loading products...</p></div>';

  const urlParams = new URLSearchParams(window.location.search);
  const categoryFilter = categoryId || urlParams.get("category");
  const url = categoryFilter
    ? `${API_BASE_URL}/products?category=${categoryFilter}`
    : `${API_BASE_URL}/products`;

  try {
    const res = await fetch(url);
    const products = await res.json();
    if (!res.ok || !Array.isArray(products)) {
      throw new Error("Unable to load products");
    }

    allProducts = products;
    renderProducts(products);
  } catch (e) {
    console.error("Error fetching products", e);
    allProducts = [];
    renderProducts([]);
  }
}

function attachSearchHandler() {
  const input = document.getElementById("productSearch");
  if (!input) return;

  input.addEventListener("input", () => {
    const term = input.value.trim().toLowerCase();
    if (allProducts.length === 0) return;
    const filteredProducts = allProducts.filter((product) => {
      const name = (product.name || "").toLowerCase();
      const description = (product.description || "").toLowerCase();
      const category = (
        product.category && product.category.name ? product.category.name : ""
      ).toLowerCase();
      return (
        name.includes(term) ||
        description.includes(term) ||
        category.includes(term)
      );
    });

    renderProducts(filteredProducts, term);
  });
}

function renderProducts(products, searchTerm = "") {
  const grid = document.getElementById("productGrid");
  const summary = document.getElementById("productSummary");
  if (!grid) return;

  if (summary) {
    const countLabel = `${products.length} product${
      products.length === 1 ? "" : "s"
    }`;
    summary.innerText = searchTerm
      ? `${countLabel} matching "${searchTerm}"`
      : `${countLabel} available`;
  }

  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem;">
            <i class="fas fa-box-open" style="font-size:3rem;color:var(--text-light);margin-bottom:1rem;display:block;"></i>
            ${
              searchTerm
                ? "No products matched your search."
                : "No products available yet."
            }
            ${
              !searchTerm
                ? '<br><a href="index.html" style="color:var(--primary-color);font-weight:600;margin-top:0.5rem;display:inline-block;">Continue Shopping</a>'
                : ""
            }
        </div>`;
    return;
  }

  const wishlistMap = new Set(getWishlistItems().map((i) => i.id));

  grid.innerHTML = products
    .map((prod) =>
      buildProductCard({
        id: prod._id,
        name: prod.name,
        price: prod.price,
        image:
          prod.images && prod.images.length > 0
            ? resolveAssetUrl(prod.images[0])
            : "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80",
        categoryName:
          prod.category && prod.category.name ? prod.category.name : "",
        productHref: `product.html?id=${prod._id}`,
        wishlisted: wishlistMap.has(prod._id),
        stock: prod.stock,
      })
    )
    .join("");
}

function escapeInlineString(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildProductCard({
  id,
  name,
  price,
  image,
  categoryName = "",
  productHref = "",
  wishlisted = false,
  wishlistMode = false,
  stock = 0,
}) {
  const fallbackImage = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80";
  const resolvedImage = image || fallbackImage;
  const safeName = escapeInlineString(name || "Product");
  const safeImage = escapeInlineString(resolvedImage);
  const safeId = escapeInlineString(id || "");
  
  // Extract weight from name or default
  const weightMatch = (name || "").match(/(\d+\s*(kg|g|ml|l|pcs|dozen|pack|unit))/i);
  const weight = weightMatch ? weightMatch[0] : "1 unit";
  
  const cart = getCartItems();
  const cartItem = cart.find(i => i.product === id);
  const qty = cartItem ? cartItem.qty : 0;

  const heartClass = wishlisted ? "fas" : "far";
  const heartColor = wishlisted ? 'style="color: #ff4d4f;"' : "";
  const heartAction = wishlistMode
    ? `removeWishlistItem('${safeId}')`
    : `toggleWishlist(event, this, '${safeId}', '${safeName}', ${Number(price) || 0}, '${safeImage}')`;

  const actionHtml = stock <= 0 
    ? `<button type="button" class="add-btn out-of-stock" disabled style="background:#ccc;cursor:not-allowed;">OUT OF STOCK</button>`
    : (qty > 0 
    ? `
      <div class="qty-control">
        <button class="qty-btn" onclick="updateQty('${safeId}', -1, event)">-</button>
        <span class="qty-count">${qty}</span>
        <button class="qty-btn" onclick="updateQty('${safeId}', 1, event)">+</button>
      </div>
    `
    : `<button type="button" class="add-btn" onclick="addToCart('${safeId}', '${safeName}', ${Number(price) || 0}, '${safeImage}', event)">ADD</button>`);

  const imageAction = productHref
    ? `onclick="window.location.href='${escapeInlineString(productHref)}'" style="cursor:pointer;"`
    : "";

  return `
    <div class="product-card" id="product-${id}" data-name="${safeName}" data-price="${price}" data-image="${safeImage}" data-stock="${stock}">
      <div class="product-wishlist-heart" onclick="${heartAction}" title="${wishlistMode ? "Remove from Wishlist" : "Add to Wishlist"}">
        <i class="${heartClass} fa-heart" ${heartColor}></i>
      </div>
      <div class="product-badge">
        <i class="far fa-clock"></i> 12 MINS
      </div>
      <img src="${resolvedImage}" class="product-image" alt="${name || "Product"}" ${imageAction} onerror="this.onerror=null;this.src='${fallbackImage}';">
      <div class="product-info">
        <h3 class="product-name" ${imageAction}>${name || "Product"}</h3>
        <div class="product-weight">${weight}</div>
        <div class="product-bottom">
          <div class="product-price">₹${price}</div>
          <div class="product-actions" id="actions-${id}">
            ${actionHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateQty(id, delta, event, fromDrawer = false) {
  if (event) event.stopPropagation();
  let cart = getCartItems();
  const itemIndex = cart.findIndex(i => i.product === id);
  
  if (itemIndex > -1) {
    const card = document.getElementById(`product-${id}`);
    const stock = card ? parseInt(card.dataset.stock) : (cart[itemIndex].stock || 999);

    if (delta > 0 && cart[itemIndex].qty >= stock) {
      showToast(`Only ${stock} items available in stock`);
      return;
    }

    cart[itemIndex].qty += delta;
    if (cart[itemIndex].qty <= 0) {
      cart.splice(itemIndex, 1);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartIcon();
    
    // Update the drawer if it's open or if the action came from the drawer
    const drawer = document.getElementById('cartDrawer');
    if (drawer && drawer.classList.contains('open')) {
      renderCartDrawer();
    }

    // Update the specific product card action area if it exists on the page
    const actionArea = document.getElementById(`actions-${id}`);
    if (actionArea) {
      const updatedItem = cart.find(i => i.product === id);
      const updatedQty = updatedItem ? updatedItem.qty : 0;
      if (updatedQty > 0) {
        actionArea.innerHTML = `
          <div class="qty-control">
            <button class="qty-btn" onclick="updateQty('${id}', -1, event)">-</button>
            <span class="qty-count">${updatedQty}</span>
            <button class="qty-btn" onclick="updateQty('${id}', 1, event)">+</button>
          </div>
        `;
      } else {
        const card = document.getElementById(`product-${id}`);
        if (card) {
          const name = card.dataset.name;
          const price = card.dataset.price;
          const image = card.dataset.image;
          actionArea.innerHTML = `<button type="button" class="add-btn" onclick="addToCart('${id}', '${name}', ${price}, '${image}', event)">ADD</button>`;
        }
      }
    }
  }
}

function getWishlistItems() {
  try {
    const saved = JSON.parse(localStorage.getItem("wishlist"));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function toggleWishlist(event, element, id, name, price, image) {
  if (event) event.stopPropagation();
  const icon = element.querySelector("i");
  let wishlist = getWishlistItems();

  const existingIndex = wishlist.findIndex((i) => i.id === id);
  if (existingIndex > -1) {
    wishlist.splice(existingIndex, 1);
    if (icon) {
      icon.classList.remove("fas");
      icon.classList.add("far");
      icon.style.color = "";
    }
    showToast(`${name} removed from Wishlist`);
  } else {
    wishlist.push({ id, name, price, image });
    if (icon) {
      icon.classList.remove("far");
      icon.classList.add("fas");
      icon.style.color = "#ff4d4f";
    }
    showToast(`${name} added to Wishlist`);
  }

  localStorage.setItem("wishlist", JSON.stringify(wishlist));
}

function showToast(message) {
  let toast = document.getElementById("cartToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cartToast";
    toast.className = "toast-notification";
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.style.display = "block";
  toast.style.animation = "slideUpToast 0.3s ease forwards";

  setTimeout(() => {
    toast.style.animation = "slideDownToast 0.3s ease forwards";
    setTimeout(() => {
      toast.style.display = "none";
    }, 300);
  }, 3000);
}

// 🖼️ Banner Logic — Using real local images
const banners = [
  {
    src: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80",
    title: "Fresh Groceries Delivered",
    subtitle: "Quality products from your local Jashpur market.",
  },
  {
    src: "https://images.unsplash.com/photo-1506617564039-2f3b650ad755?w=1600&q=80",
    title: "Daily Essentials",
    subtitle: "Everything you need, delivered in minutes.",
  },
  {
    src: "https://images.unsplash.com/photo-1488459711615-de64ef5993f7?w=1600&q=80",
    title: "Farm Fresh Fruits",
    subtitle: "Organic and fresh fruits for your healthy life.",
  },
  {
    src: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1600&q=80",
    title: "Household Supplies",
    subtitle: "Cleaning and home maintenance items at your door.",
  }
];

let currentBannerIdx = 0;

function updateBanner() {
  const bannerImg = document.getElementById("bannerImage");
  const bannerTitle = document.querySelector(".banner-content h1");
  const bannerSubtitle = document.querySelector(".banner-content p");
  const dotsContainer = document.getElementById("bannerDots");

  if (!bannerImg || !bannerTitle || !bannerSubtitle) return;

  if (dotsContainer) {
    dotsContainer.innerHTML = banners.map((_, idx) => `
      <button type="button" class="banner-dot ${idx === currentBannerIdx ? 'active' : ''}" onclick="goToBanner(${idx})"></button>
    `).join('');
  }

  bannerImg.style.opacity = 0;
  setTimeout(() => {
    bannerImg.src = banners[currentBannerIdx].src;
    bannerTitle.innerText = banners[currentBannerIdx].title;
    bannerSubtitle.innerText = banners[currentBannerIdx].subtitle;
    bannerImg.style.opacity = 1;
  }, 300);
}

function changeBanner(step) {
  currentBannerIdx += step;
  if (currentBannerIdx < 0) currentBannerIdx = banners.length - 1;
  if (currentBannerIdx >= banners.length) currentBannerIdx = 0;
  updateBanner();
}

function goToBanner(index) {
  currentBannerIdx = index;
  updateBanner();
}

setInterval(() => {
  const header = document.getElementById("mainHeader");
  if (header && !header.classList.contains("hidden")) {
    changeBanner(1);
  }
}, 5000);

// 🛒 Cart Logic (Local Storage)
function addToCart(id, name, price, image, event) {
  if (event) event.stopPropagation();
  const user =
    typeof getStoredUserInfo === "function" ? getStoredUserInfo() : null;
  if (!user) {
    showToast("Please login to add items to cart");
    if (typeof openLoginModal === "function") {
      openLoginModal();
    }
    return;
  }

  const card = document.getElementById(`product-${id}`);
  const stock = card ? parseInt(card.dataset.stock) : 0;

  if (stock <= 0) {
    showToast("Product is out of stock");
    return;
  }

  let cart = getCartItems();
  const itemIndex = cart.findIndex((item) => item.product === id);
  if (itemIndex > -1) {
    if (cart[itemIndex].qty >= stock) {
      showToast(`Only ${stock} items available in stock`);
      return;
    }
    cart[itemIndex].qty += 1;
  } else {
    cart.push({ product: id, name, price, qty: 1, image, stock });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartIcon();
  
  // Update drawer if open
  const drawer = document.getElementById('cartDrawer');
  if (drawer && drawer.classList.contains('open')) {
    renderCartDrawer();
  }

  // Update the UI immediately
  const actionArea = document.getElementById(`actions-${id}`);
  if (actionArea) {
    const qty = itemIndex > -1 ? cart[itemIndex].qty : 1;
    actionArea.innerHTML = `
      <div class="qty-control">
        <button class="qty-btn" onclick="updateQty('${id}', -1, event)">-</button>
        <span class="qty-count">${qty}</span>
        <button class="qty-btn" onclick="updateQty('${id}', 1, event)">+</button>
      </div>
    `;
  }

  showToast(`Successfully added to cart`);
}

function updateCartIcon() {
  let cart = getCartItems();
  const count = cart.reduce((acc, item) => acc + item.qty, 0);
  const countEl = document.getElementById("cartCount");
  const mobileCountEl = document.getElementById("mobileCartCount");
  if (countEl) countEl.innerText = count;
  if (mobileCountEl) mobileCountEl.innerText = count;
}

// 🛒 Cart Drawer Logic
function toggleCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartDrawerOverlay');
  if (!drawer) return;

  const isOpen = drawer.classList.contains('open');
  if (!isOpen) {
    // Reset to items view whenever opening
    showItemsViewInDrawer();
    renderCartDrawer();
    
    // Prefill checkout info if user logged in
    const user = typeof getStoredUserInfo === "function" ? getStoredUserInfo() : null;
    if (user) {
      const nameInp = document.getElementById('drawerShipName');
      const phoneInp = document.getElementById('drawerShipPhone');
      const addrInp = document.getElementById('drawerShipAddress');
      if (nameInp) nameInp.value = user.name || '';
      if (phoneInp) phoneInp.value = user.phone || '';
      if (addrInp) addrInp.value = user.address || '';
    }

    drawer.classList.add('open');
    overlay.style.display = 'block';
    setTimeout(() => overlay.style.opacity = '1', 10);
    document.body.style.overflow = 'hidden'; // Prevent scroll
  } else {
    drawer.classList.remove('open');
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);
  }
}

function showItemsViewInDrawer() {
  const itemsView = document.getElementById('cartItemsView');
  const checkoutView = document.getElementById('cartCheckoutView');
  const proceedBtn = document.getElementById('proceedBtn');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  const drawerTitle = document.getElementById('drawerTitle');

  if(itemsView) itemsView.classList.remove('hidden');
  if(checkoutView) checkoutView.classList.add('hidden');
  if(proceedBtn) proceedBtn.classList.remove('hidden');
  if(placeOrderBtn) placeOrderBtn.classList.add('hidden');
  if(drawerTitle) drawerTitle.innerHTML = `<i class="fas fa-arrow-left" onclick="toggleCartDrawer()" style="cursor:pointer"></i> My Cart`;
}

let selectedAddress = null;

function showCheckoutInDrawer() {
  const cart = getCartItems();
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  
  if (cart.length === 0) {
    showToast("Your cart is empty");
    return;
  }

  if (subtotal < 500) {
    showToast("Minimum order amount is ₹500");
    return;
  }

  const itemsView = document.getElementById('cartItemsView');
  const checkoutView = document.getElementById('cartCheckoutView');
  const proceedBtn = document.getElementById('proceedBtn');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  const drawerTitle = document.getElementById('drawerTitle');

  if(itemsView) itemsView.classList.add('hidden');
  if(checkoutView) checkoutView.classList.remove('hidden');
  if(proceedBtn) proceedBtn.classList.add('hidden');
  if(placeOrderBtn) placeOrderBtn.classList.remove('hidden');
  if(drawerTitle) drawerTitle.innerHTML = `<i class="fas fa-arrow-left" onclick="showItemsViewInDrawer()" style="cursor:pointer"></i> Delivery Details`;
  
  // Populate user details if logged in
  const user = typeof getStoredUserInfo === "function" ? getStoredUserInfo() : null;
  const shipNameInput = document.getElementById('drawerShipName');
  const shipPhoneInput = document.getElementById('drawerShipPhone');
  const savedList = document.getElementById('savedAddressesListCheckout');
  const newAddrForm = document.getElementById('newAddressFormCheckout');
  
  if (user) {
    if (shipNameInput) shipNameInput.value = user.name || '';
    if (shipPhoneInput) shipPhoneInput.value = user.phone || '';
    
    const addresses = user.addresses || [];
    if (savedList) {
      if (addresses.length === 0) {
        savedList.innerHTML = '<p style="font-size: 0.85rem; color: #666; background: #fdf2f2; padding: 10px; border-radius: 8px; border: 1px solid #fee2e2;">No saved addresses yet. Enter details below to save for future orders.</p>';
        showAddNewAddressCheckout();
      } else {
        if(newAddrForm) newAddrForm.classList.add('hidden');
        savedList.innerHTML = addresses.map((addr, idx) => `
          <div class="checkout-address-option" 
               onclick="selectCheckoutAddress(${idx})" 
               style="padding: 12px; border: 2px solid ${addr.isDefault ? 'var(--primary-color)' : '#eee'}; border-radius: 8px; cursor: pointer; background: ${addr.isDefault ? '#fff9f9' : '#fff'}; transition: all 0.2s; margin-bottom: 8px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #333; text-transform: uppercase;">${addr.label}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                   ${addr.isDefault ? '<i class="fas fa-check-circle" style="color: var(--primary-color);"></i>' : ''}
                   <button onclick="editAddressInCheckout(event, ${idx})" style="background: none; color: #777; font-size: 0.8rem; padding: 4px;"><i class="fas fa-edit"></i></button>
                </div>
            </div>
            <p style="font-size: 0.85rem; color: #555; line-height: 1.4;">${addr.address}</p>
          </div>
        `).join('');
        
        const defaultIdx = addresses.findIndex(a => a.isDefault);
        selectedAddress = (defaultIdx > -1) ? addresses[defaultIdx].address : (addresses.length > 0 ? addresses[0].address : null);
      }
    }
  }

  renderCartDrawer(); // Refresh totals
}

function selectCheckoutAddress(index) {
  const user = getStoredUserInfo();
  const addresses = user.addresses || [];
  selectedAddress = addresses[index].address;
  
  // Update UI
  const options = document.querySelectorAll('.checkout-address-option');
  options.forEach((opt, i) => {
    if (i === index) {
      opt.style.borderColor = 'var(--primary-color)';
      opt.style.background = '#fff9f9';
      const header = opt.querySelector('div');
      if (header && !header.querySelector('.fa-check-circle')) {
          header.innerHTML += '<i class="fas fa-check-circle" style="color: var(--primary-color);"></i>';
      }
    } else {
      opt.style.borderColor = '#eee';
      opt.style.background = '#fff';
      const icon = opt.querySelector('.fa-check-circle');
      if (icon) icon.remove();
    }
  });
  
  const newAddrForm = document.getElementById('newAddressFormCheckout');
  if(newAddrForm) newAddrForm.classList.add('hidden');
}

function showAddNewAddressCheckout() {
    selectedAddress = null;
    const options = document.querySelectorAll('.checkout-address-option');
    options.forEach(opt => {
        opt.style.borderColor = '#eee';
        opt.style.background = '#fff';
        const icon = opt.querySelector('.fa-check-circle');
        if (icon) icon.remove();
    });
    const newAddrForm = document.getElementById('newAddressFormCheckout');
    if(newAddrForm) newAddrForm.classList.remove('hidden');
}

async function editAddressInCheckout(event, index) {
    if (event) event.stopPropagation();
    
    if (typeof editAddress === "function") {
        await editAddress(index);
        showCheckoutInDrawer(); // Refresh list after edit
    } else {
        console.error("editAddress function not found in auth.js");
    }
}

async function placeOrderFromDrawer(event) {
  if (event) event.preventDefault();
  
  const user = typeof getStoredUserInfo === "function" ? getStoredUserInfo() : null;
  if (!user || !user.token) {
    showToast("Please login to place an order");
    if (typeof openLoginModal === "function") openLoginModal();
    return;
  }

  const name = document.getElementById('drawerShipName').value.trim();
  const phone = document.getElementById('drawerShipPhone').value.trim();
  const address = selectedAddress || document.getElementById('drawerShipAddress').value.trim();
  const paymentMethod = document.getElementById('drawerPaymentMethod').value;
  const cart = getCartItems();
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const totalAmount = subtotal + 25 + 2; // Including charges

  if (!name || !phone || !address) {
    showToast("Please fill all delivery details");
    return;
  }

  const orderData = {
    products: cart,
    shippingAddress: { name, address, phone },
    paymentMethod,
    totalPrice: totalAmount
  };

  const btn = document.getElementById('placeOrderBtn');
  const btnActionText = btn.querySelector('.checkout-btn-action');

  try {
    btn.disabled = true;
    if(btnActionText) btnActionText.innerHTML = `Placing Order... <i class="fas fa-spinner fa-spin"></i>`;

    // 🔄 Auto-save/Update User Profile (Phone & Address)
    if (user && user.token) {
        const currentAddresses = user.addresses || [];
        const isNewAddress = !currentAddresses.some(a => a.address === address);
        const isNewPhone = user.phone !== phone;

        if (isNewAddress || isNewPhone) {
            const formData = new FormData();
            formData.append('name', user.name);
            formData.append('phone', phone);
            
            if (isNewAddress) {
                const updatedAddresses = [...currentAddresses, { label: 'Home', address: address, isDefault: currentAddresses.length === 0 }];
                formData.append('addresses', JSON.stringify(updatedAddresses));
            } else {
                formData.append('addresses', JSON.stringify(currentAddresses));
            }

            fetch(`${API_BASE_URL}/auth/profile`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user.token}` },
                body: formData
            })
            .then(r => r.json())
            .then(data => {
                if(data._id) {
                    localStorage.setItem('userInfo', JSON.stringify(data));
                    if(typeof checkAuthState === 'function') checkAuthState();
                }
            })
            .catch(err => console.error('Auto-save failed:', err));
        }
    }

    // Handle Online Payment via existing logic if possible, or direct fetch
    if (paymentMethod === 'Online Payment') {
      if (typeof window.Razorpay === 'undefined') {
        throw new Error("Online payment system not loaded");
      }
      
      // Request payment order
      const pRes = await fetch(`${API_BASE_URL}/orders/payment/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(orderData)
      });
      const pData = await pRes.json();
      if (!pRes.ok) throw new Error(pData.message || "Payment initiation failed");

      const options = {
        key: pData.key,
        amount: pData.amount,
        currency: pData.currency || 'INR',
        name: 'ArdhSainik',
        description: 'Order Payment',
        order_id: pData.orderId,
        handler: async function (response) {
          try {
            if(btnActionText) btnActionText.innerHTML = `Verifying... <i class="fas fa-spinner fa-spin"></i>`;
            const vRes = await fetch(`${API_BASE_URL}/orders/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
              body: JSON.stringify({
                ...orderData,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            if (!vRes.ok) throw new Error("Payment verification failed");
            
            localStorage.removeItem('cart');
            showToast("Order placed successfully!");
            window.location.href = 'orders.html';
          } catch (err) {
            showToast(err.message);
            btn.disabled = false;
            if(btnActionText) btnActionText.innerHTML = `Place Order <i class="fas fa-check-circle"></i>`;
          }
        },
        prefill: { name, contact: phone, email: user.email || '' },
        theme: { color: '#27ae60' }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
      btn.disabled = false; // Allow retry if modal closed
      if(btnActionText) btnActionText.innerHTML = `Place Order <i class="fas fa-check-circle"></i>`;
      return;
    }

    // Cash on Delivery
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Order placement failed");

    localStorage.removeItem('cart');
    showToast("Order placed successfully!");
    window.location.href = 'orders.html';

  } catch (error) {
    showToast(error.message);
    btn.disabled = false;
    if(btnActionText) btnActionText.innerHTML = `Place Order <i class="fas fa-check-circle"></i>`;
  }
}

function renderCartDrawer() {
  const cart = getCartItems();
  const list = document.getElementById('drawerItemsList');
  const shipmentCount = document.getElementById('shipmentCount');
  const itemsTotal = document.getElementById('drawerItemsTotal');
  const savedTag = document.getElementById('drawerSavedTag');
  const grandTotal = document.getElementById('drawerGrandTotal');
  const footerTotal = document.getElementById('footerTotal');
  const footerTotalCheckout = document.getElementById('footerTotalCheckout');

  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:#777;">
        <i class="fas fa-shopping-cart" style="font-size:3rem;margin-bottom:1rem;display:block;color:#eee;"></i>
        <p style="font-weight:600; font-size:1rem;">Your cart is empty</p>
        <p style="font-size:0.85rem; margin-top:0.5rem;">Add some items to start shopping!</p>
      </div>
    `;
    if(shipmentCount) shipmentCount.innerText = "Shipment of 0 items";
    if(itemsTotal) itemsTotal.innerText = "₹0";
    if(savedTag) savedTag.innerText = "Saved ₹0";
    if(grandTotal) grandTotal.innerText = "₹0";
    if(footerTotal) footerTotal.innerText = "₹0";
    if(footerTotalCheckout) footerTotalCheckout.innerText = "₹0";
    return;
  }

  if(shipmentCount) shipmentCount.innerText = `Shipment of ${cart.length} ${cart.length === 1 ? 'item' : 'items'}`;
  
  let html = '';
  let subtotal = 0;
  let totalMRP = 0;

  cart.forEach(item => {
    subtotal += item.price * item.qty;
    // Assume MRP is ~10% more for visual effect if not provided
    const mrp = Math.round(item.price * 1.15); 
    totalMRP += mrp * item.qty;
    
    // Extract weight from name if possible
    const weightMatch = item.name.match(/\d+\s*(g|kg|ml|l|packets|pc|units)/i);
    const weight = weightMatch ? weightMatch[0] : '1 unit';

    html += `
      <div class="drawer-cart-item">
        <img src="${item.image}" alt="${item.name}" class="drawer-item-img">
        <div class="drawer-item-info">
          <h4>${item.name}</h4>
          <span class="weight">${weight}</span>
          <div class="drawer-item-price">
            ₹${item.price} <span class="mrp">₹${mrp}</span>
          </div>
        </div>
        <div class="qty-control" style="background:#27ae60; color:white; border-radius:8px; height:32px; padding:0 4px;">
          <button class="qty-btn" onclick="updateQty('${item.product}', -1, event, true)" style="color:white; font-size:1.1rem; width:28px;">-</button>
          <span class="qty-count" style="min-width:18px; font-weight:800; font-size:0.9rem;">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty('${item.product}', 1, event, true)" style="color:white; font-size:1.1rem; width:28px;">+</button>
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
  
  const deliveryCharge = 25;
  const handlingCharge = 2;
  const grand = subtotal + deliveryCharge + handlingCharge;
  const savings = totalMRP - subtotal;

  if(itemsTotal) itemsTotal.innerText = `₹${subtotal}`;
  if(savedTag) savedTag.innerText = `Saved ₹${savings}`;
  if(grandTotal) grandTotal.innerText = `₹${grand}`;
  if(footerTotal) footerTotal.innerText = `₹${grand}`;
  if(footerTotalCheckout) footerTotalCheckout.innerText = `₹${grand}`;
}

function showLocationInfo() {
  const location = document.querySelector('.delivery-location')?.innerText.trim() || 'Jashpur, 496331';
  if (typeof showToast === 'function') {
    showToast(`Current Location: ${location}`);
  } else {
    alert(`Current Location: ${location}`);
  }
}

function toggleHamburgerMenu() {
  const drawer = document.getElementById('hamburgerDrawer');
  const overlay = document.getElementById('hamburgerDrawerOverlay');
  if (!drawer) return;
  
  const isOpen = drawer.classList.contains('open');
  if (!isOpen) {
    drawer.classList.add('open');
    if(overlay) {
        overlay.style.display = 'block';
        setTimeout(() => overlay.style.opacity = '1', 10);
    }
    document.body.style.overflow = 'hidden';
  } else {
    drawer.classList.remove('open');
    if(overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 300);
    }
    document.body.style.overflow = '';
  }
}

function toggleMobileSearch() {
  const container = document.querySelector('.search-container');
  if (container) {
    container.classList.toggle('active');
    if (container.classList.contains('active')) {
      const input = container.querySelector('input');
      if (input) input.focus();
    }
  }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

function toggleHamburgerMenu() {
    toggleMobileMenu();
}
