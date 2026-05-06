const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'delivery_website', '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./delivery_website/config/db');

// Route imports
const authRoutes = require('./delivery_website/routes/authRoutes');
const categoryRoutes = require('./delivery_website/routes/categoryRoutes');
const productRoutes = require('./delivery_website/routes/productRoutes');
const orderRoutes = require('./delivery_website/routes/orderRoutes');

// Connect Database
connectDB();

const app = express();
const publicRoot = path.join(__dirname, 'delivery_website', 'public');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(publicRoot));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicRoot, 'index.html'));
});

// Set up basic route for testing
app.get('/api/health', (req, res) => {
  res.json({ message: 'API is healthy' });
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
