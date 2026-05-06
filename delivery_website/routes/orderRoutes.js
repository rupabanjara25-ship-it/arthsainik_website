const express = require('express');
const router = express.Router();
const {
  addOrderItems,
  createPaymentOrder,
  verifyPaymentAndCreateOrder,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  getOrderStats,
  addOrderFeedback,
  getOrderFeedback,
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, addOrderItems);
router.post('/payment/order', protect, createPaymentOrder);
router.post('/payment/verify', protect, verifyPaymentAndCreateOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/feedback', protect, admin, getOrderFeedback);
router.get('/', protect, admin, getOrders);
router.get('/stats', protect, admin, getOrderStats);
router.put('/:id/feedback', protect, addOrderFeedback);
router.put('/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
