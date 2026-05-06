const express = require('express');
const router = express.Router();
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(getProducts)
  .post(
    protect,
    admin,
    upload.fields([
      { name: 'productMainImage', maxCount: 1 },
      { name: 'productGalleryImages', maxCount: 5 },
      { name: 'productImages', maxCount: 6 }
    ]),
    createProduct
  );

router.route('/:id')
  .get(getProductById)
  .put(
    protect,
    admin,
    upload.fields([
      { name: 'productMainImage', maxCount: 1 },
      { name: 'productGalleryImages', maxCount: 5 },
      { name: 'productImages', maxCount: 6 }
    ]),
    updateProduct
  )
  .delete(protect, admin, deleteProduct);

module.exports = router;
