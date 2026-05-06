const Product = require('../models/Product');
const mongoose = require('mongoose');
const { createRecordId, readCollection, writeCollection } = require('../utils/fallbackStore');

const isDatabaseReady = () => mongoose.connection.readyState === 1;

const populateFallbackProduct = (product, categories) => {
  const category = categories.find((entry) => entry._id === product.category);
  return {
    ...product,
    category: category ? { _id: category._id, name: category.name } : null,
  };
};

const getUploadedImagePaths = (files) => {
  if (!files) return [];

  if (Array.isArray(files)) {
    return files.map((file) => `/uploads/products/${file.filename}`);
  }

  const orderedFiles = [
    ...(Array.isArray(files.productMainImage) ? files.productMainImage : []),
    ...(Array.isArray(files.productGalleryImages) ? files.productGalleryImages : []),
    ...(Array.isArray(files.productImages) ? files.productImages : []),
  ];

  return orderedFiles.map((file) => `/uploads/products/${file.filename}`);
};

const parseExistingImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    return [];
  }
};

const buildUpdatedImages = (files, existingImages = []) => {
  if (!files || (Array.isArray(files) && files.length === 0)) {
    return existingImages;
  }

  if (Array.isArray(files)) {
    const uploadedImages = getUploadedImagePaths(files);
    return uploadedImages.length > 0 ? uploadedImages : existingImages;
  }

  const newMainImage = getUploadedImagePaths({ productMainImage: files.productMainImage })[0];
  const newGalleryImages = getUploadedImagePaths({ productGalleryImages: files.productGalleryImages });
  const legacyImages = getUploadedImagePaths({ productImages: files.productImages });

  if (legacyImages.length > 0) {
    return legacyImages;
  }

  const hasStructuredUploads = Boolean(newMainImage) || newGalleryImages.length > 0;
  if (!hasStructuredUploads) {
    return existingImages;
  }

  const finalImages = [];
  const mainImage = newMainImage || existingImages[0];
  if (mainImage) {
    finalImages.push(mainImage);
  }

  if (existingImages.length > 1) {
    finalImages.push(...existingImages.slice(1));
  }

  if (newGalleryImages.length > 0) {
    finalImages.push(...newGalleryImages);
  }

  return finalImages;
};

// @desc    Get all products (optionally filtered by category)
// @route   GET /api/products
const getProducts = async (req, res) => {
  try {
    const category = req.query.category;

    if (!isDatabaseReady()) {
      const categories = readCollection('categories');
      const products = readCollection('products')
        .filter((product) => !category || product.category === category)
        .map((product) => populateFallbackProduct(product, categories));

      return res.json(products);
    }

    let query = {};
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query).populate('category', 'name');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get single product details
// @route   GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    if (!isDatabaseReady()) {
      const categories = readCollection('categories');
      const product = readCollection('products').find((entry) => entry._id === req.params.id);

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      return res.json(populateFallbackProduct(product, categories));
    }

    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a product
// @route   POST /api/products (Admin only)
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;
    const imagePaths = getUploadedImagePaths(req.files);

    if (!name || !description || !price || !category) {
      return res.status(400).json({ message: 'Name, description, price, and category are required' });
    }

    if (!isDatabaseReady()) {
      const categories = readCollection('categories');
      const categoryRecord = categories.find((entry) => entry._id === category);

      if (!categoryRecord) {
        return res.status(400).json({ message: 'Selected category does not exist' });
      }

      const products = readCollection('products');
      const product = {
        _id: createRecordId('product'),
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        stock: Number(stock) || 0,
        category,
        images: imagePaths,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      products.push(product);
      writeCollection('products', products);
      return res.status(201).json(populateFallbackProduct(product, categories));
    }

    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      stock: Number(stock) || 0,
      category,
      images: imagePaths,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id (Admin only)
const updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, existingImages } = req.body;
    const preservedImages = parseExistingImages(existingImages);

    if (!isDatabaseReady()) {
      const categories = readCollection('categories');
      const products = readCollection('products');
      const productIndex = products.findIndex((entry) => entry._id === req.params.id);

      if (productIndex === -1) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const updatedProduct = {
        ...products[productIndex],
        name: name ? name.trim() : products[productIndex].name,
        description: description ? description.trim() : products[productIndex].description,
        price: price ? Number(price) : products[productIndex].price,
        category: category || products[productIndex].category,
        stock: stock !== undefined ? Number(stock) : products[productIndex].stock,
        images: buildUpdatedImages(req.files, preservedImages.length > 0 ? preservedImages : products[productIndex].images || []),
        updatedAt: new Date().toISOString(),
      };

      products[productIndex] = updatedProduct;
      writeCollection('products', products);
      return res.json(populateFallbackProduct(updatedProduct, categories));
    }

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name ? name.trim() : product.name;
      product.description = description ? description.trim() : product.description;
      product.price = price ? Number(price) : product.price;
      product.category = category || product.category;
      if (stock !== undefined) product.stock = Number(stock);
      product.images = buildUpdatedImages(req.files, preservedImages.length > 0 ? preservedImages : product.images || []);

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id (Admin only)
const deleteProduct = async (req, res) => {
  try {
    if (!isDatabaseReady()) {
      const products = readCollection('products');
      const newProducts = products.filter((entry) => entry._id !== req.params.id);

      if (products.length === newProducts.length) {
        return res.status(404).json({ message: 'Product not found' });
      }

      writeCollection('products', newProducts);
      return res.json({ message: 'Product removed' });
    }

    const product = await Product.findById(req.params.id);

    if (product) {
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
