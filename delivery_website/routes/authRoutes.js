const express = require('express');
const router = express.Router();
const { registerUser, loginUser, forgotPassword, resetPassword, getUsers, updateProfile } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', upload.single('profileImage'), registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/profile', protect, upload.single('profileImage'), updateProfile);
router.get('/users', protect, admin, getUsers);

module.exports = router;
