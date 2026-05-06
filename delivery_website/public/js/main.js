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
            (cat) => `
                <div class="category-card" onclick="window.location.href='category.html?category=${
                  cat._id
                }'">
                    <img src="${
                      resolveAssetUrl(cat.image) ||
                      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80"
                    }" alt="${
            cat.name
          }" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80';">
                    <h3>${cat.name}</h3>
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

async function fetchProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  // Show loading spinner
  grid.innerHTML =
    '<div class="loading-spinner"><div class="spinner"></div><p>Loading products...</p></div>';

  const urlParams = new URLSearchParams(window.location.search);
  const categoryFilter = urlParams.get("category");
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
}) {
  const fallbackImage =
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80";
  const resolvedImage = image || fallbackImage;
  const safeName = escapeInlineString(name || "Product");
  const safeImage = escapeInlineString(resolvedImage);
  const safeId = escapeInlineString(id || "");
  const heartClass = wishlisted ? "fas" : "far";
  const heartColor = wishlisted ? 'style="color: #ff4d4f;"' : "";
  const heartAction = wishlistMode
    ? `removeWishlistItem('${safeId}')`
    : `toggleWishlist(event, this, '${safeId}', '${safeName}', ${Number(price) || 0}, '${safeImage}')`;
  const imageAction = productHref
    ? `onclick="window.location.href='${escapeInlineString(productHref)}'" style="cursor:pointer;"`
    : "";

  return `
    <div class="product-card">
      <div class="product-visit-heart" onclick="${heartAction}" title="${
        wishlistMode ? "Remove from Wishlist" : "Add to Wishlist"
      }">
        <i class="${heartClass} fa-heart" ${heartColor}></i>
      </div>
      <img src="${resolvedImage}" class="product-image" alt="${
    name || "Product"
  }" ${imageAction} onerror="this.onerror=null;this.src='${fallbackImage}';">
      <div class="product-info">
        ${
          categoryName
            ? `<span class="product-category">${categoryName}</span>`
            : ""
        }
        <h3 class="product-name">${name || "Product"}</h3>
        <div class="product-price">₹${price}</div>
        <div class="product-actions">
          <button type="button" class="add-to-cart-btn" onclick="addToCart('${safeId}', '${safeName}', ${
    Number(price) || 0
  }, '${safeImage}')">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
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
    src: resolveAssetUrl("/uploads/banner1.png"),
    title: "Fast, Fresh & Local",
    subtitle:
      "Your favorite supermarket items delivered right to your door in Jashpur.",
  },
  {
    src: resolveAssetUrl("/uploads/banner2.png"),
    title: "Daily Essentials Delivered!",
    subtitle:
      "Groceries, dairy, snacks & more — fresh from local stores to your doorstep.",
  },
];

let currentBannerIdx = 0;

function updateBanner() {
  const bannerImg = document.getElementById("bannerImage");
  const bannerTitle = document.querySelector(".banner-content h1");
  const bannerSubtitle = document.querySelector(".banner-content p");
  const dots = document.querySelectorAll(".banner-dot");

  if (bannerImg && bannerTitle && bannerSubtitle) {
    bannerImg.style.opacity = 0;
    setTimeout(() => {
      bannerImg.src = banners[currentBannerIdx].src;
      bannerTitle.innerText = banners[currentBannerIdx].title;
      bannerSubtitle.innerText = banners[currentBannerIdx].subtitle;
      bannerImg.style.opacity = 1;
    }, 300);
  }

  if (dots.length) {
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentBannerIdx);
    });
  }
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
function addToCart(id, name, price, image) {
  const user =
    typeof getStoredUserInfo === "function" ? getStoredUserInfo() : null;
  if (!user) {
    showToast("Please login to add items to cart");
    if (typeof openLoginModal === "function") {
      openLoginModal();
    }
    return;
  }

  let cart = getCartItems();
  const itemIndex = cart.findIndex((item) => item.product === id);
  if (itemIndex > -1) {
    cart[itemIndex].qty += 1;
  } else {
    cart.push({ product: id, name, price, qty: 1, image });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartIcon();
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
