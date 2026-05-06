const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createRecordId, readCollection, writeCollection } = require('../utils/fallbackStore');

const generateToken = (id, role = 'user') => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const isDatabaseReady = () => mongoose.connection.readyState === 1;
const readFallbackUsers = () => readCollection('users');
const writeFallbackUsers = (users) => writeCollection('users', users);

const createFallbackUser = async ({ name, email, password, phone, address }) => {
  const users = readFallbackUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = users.find((user) => user.email === normalizedEmail);

  if (existingUser) {
    return { error: 'User already exists' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    _id: createRecordId('user'),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'user',
    phone: phone || '',
    address: address || '',
    resetPasswordOtp: null,
    resetPasswordExpires: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(user);
  writeFallbackUsers(users);
  return { user };
};

const authenticateFallbackUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readFallbackUsers();
  const user = users.find((entry) => entry.email === normalizedEmail);

  if (!user) {
    return null;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  return matches ? user : null;
};

const updateFallbackUser = (email, updater) => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readFallbackUsers();
  const index = users.findIndex((user) => user.email === normalizedEmail);

  if (index === -1) {
    return null;
  }

  const updatedUser = updater({ ...users[index] });
  updatedUser.updatedAt = new Date().toISOString();
  users[index] = updatedUser;
  writeFallbackUsers(users);
  return updatedUser;
};

const updateFallbackUserById = (userId, updater) => {
  const users = readFallbackUsers();
  const index = users.findIndex((user) => String(user._id) === String(userId));

  if (index === -1) {
    return null;
  }

  const updatedUser = updater({ ...users[index] });
  updatedUser.updatedAt = new Date().toISOString();
  users[index] = updatedUser;
  writeFallbackUsers(users);
  return updatedUser;
};

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  try {
    if (!isDatabaseReady()) {
      const result = await createFallbackUser({ name, email, password, phone, address });

      if (result.error) {
        return res.status(400).json({ message: result.error });
      }

      return res.status(201).json({
        _id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone || '',
        address: result.user.address || '',
        role: result.user.role,
        token: generateToken(result.user._id, result.user.role),
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name, email, password, phone, address,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Check admin login
  if (email === process.env.ADMIN_SECRET_EMAIL && password === process.env.ADMIN_SECRET_PASSWORD) {
    return res.json({
      _id: 'admin',
      name: 'Administrator',
      email: email,
      phone: '',
      address: '',
      role: 'admin',
      token: generateToken('admin', 'admin'),
    });
  }

  try {
    if (!isDatabaseReady()) {
      const fallbackUser = await authenticateFallbackUser({ email, password });

      if (fallbackUser) {
        return res.json({
          _id: fallbackUser._id,
          name: fallbackUser.name,
          email: fallbackUser.email,
          phone: fallbackUser.phone || '',
          address: fallbackUser.address || '',
          role: fallbackUser.role,
          token: generateToken(fallbackUser._id, fallbackUser.role),
        });
      }

      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Basic OTP stub for reset password
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!isDatabaseReady()) {
      const fallbackUser = updateFallbackUser(email, (user) => {
        user.resetPasswordOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        return user;
      });

      if (!fallbackUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`[Fallback email stub] Sent to: ${email}, OTP: ${fallbackUser.resetPasswordOtp}`);
      return res.json({ message: 'OTP sent to email (check console)' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    console.log(`[Email stub] Sent to: ${email}, OTP: ${otp}`);
    res.json({ message: 'OTP sent to email (check console)' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        if (!isDatabaseReady()) {
            const fallbackUser = readFallbackUsers().find((user) =>
              user.email === email.trim().toLowerCase() &&
              user.resetPasswordOtp === otp &&
              user.resetPasswordExpires > Date.now()
            );

            if (!fallbackUser) {
              return res.status(400).json({ message: 'Invalid or expired OTP' });
            }

            const nextPasswordHash = await bcrypt.hash(newPassword, 10);
            updateFallbackUser(email, (user) => {
              user.passwordHash = nextPasswordHash;
              user.resetPasswordOtp = null;
              user.resetPasswordExpires = null;
              return user;
            });

            return res.json({ message: 'Password reset successful' });
        }

        const user = await User.findOne({ 
            email, 
            resetPasswordOtp: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.password = newPassword;
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all users
// @route   GET /api/auth/users (Admin only)
const getUsers = async (req, res) => {
  try {
    if (!isDatabaseReady()) {
      const users = readFallbackUsers().map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }));
      return res.json(users);
    }

    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update logged in user's basic profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const address = String(req.body.address || '').trim();

  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    if (!isDatabaseReady()) {
      const updatedUser = updateFallbackUserById(req.user._id, (user) => ({
        ...user,
        name,
        phone,
        address,
      }));

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        address: updatedUser.address || '',
        role: updatedUser.role,
        token: generateToken(updatedUser._id, updatedUser.role),
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name;
    user.phone = phone;
    user.address = address;
    await user.save();

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword, getUsers, updateProfile };
