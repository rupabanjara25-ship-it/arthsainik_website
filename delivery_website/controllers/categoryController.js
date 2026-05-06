const Category = require('../models/Category');
const mongoose = require('mongoose');
const { createRecordId, readCollection, writeCollection } = require('../utils/fallbackStore');

const isDatabaseReady = () => mongoose.connection.readyState === 1;

// @desc    Get all categories
// @route   GET /api/categories
const getCategories = async (req, res) => {
  try {
    if (!isDatabaseReady()) {
      return res.json(readCollection('categories'));
    }

    const categories = await Category.find({});
    res.json(categories);
  } catch (error) {
    console.error('Error loading categories from database:', error.message);
    return res.json(readCollection('categories'));
  }
};

// @desc    Create a category
// @route   POST /api/categories (Admin only)
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    let imagePath = '';
    
    if (req.file) {
      imagePath = `/uploads/categories/${req.file.filename}`;
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    if (!isDatabaseReady()) {
      const categories = readCollection('categories');
      const normalizedName = name.trim().toLowerCase();

      if (categories.some((category) => category.name.trim().toLowerCase() === normalizedName)) {
        return res.status(400).json({ message: 'Category already exists' });
      }

      const category = {
        _id: createRecordId('category'),
        name: name.trim(),
        description: description ? description.trim() : '',
        image: imagePath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      categories.push(category);
      writeCollection('categories', categories);
      return res.status(201).json(category);
    }

    const category = new Category({
      name: name.trim(),
      description,
      image: imagePath,
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { getCategories, createCategory };
