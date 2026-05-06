document.addEventListener("DOMContentLoaded", () => {
  if (typeof updateCartIcon === "function") updateCartIcon();
  if (typeof checkAuthState === "function") checkAuthState();
  loadMyOrders();
});

async function loadMyOrders() {
  const user =
    typeof getStoredUserInfo === "function" ? getStoredUserInfo() : null;
  const list = document.getElementById("ordersList");
  const summary = document.getElementById("ordersSummary");

  if (!list) return;

  if (!user || !user.token) {
    list.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:3rem;">
        <i class="fas fa-user-lock" style="font-size:3rem;color:var(--text-light);margin-bottom:1rem;display:block;"></i>
        <p style="margin-bottom:1rem;">Please login to see your orders.</p>
        <button type="button" class="btn-primary" onclick="openLoginModal()">Login</button>
      </div>
    `;
    if (summary)
      summary.textContent = "Login required to view your order history.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/orders/myorders`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
    const orders = await res.json();

    if (!res.ok) {
      throw new Error(orders.message || "Failed to load orders");
    }

    renderOrders(Array.isArray(orders) ? orders : []);
  } catch (error) {
    console.error("Error loading orders", error);
    list.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:3rem;">
        <i class="fas fa-box-open" style="font-size:3rem;color:var(--text-light);margin-bottom:1rem;display:block;"></i>
        <p>Unable to load your orders right now.</p>
      </div>
    `;
    if (summary) summary.textContent = "We could not fetch your order history.";
  }
}

function renderOrders(orders) {
  const list = document.getElementById("ordersList");
  const summary = document.getElementById("ordersSummary");
  if (!list) return;

  if (summary) {
    summary.textContent = `${orders.length} order${
      orders.length === 1 ? "" : "s"
    } found.`;
  }

  if (!orders.length) {
    list.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:3rem;">
        <i class="fas fa-box-open" style="font-size:3rem;color:var(--text-light);margin-bottom:1rem;display:block;"></i>
        <p style="margin-bottom:1rem;">You haven't placed any order yet.</p>
        <a href="index.html" class="btn-primary" style="display:inline-block;">Start Shopping</a>
      </div>
    `;
    return;
  }

  list.innerHTML = orders
    .sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a))
    .map((order) => {
      const orderItems = getOrderItems(order);
      const createdAtValue = getOrderCreatedAtValue(order);
      const createdAt = formatOrderDate(createdAtValue);
      const shippedAt = order.shippedAt
        ? formatOrderDate(order.shippedAt)
        : "Not shifted yet";
      const deliveredAt = order.deliveredAt
        ? formatOrderDate(order.deliveredAt)
        : "Not delivered yet";
      const statusKey = String(order.status || "Pending").toLowerCase();
      const statusLabel = getOrderStatusLabel(order.status);
      const statusClass = statusKey;
      const hasFeedback =
        Array.isArray(order.feedbacks) && order.feedbacks.length > 0;
      const paymentMethod = order.paymentMethod || "Cash on Delivery";
      const paymentStatus = order.isPaid ? "Paid" : "Pay on delivery";
      const isShipped =
        Boolean(order.shippedAt) ||
        ["shifted", "shipped", "delivered"].includes(statusKey);
      const isDelivered =
        Boolean(order.deliveredAt) || statusKey === "delivered";

      return `
        <article class="order-card">
          <div class="order-card-header">
            <div>
              <h3>Order #${String(order._id).slice(-6).toUpperCase()}</h3>
              <p>Placed on ${createdAt}</p>
            </div>
            <span class="status ${statusClass}">${statusLabel}</span>
          </div>

          <div class="order-products">
            ${
              orderItems.length
                ? orderItems
              .map(
                (item) => `
                  <div class="order-product-row">
                    <a class="order-product-link" href="${getOrderProductHref(
                      item
                    )}" ${item.productId ? "" : 'tabindex="-1" aria-disabled="true"'}>
                      <img src="${resolveOrderImage(item.image)}" alt="${
                  item.name || "Product"
                }" />
                    </a>
                    <div class="order-product-meta">
                      <a class="order-product-name" href="${getOrderProductHref(
                        item
                      )}" ${item.productId ? "" : 'tabindex="-1" aria-disabled="true"'}>
                        ${item.name || "Product"}
                      </a>
                      <span>Qty: ${item.qty || 1}</span>
                      <span>Price: ₹${Number(item.price || 0).toLocaleString()}</span>
                      <span>Ordered on: ${createdAt}</span>
                    </div>
                    <strong class="order-item-total">₹${Number(
                      (Number(item.price) || 0) * (Number(item.qty) || 1)
                    ).toLocaleString()}</strong>
                  </div>
                `
              )
              .join("")
                : `<div class="order-products-empty">Product details are not available for this order.</div>`
            }
          </div>

          <div class="order-timeline">
            <div class="timeline-item complete">
              <span class="timeline-dot"></span>
              <div>
                <strong>Ordered</strong>
                <p>${createdAt}</p>
              </div>
            </div>
            <div class="timeline-item ${isShipped ? "complete" : ""}">
              <span class="timeline-dot"></span>
              <div>
                <strong>Shifted / Shipped</strong>
                <p>${shippedAt}</p>
              </div>
            </div>
            <div class="timeline-item ${isDelivered ? "complete" : ""}">
              <span class="timeline-dot"></span>
              <div>
                <strong>Delivered</strong>
                <p>${deliveredAt}</p>
              </div>
            </div>
          </div>

          <div class="order-card-footer">
            <div class="order-total">Total: ₹${Number(
              order.totalPrice || 0
            ).toLocaleString()}</div>
            <div class="order-delivery-meta">
              <span>Payment: ${paymentMethod}</span>
              <span>Status: ${paymentStatus}</span>
              <span>${order.shippingAddress?.name || ""}</span>
              <span>${order.shippingAddress?.phone || ""}</span>
            </div>
          </div>

          <div class="order-feedback-panel">
            <div class="order-feedback-header">
              <strong>Feedback</strong>
              <span>${
                hasFeedback
                  ? `${order.feedbacks.length} submitted`
                  : "Not sent yet"
              }</span>
            </div>
            ${
              hasFeedback
                ? `<div class="order-feedback-history">${order.feedbacks
                    .map(
                      (feedback) => `
                        <div class="feedback-history-item">
                          <div class="feedback-stars">${"★".repeat(
                            Number(feedback.rating) || 5
                          )}</div>
                          <p>${feedback.message}</p>
                          <small>${formatOrderDate(feedback.createdAt)}</small>
                        </div>
                      `
                    )
                    .join("")}</div>`
                : ""
            }
            <form class="order-feedback-form" onsubmit="submitOrderFeedback(event, '${
              order._id
            }')">
              <div class="rating-group" role="radiogroup" aria-label="Rate this order">
                ${[5, 4, 3, 2, 1]
                  .map(
                    (value) => `
                      <label class="rating-star">
                        <input type="radio" name="rating" value="${value}" ${
                      value === 5 ? "checked" : ""
                    }>
                        <span>★</span>
                      </label>
                    `
                  )
                  .join("")}
              </div>
              <textarea name="message" rows="3" placeholder="Share your feedback for this order..." required></textarea>
              <button type="submit" class="btn-primary">Send Feedback</button>
            </form>
          </div>
        </article>
      `;
    })
    .join("");
}

async function submitOrderFeedback(event, orderId) {
  event.preventDefault();

  const user =
    typeof getStoredUserInfo === "function" ? getStoredUserInfo() : null;
  if (!user || !user.token) {
    openLoginModal();
    return;
  }

  const form = event.currentTarget;
  const payload = {
    rating: form.rating.value,
    message: form.message.value.trim(),
  };

  if (!payload.message) return;

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/feedback`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to send feedback");
    }

    if (typeof showToast === "function") {
      showToast("Feedback sent to admin successfully");
    }
    loadMyOrders();
  } catch (error) {
    console.error("Feedback submit error", error);
    alert(error.message || "Failed to send feedback");
  } finally {
    if (button) button.disabled = false;
  }
}

function formatOrderDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrderTimestamp(order) {
  const orderDate = getOrderCreatedAtValue(order);
  if (!orderDate) return 0;
  const parsed = new Date(orderDate);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getOrderCreatedAtValue(order) {
  const directValue = order?.createdAt || order?.updatedAt || order?.paidAt || null;
  if (directValue) {
    const parsed = new Date(directValue);
    if (!Number.isNaN(parsed.getTime())) {
      return directValue;
    }
  }

  if (/^[0-9a-fA-F]{24}$/.test(String(order?._id || ""))) {
    const unixSeconds = parseInt(String(order._id).slice(0, 8), 16);
    if (!Number.isNaN(unixSeconds)) {
      return new Date(unixSeconds * 1000).toISOString();
    }
  }

  return null;
}

function getOrderItems(order) {
  const items = Array.isArray(order?.products)
    ? order.products
    : Array.isArray(order?.orderItems)
    ? order.orderItems
    : [];

  return items.map((item) => ({
    name: item?.name || item?.product?.name || "Product",
    qty: Number(item?.qty || item?.quantity || 1),
    price: Number(item?.price || item?.product?.price || 0),
    productId:
      typeof item?.product === "string"
        ? item.product
        : item?.product?._id || "",
    image:
      item?.image || item?.product?.image || item?.product?.images?.[0] || "",
  }));
}

function getOrderProductHref(item) {
  return item?.productId ? `product.html?id=${item.productId}` : "javascript:void(0)";
}

function resolveOrderImage(image) {
  if (!image) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&q=80";
  }
  return resolveAssetUrl(image);
}

function getOrderStatusLabel(status) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "shifted" || normalized === "shipped") return "Shipped";
  if (normalized === "delivered") return "Delivered";
  if (normalized === "cancelled" || normalized === "canceled")
    return "Cancelled";
  if (normalized === "pending") return "Pending";
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
}
