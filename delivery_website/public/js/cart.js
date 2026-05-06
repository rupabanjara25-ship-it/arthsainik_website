if (typeof API_BASE_URL === 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    const isLocalPreview = protocol === 'file:' || ['localhost', '127.0.0.1'].includes(hostname);

    window.API_BASE_URL = isLocalPreview && port !== '5000'
        ? `http://${hostname || '127.0.0.1'}:5000/api`
        : `${origin}/api`;
}

function getCartItems() {
    try {
        const savedCart = JSON.parse(localStorage.getItem('cart'));
        return Array.isArray(savedCart) ? savedCart : [];
    } catch (error) {
        console.error('Error reading cart from storage', error);
        localStorage.removeItem('cart');
        return [];
    }
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

let cartTotalAmount = 0;

document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    if (typeof updateCartIcon === 'function') {
        updateCartIcon();
    }

    const userInfo = getStoredUserInfo();
    if (userInfo) {
        const shipName = document.getElementById('shipName');
        const shipPhone = document.getElementById('shipPhone');
        const shipAddress = document.getElementById('shipAddress');

        if (shipName) shipName.value = userInfo.name || '';
        if (shipPhone) shipPhone.value = userInfo.phone || '';
        if (shipAddress) shipAddress.value = userInfo.address || '';
    }

    const paymentMethod = document.getElementById('paymentMethod');
    if (paymentMethod) {
        paymentMethod.addEventListener('change', syncPaymentMethodUI);
    }

    syncPaymentMethodUI();
});

window.addEventListener('storage', (event) => {
    if (event.key === 'cart') {
        renderCart();
        if (typeof updateCartIcon === 'function') {
            updateCartIcon();
        }
    }
});

window.addEventListener('focus', () => {
    renderCart();
    if (typeof updateCartIcon === 'function') {
        updateCartIcon();
    }
});

window.addEventListener('pageshow', () => {
    renderCart();
    if (typeof updateCartIcon === 'function') {
        updateCartIcon();
    }
});

function renderCart() {
    const cart = getCartItems();
    const list = document.getElementById('cartItemsList');
    const totalEl = document.getElementById('cartTotalValue');
    const warningEl = document.getElementById('minOrderWarning');
    const btnEl = document.getElementById('placeOrderBtn');

    if (!list || !totalEl || !warningEl || !btnEl) {
        console.error('Cart page elements are missing');
        return;
    }

    if (cart.length === 0) {
        list.innerHTML = `
            <div style="padding: 2rem 0; color: var(--text-light); font-size: 1.05rem;">
                Your cart is empty.
            </div>
        `;
        totalEl.innerText = '₹0';
        cartTotalAmount = 0;
        btnEl.disabled = true;
        btnEl.style.opacity = '0.5';
        warningEl.style.display = 'none';
        syncPaymentMethodUI();
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemName = item.name || 'Cart item';
        const itemPrice = Number(item.price) || 0;
        const itemQty = Number(item.qty) || 1;
        const itemImage = item.image ? resolveAssetUrl(item.image) : 'https://via.placeholder.com/80';

        total += itemPrice * itemQty;
        html += `
        <div class="cart-item">
            <div class="cart-item-main">
                <img src="${itemImage}" alt="${itemName}">
                <div class="cart-item-info">
                    <h3 class="cart-item-title">${itemName}</h3>
                    <div class="cart-item-price">₹${itemPrice}</div>
                </div>
            </div>
            
            <div class="qty-controls">
                <button type="button" class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                <span style="font-weight: bold;">${itemQty}</span>
                <button type="button" class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
            </div>
            
            <div class="cart-item-total">₹${itemPrice * itemQty}</div>
            
            <button type="button" class="remove-btn" onclick="removeItem(${index})"><i class="fas fa-trash"></i></button>
        </div>`;
    });

    list.innerHTML = html;
    cartTotalAmount = total;
    totalEl.innerText = `₹${total}`;

    if (total < 500) {
        warningEl.style.display = 'block';
        btnEl.disabled = true;
        btnEl.style.opacity = '0.5';
    } else {
        warningEl.style.display = 'none';
        btnEl.disabled = false;
        btnEl.style.opacity = '1';
    }

    syncPaymentMethodUI();
}

function updateQty(index, change) {
    const cart = getCartItems();
    cart[index].qty += change;

    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    if (typeof updateCartIcon === 'function') updateCartIcon();
}

function removeItem(index) {
    const cart = getCartItems();
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    if (typeof updateCartIcon === 'function') updateCartIcon();
}

function syncPaymentMethodUI() {
    const paymentMethod = document.getElementById('paymentMethod');
    const paymentInfo = document.getElementById('onlinePaymentInfo');
    const placeOrderBtn = document.getElementById('placeOrderBtn');

    if (!paymentMethod || !placeOrderBtn) {
        return;
    }

    const isOnlinePayment = paymentMethod.value === 'Online Payment';
    placeOrderBtn.textContent = isOnlinePayment ? 'Pay & Place Order' : 'Place Order';

    if (paymentInfo) {
        paymentInfo.classList.toggle('hidden', !isOnlinePayment);
    }
}

function collectCheckoutData() {
    const userInfo = getStoredUserInfo();
    const name = document.getElementById('shipName')?.value.trim() || '';
    const phone = document.getElementById('shipPhone')?.value.trim() || '';
    const address = document.getElementById('shipAddress')?.value.trim() || '';
    const paymentMethod = document.getElementById('paymentMethod')?.value || '';
    const cart = getCartItems();

    return {
        userInfo,
        name,
        phone,
        address,
        paymentMethod,
        cart,
        orderData: {
            products: cart,
            shippingAddress: { name, address, phone },
            paymentMethod,
            totalPrice: cartTotalAmount
        }
    };
}

function validateCheckoutData({ userInfo, name, phone, address, paymentMethod, cart }) {
    if (!userInfo || !userInfo.token) {
        alert('Please login to place an order.');
        window.location.href = 'index.html';
        return false;
    }

    if (cartTotalAmount < 500) {
        alert('Minimum order amount is ₹500.');
        return false;
    }

    if (!name || !phone || !address || !paymentMethod) {
        alert('Please fill in all delivery details.');
        return false;
    }

    if (!Array.isArray(cart) || cart.length === 0) {
        alert('Your cart is empty.');
        return false;
    }

    return true;
}

async function placeOrder(event) {
    event.preventDefault();

    const checkout = collectCheckoutData();
    if (!validateCheckoutData(checkout)) {
        return;
    }

    if (checkout.paymentMethod === 'Online Payment') {
        await handleOnlinePayment(checkout);
        return;
    }

    await placeCashOnDeliveryOrder(checkout);
}

async function placeCashOnDeliveryOrder({ userInfo, orderData, paymentMethod }) {
    const button = document.getElementById('placeOrderBtn');

    try {
        if (button) {
            button.disabled = true;
            button.textContent = 'Placing Order...';
        }

        const res = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userInfo.token}`
            },
            body: JSON.stringify(orderData)
        });

        const data = await res.json().catch(() => ({ message: 'Unexpected server response' }));

        if (!res.ok) {
            throw new Error(data.message || 'Failed to place order');
        }

        localStorage.removeItem('cart');
        alert(`Order placed successfully with ${paymentMethod}.`);
        window.location.href = 'orders.html';
    } catch (error) {
        console.error(error);
        alert(error.message || 'Server Error');
    } finally {
        if (button) {
            button.disabled = false;
            syncPaymentMethodUI();
        }
    }
}

async function handleOnlinePayment({ userInfo, orderData, name, phone }) {
    const button = document.getElementById('placeOrderBtn');

    if (typeof window.Razorpay === 'undefined') {
        alert('Online payment could not load. Please try again.');
        return;
    }

    try {
        if (button) {
            button.disabled = true;
            button.textContent = 'Preparing Payment...';
        }

        const paymentOrderRes = await fetch(`${API_BASE_URL}/orders/payment/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userInfo.token}`
            },
            body: JSON.stringify(orderData)
        });

        const paymentOrderData = await paymentOrderRes.json().catch(() => ({ message: 'Unexpected server response' }));

        if (!paymentOrderRes.ok) {
            throw new Error(paymentOrderData.message || 'Unable to start online payment');
        }

        const options = {
            key: paymentOrderData.key,
            amount: paymentOrderData.amount,
            currency: paymentOrderData.currency || 'INR',
            name: 'ArdhSainik',
            description: 'Order Payment',
            order_id: paymentOrderData.orderId,
            handler: async function (response) {
                try {
                    if (button) {
                        button.disabled = true;
                        button.textContent = 'Verifying Payment...';
                    }

                    const verifyRes = await fetch(`${API_BASE_URL}/orders/payment/verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${userInfo.token}`
                        },
                        body: JSON.stringify({
                            ...orderData,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    const verifyData = await verifyRes.json().catch(() => ({ message: 'Unexpected server response' }));

                    if (!verifyRes.ok) {
                        throw new Error(verifyData.message || 'Payment verification failed');
                    }

                    localStorage.removeItem('cart');
                    alert('Payment successful and order placed.');
                    window.location.href = 'orders.html';
                } catch (verifyError) {
                    console.error('Payment verification error', verifyError);
                    alert(verifyError.message || 'Payment verification failed');
                    if (button) {
                        button.disabled = false;
                        syncPaymentMethodUI();
                    }
                }
            },
            prefill: {
                name,
                email: userInfo.email || '',
                contact: phone || userInfo.phone || ''
            },
            notes: {
                address: orderData.shippingAddress.address
            },
            theme: {
                color: '#ff6b6b'
            },
            modal: {
                confirm_close: true,
                ondismiss: function () {
                    if (button) {
                        button.disabled = false;
                        syncPaymentMethodUI();
                    }
                }
            }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function (response) {
            console.error('Payment failed', response.error);
            alert(response.error?.description || 'Payment failed. Please try again.');
            if (button) {
                button.disabled = false;
                syncPaymentMethodUI();
            }
        });
        razorpay.open();
    } catch (error) {
        console.error('Online payment error', error);
        alert(error.message || 'Unable to start online payment');
        if (button) {
            button.disabled = false;
            syncPaymentMethodUI();
        }
    }
}
