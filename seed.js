const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'delivery_website', '.env') });
const mongoose = require('mongoose');
const connectDB = require('./delivery_website/config/db');
const Category = require('./delivery_website/models/Category');
const Product = require('./delivery_website/models/Product');

const seedData = async () => {
    try {
        await connectDB();
        
        // Clear existing
        await Category.deleteMany();
        await Product.deleteMany();

        console.log('Database cleared');

        // Create categories
        const categories = await Category.insertMany([
            { name: 'Fresh Vegetables', description: 'Daily fresh veggies', image: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=150&q=80' },
            { name: 'Fresh Fruits', description: 'Sweet and fresh fruits', image: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=150&q=80' },
            { name: 'Dairy & Eggs', description: 'Milk, cheese, eggs and more', image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=150&q=80' },
            { name: 'Snacks & Sweets', description: 'Chips, biscuits, chocolates', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd08c?w=150&q=80' },
            { name: 'Household', description: 'Cleaning and home essentials', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=150&q=80' }
        ]);

        console.log('Categories seeded:', categories.length);

        // Map categories back
        const catMap = {};
        for(let cat of categories) {
            catMap[cat.name] = cat._id;
        }

        const productsToSeed = [
            { name: 'Organic Bananas (1 Dozen)', price: 60, description: 'Freshly harvested organic bananas from local farms. Rich in potassium and vitamins.', category: catMap['Fresh Fruits'], images: ['https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=300&q=80'] },
            { name: 'Amul Taaza Milk (1L)', price: 64, description: 'Homogenized toned cow milk. Fresh and rich in taste.', category: catMap['Dairy & Eggs'], images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80'] },
            { name: 'Fresh Red Onions (1kg)', price: 40, description: 'Farm fresh sweet and pungent red onions stored properly.', category: catMap['Fresh Vegetables'], images: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&q=80'] },
            { name: 'Lays Classic Salted (50g)', price: 20, description: 'Original classic salted potato chips.', category: catMap['Snacks & Sweets'], images: ['https://images.unsplash.com/photo-1566478989037-eac248f79b45?w=300&q=80'] },
            { name: 'Fresh Tomatoes (1kg)', price: 35, description: 'Red and juicy tomatoes straight from the farm.', category: catMap['Fresh Vegetables'], images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&q=80'] },
            { name: 'Nestle Maggi (140g)', price: 28, description: '2 Minute instant noodles with tastemaker.', category: catMap['Snacks & Sweets'], images: ['https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&q=80'] },
            { name: 'Britannia Good Day (250g)', price: 40, description: 'Rich butter cookies with cashew nuts.', category: catMap['Snacks & Sweets'], images: ['https://images.unsplash.com/photo-1558961363-a0e227063c62?w=300&q=80'] },
            { name: 'Fresh Apples (1kg)', price: 120, description: 'Crisp and sweet fresh red apples.', category: catMap['Fresh Fruits'], images: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6bc6e?w=300&q=80'] },
            { name: 'Surf Excel Liquid (1L)', price: 200, description: 'Matic liquid detergent for washing machines.', category: catMap['Household'], images: ['https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=300&q=80'] },
            { name: 'Farm Eggs (6 pcs)', price: 45, description: 'Fresh farm eggs, rich in protein.', category: catMap['Dairy & Eggs'], images: ['https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=300&q=80'] },
            { name: 'Vim Dishwash Gel (250ml)', price: 55, description: 'Lemon powered dishwashing liquid.', category: catMap['Household'], images: ['https://images.unsplash.com/photo-1584820927498-cafeecdebf83?w=300&q=80'] },
            { name: 'Haldiram Bhujia (400g)', price: 110, description: 'Crispy namkeen bhujia.', category: catMap['Snacks & Sweets'], images: ['https://images.unsplash.com/photo-1604085449557-4f4c8e7bd228?w=300&q=80'] }
        ];

        const products = await Product.insertMany(productsToSeed);
        console.log('Products seeded:', products.length);

        console.log('Database seeded successfully!');
        process.exit();
    } catch (e) {
        console.error('Error seeding DB', e);
        process.exit(1);
    }
};

seedData();
