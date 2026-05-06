const Order = require('../models/Order');
const mongoose = require('mongoose');
const crypto = require('crypto');
const https = require('https');
const { createRecordId, readCollection, writeCollection } = require('../utils/fallbackStore');

const isDatabaseReady = () => mongoose.connection.readyState === 1;
const canPersistMongoOrder = (userId) => isDatabaseReady() && mongoose.isValidObjectId(userId);
const readFallbackOrders = () => readCollection('orders');
const writeFallbackOrders = (orders) => writeCollection('orders', orders);
const sanitizeOrderProducts = (products = []) =>
  products
    .filter((prod) => prod && typeof prod === 'object')
    .map((prod) => {
      const cleaned = {
        name: prod.name || 'Product',
        qty: Number(prod.qty) || 1,
        price: Number(prod.price) || 0,
        image: prod.image || '',
      };

      if (prod.product && /^[0-9a-fA-F]{24}$/.test(prod.product)) {
        cleaned.product = prod.product;
      }

      return cleaned;
    });

const normalizePaymentMethod = (paymentMethod) =>
  paymentMethod === 'Online Payment' ? 'Online Payment' : 'Cash on Delivery';

const normalizePaymentResult = (paymentResult = {}) => ({
  id: paymentResult.id || '',
  orderId: paymentResult.orderId || '',
  signature: paymentResult.signature || '',
  status: paymentResult.status || '',
});

const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const validateCheckoutPayload = ({ products, shippingAddress, totalPrice, paymentMethod }) => {
  if (!products || products.length === 0) {
    return 'No order items';
  }

  if (!shippingAddress || !shippingAddress.name || !shippingAddress.address || !shippingAddress.phone) {
    return 'Shipping address is incomplete';
  }

  if (!totalPrice || Number(totalPrice) < 500) {
    return 'Order total must be at least ₹500';
  }

  if (!['Cash on Delivery', 'Online Payment'].includes(paymentMethod)) {
    return 'Please select a valid payment method';
  }

  return '';
};

const createFallbackOrder = ({
  userId,
  products,
  shippingAddress,
  totalPrice,
  paymentMethod,
  isPaid = false,
  paidAt = null,
  paymentResult = {},
}) => {
  const orders = readFallbackOrders();
  const order = {
    _id: createRecordId('order'),
    user: String(userId),
    products,
    shippingAddress,
    totalPrice: Number(totalPrice),
    paymentMethod: normalizePaymentMethod(paymentMethod),
    isPaid: Boolean(isPaid),
    paidAt: paidAt || null,
    paymentResult: normalizePaymentResult(paymentResult),
    status: 'Pending',
    shippedAt: null,
    deliveredAt: null,
    feedbacks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.push(order);
  writeFallbackOrders(orders);
  return order;
};

const normalizeOrder = (order) => ({
  ...order,
  _id: String(order._id),
  user: order.user && typeof order.user === 'object' && order.user._id
    ? { ...order.user, _id: String(order.user._id) }
    : String(order.user),
  shippedAt: order.shippedAt || null,
  deliveredAt: order.deliveredAt || null,
  paymentMethod: normalizePaymentMethod(order.paymentMethod),
  isPaid: Boolean(order.isPaid),
  paidAt: order.paidAt || null,
  paymentResult: normalizePaymentResult(order.paymentResult),
  feedbacks: Array.isArray(order.feedbacks) ? order.feedbacks : [],
});

const persistOrder = async ({
  userId,
  products,
  shippingAddress,
  totalPrice,
  paymentMethod,
  isPaid = false,
  paidAt = null,
  paymentResult = {},
}) => {
  const cleanedProducts = sanitizeOrderProducts(products);

  if (!canPersistMongoOrder(userId)) {
    return createFallbackOrder({
      userId,
      products: cleanedProducts,
      shippingAddress,
      totalPrice,
      paymentMethod,
      isPaid,
      paidAt,
      paymentResult,
    });
  }

  try {
    const order = new Order({
      user: userId,
      products: cleanedProducts,
      shippingAddress,
      totalPrice: Number(totalPrice),
      paymentMethod: normalizePaymentMethod(paymentMethod),
      isPaid: Boolean(isPaid),
      paidAt: paidAt || null,
      paymentResult: normalizePaymentResult(paymentResult),
    });

    return await order.save();
  } catch (mongoError) {
    console.error('Mongo order save failed, using fallback store:', mongoError.message);
    return createFallbackOrder({
      userId,
      products: cleanedProducts,
      shippingAddress,
      totalPrice,
      paymentMethod,
      isPaid,
      paidAt,
      paymentResult,
    });
  }
};

const createRazorpayOrderRequest = ({ amount, receipt, notes = {} }) =>
  new Promise((resolve, reject) => {
    if (!isRazorpayConfigured()) {
      reject(new Error('Razorpay is not configured'));
      return;
    }

    const payload = JSON.stringify({
      amount,
      currency: 'INR',
      receipt,
      notes,
    });

    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');

    const request = https.request(
      {
        hostname: 'api.razorpay.com',
        path: '/v1/orders',
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (response) => {
        let body = '';

        response.on('data', (chunk) => {
          body += chunk;
        });

        response.on('end', () => {
          let parsed = {};

          try {
            parsed = body ? JSON.parse(body) : {};
          } catch (parseError) {
            reject(new Error('Invalid Razorpay response'));
            return;
          }

          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed);
            return;
          }

          reject(new Error(parsed.error?.description || parsed.message || 'Unable to create Razorpay order'));
        });
      }
    );

    request.on('error', reject);
    request.write(payload);
    request.end();
  });

// @desc    Create new order
// @route   POST /api/orders
const addOrderItems = async (req, res) => {
  const { products, shippingAddress, totalPrice, paymentMethod } = req.body;
  const validationError = validateCheckoutPayload({ products, shippingAddress, totalPrice, paymentMethod });

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    if (normalizePaymentMethod(paymentMethod) === 'Online Payment') {
      return res.status(400).json({ message: 'Complete online payment first' });
    }

    const order = await persistOrder({
      userId: req.user._id,
      products,
      shippingAddress,
      totalPrice,
      paymentMethod,
      isPaid: false,
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error('Order creation error:', error);
    try {
      const fallbackOrder = createFallbackOrder({
        userId: req.user._id,
        products: sanitizeOrderProducts(products),
        shippingAddress,
        totalPrice,
        paymentMethod,
        isPaid: false,
      });
      return res.status(201).json(fallbackOrder);
    } catch (fallbackError) {
      console.error('Fallback order creation error:', fallbackError);
      return res.status(500).json({ message: 'Server Error', error: fallbackError.message });
    }
  }
};

// @desc    Create Razorpay payment order
// @route   POST /api/orders/payment/order
const createPaymentOrder = async (req, res) => {
  const { products, shippingAddress, totalPrice, paymentMethod } = req.body;
  const validationError = validateCheckoutPayload({ products, shippingAddress, totalPrice, paymentMethod });

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (normalizePaymentMethod(paymentMethod) !== 'Online Payment') {
    return res.status(400).json({ message: 'Online payment method is required' });
  }

  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  if (!isRazorpayConfigured()) {
    return res.status(500).json({ message: 'Online payment is not configured yet. Please add Razorpay keys in delivery_website/.env' });
  }

  try {
    const receipt = createRecordId('receipt').slice(0, 40);
    const razorpayOrder = await createRazorpayOrderRequest({
      amount: Math.round(Number(totalPrice) * 100),
      receipt,
      notes: {
        customerName: String(shippingAddress.name || '').slice(0, 255),
        customerPhone: String(shippingAddress.phone || '').slice(0, 255),
      },
    });

    return res.json({
      key: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: razorpayOrder.id,
      receipt: razorpayOrder.receipt,
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    return res.status(500).json({ message: error.message || 'Unable to start online payment' });
  }
};

// @desc    Verify Razorpay payment and create order
// @route   POST /api/orders/payment/verify
const verifyPaymentAndCreateOrder = async (req, res) => {
  const {
    products,
    shippingAddress,
    totalPrice,
    paymentMethod,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;
  const validationError = validateCheckoutPayload({ products, shippingAddress, totalPrice, paymentMethod });

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (normalizePaymentMethod(paymentMethod) !== 'Online Payment') {
    return res.status(400).json({ message: 'Online payment method is required' });
  }

  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  if (!isRazorpayConfigured()) {
    return res.status(500).json({ message: 'Online payment is not configured yet. Please add Razorpay keys in delivery_website/.env' });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification details are missing' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: 'Payment signature verification failed' });
  }

  try {
    const order = await persistOrder({
      userId: req.user._id,
      products,
      shippingAddress,
      totalPrice,
      paymentMethod,
      isPaid: true,
      paidAt: new Date().toISOString(),
      paymentResult: {
        id: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        status: 'paid',
      },
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error('Verify payment and create order error:', error);
    return res.status(500).json({ message: 'Payment was successful, but order creation failed. Please contact support.' });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
const getMyOrders = async (req, res) => {
  try {
    const fallbackOrders = readFallbackOrders()
      .filter((order) => String(order.user) === String(req.user._id))
      .map(normalizeOrder);

    if (!isDatabaseReady()) {
      return res.json(fallbackOrders);
    }

    const orders = await Order.find({ user: req.user._id });
    res.json([...orders.map(normalizeOrder), ...fallbackOrders]);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all orders
// @route   GET /api/orders (Admin only)
const getOrders = async (req, res) => {
  try {
    const fallbackOrders = readFallbackOrders().map(normalizeOrder);

    if (!isDatabaseReady()) {
      return res.json(fallbackOrders);
    }

    const orders = await Order.find({}).populate('user', 'id name email');
    res.json([...orders.map(normalizeOrder), ...fallbackOrders]);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status (Admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const nextStatus = req.body.status === 'Shift' ? 'Shipped' : req.body.status;
    const fallbackOrders = readFallbackOrders();
    const fallbackIndex = fallbackOrders.findIndex((order) => String(order._id) === String(req.params.id));
    const statusMeta = {};

    if (nextStatus === 'Shipped') {
      statusMeta.shippedAt = new Date().toISOString();
    }

    if (nextStatus === 'Delivered') {
      statusMeta.shippedAt = fallbackIndex > -1
        ? (fallbackOrders[fallbackIndex].shippedAt || new Date().toISOString())
        : new Date().toISOString();
      statusMeta.deliveredAt = new Date().toISOString();
    }

    if (!isDatabaseReady()) {
      if (fallbackIndex === -1) {
        return res.status(404).json({ message: 'Order not found' });
      }

      fallbackOrders[fallbackIndex] = {
        ...fallbackOrders[fallbackIndex],
        status: nextStatus || fallbackOrders[fallbackIndex].status,
        ...statusMeta,
        updatedAt: new Date().toISOString(),
      };

      writeFallbackOrders(fallbackOrders);
      return res.json(fallbackOrders[fallbackIndex]);
    }

    if (fallbackIndex > -1) {
      fallbackOrders[fallbackIndex] = {
        ...fallbackOrders[fallbackIndex],
        status: nextStatus || fallbackOrders[fallbackIndex].status,
        ...statusMeta,
        updatedAt: new Date().toISOString(),
      };
      writeFallbackOrders(fallbackOrders);
      return res.json(fallbackOrders[fallbackIndex]);
    }

    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = nextStatus || order.status;
      if (nextStatus === 'Shipped' && !order.shippedAt) {
        order.shippedAt = new Date();
      }
      if (nextStatus === 'Delivered') {
        order.shippedAt = order.shippedAt || new Date();
        order.deliveredAt = new Date();
      }
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add feedback for an order
// @route   PUT /api/orders/:id/feedback
const addOrderFeedback = async (req, res) => {
  const { message, rating } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: 'Feedback message is required' });
  }

  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const feedback = {
    message: String(message).trim(),
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    createdAt: new Date().toISOString(),
    userName: req.user.name || 'Customer',
  };

  try {
    const fallbackOrders = readFallbackOrders();
    const fallbackIndex = fallbackOrders.findIndex((order) => String(order._id) === String(req.params.id));

    if (!isDatabaseReady()) {
      if (fallbackIndex === -1 || String(fallbackOrders[fallbackIndex].user) !== String(req.user._id)) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const existingFeedbacks = Array.isArray(fallbackOrders[fallbackIndex].feedbacks)
        ? fallbackOrders[fallbackIndex].feedbacks
        : [];

      fallbackOrders[fallbackIndex] = {
        ...fallbackOrders[fallbackIndex],
        feedbacks: [...existingFeedbacks, feedback],
        updatedAt: new Date().toISOString(),
      };
      writeFallbackOrders(fallbackOrders);
      return res.json(normalizeOrder(fallbackOrders[fallbackIndex]));
    }

    if (fallbackIndex > -1) {
      if (String(fallbackOrders[fallbackIndex].user) !== String(req.user._id)) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const existingFeedbacks = Array.isArray(fallbackOrders[fallbackIndex].feedbacks)
        ? fallbackOrders[fallbackIndex].feedbacks
        : [];

      fallbackOrders[fallbackIndex] = {
        ...fallbackOrders[fallbackIndex],
        feedbacks: [...existingFeedbacks, feedback],
        updatedAt: new Date().toISOString(),
      };
      writeFallbackOrders(fallbackOrders);
      return res.json(normalizeOrder(fallbackOrders[fallbackIndex]));
    }

    const order = await Order.findById(req.params.id);
    if (!order || String(order.user) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.feedbacks = Array.isArray(order.feedbacks) ? order.feedbacks : [];
    order.feedbacks.push(feedback);
    const updatedOrder = await order.save();
    return res.json(normalizeOrder(updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder));
  } catch (error) {
    console.error('Add order feedback error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all order feedback entries
// @route   GET /api/orders/feedback
const getOrderFeedback = async (req, res) => {
  try {
    let orders = readFallbackOrders().map(normalizeOrder);
    if (isDatabaseReady()) {
      const mongoOrders = await Order.find({}).populate('user', 'name email');
      orders = [...mongoOrders.map(normalizeOrder), ...orders];
    }

    const feedbacks = orders
      .flatMap((order) =>
        (Array.isArray(order.feedbacks) ? order.feedbacks : []).map((feedback, index) => ({
          id: `${order._id}-feedback-${index}`,
          orderId: String(order._id),
          orderCode: `#${String(order._id).slice(-6).toUpperCase()}`,
          customerName:
            order.shippingAddress?.name ||
            (order.user && typeof order.user === 'object' ? order.user.name : '') ||
            feedback.userName ||
            'Customer',
          customerEmail: order.user && typeof order.user === 'object' ? order.user.email || '' : '',
          status: order.status,
          totalPrice: Number(order.totalPrice) || 0,
          createdAt: feedback.createdAt || order.updatedAt || order.createdAt,
          deliveredAt: order.deliveredAt || null,
          rating: feedback.rating || 5,
          message: feedback.message || '',
          products: Array.isArray(order.products) ? order.products : [],
        }))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(feedbacks);
  } catch (error) {
    console.error('Get order feedback error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get order statistics (Revenue, Counts, Trends)
// @route   GET /api/orders/stats (Admin only)
const getOrderStats = async (req, res) => {
  try {
    let orders = readFallbackOrders().map(normalizeOrder);
    if (isDatabaseReady()) {
      const mongoOrders = await Order.find({});
      orders = [...mongoOrders.map(normalizeOrder), ...orders];
    }

    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const totalOrders = orders.length;

    // Monthly revenue trend (last 12 months)
    const monthlyRevenue = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 12 months with 0
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear() % 100}`;
      monthlyRevenue[label] = 0;
    }

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear() % 100}`;
      if (monthlyRevenue.hasOwnProperty(label)) {
        monthlyRevenue[label] += (order.totalPrice || 0);
      }
    });

    // Sales by Category
    const categorySales = {};
    orders.forEach(order => {
      order.products.forEach(item => {
        // Since products in orders might not have populated categories, 
        // we use a simplified approach or look it up.
        // For now, let's group by product name if category is missing.
        const cat = item.category ? (item.category.name || item.category) : 'General';
        categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.qty);
      });
    });

    res.json({
      totalRevenue,
      totalOrders,
      monthlyRevenue: Object.entries(monthlyRevenue).reverse().map(([name, value]) => ({ name, value })),
      categorySales: Object.entries(categorySales).map(([name, value]) => ({ name, value }))
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  addOrderItems,
  createPaymentOrder,
  verifyPaymentAndCreateOrder,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  getOrderStats,
  addOrderFeedback,
  getOrderFeedback,
};
