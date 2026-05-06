const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      name: { type: String, required: true },
      qty: { type: Number, required: true },
      price: { type: Number, required: true },
      image: { type: String, default: '' },
    }
  ],
  shippingAddress: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash on Delivery', 'Online Payment'],
    default: 'Cash on Delivery',
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  paymentResult: {
    id: { type: String, default: '' },
    orderId: { type: String, default: '' },
    signature: { type: String, default: '' },
    status: { type: String, default: '' },
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Shipped', 'Delivered'],
    default: 'Pending',
  },
  shippedAt: {
    type: Date,
    default: null,
  },
  deliveredAt: {
    type: Date,
    default: null,
  },
  feedbacks: [
    {
      message: { type: String, required: true },
      rating: { type: Number, min: 1, max: 5, default: 5 },
      createdAt: { type: Date, default: Date.now },
      userName: { type: String, default: '' },
    },
  ],
}, {
  timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
