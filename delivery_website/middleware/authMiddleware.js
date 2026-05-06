const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { readCollection } = require('../utils/fallbackStore');

const isDatabaseReady = () => mongoose.connection.readyState === 1;

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.role === 'admin') {
        req.user = { _id: 'admin', role: 'admin', name: 'Admin' };
        return next();
      }

      if (!isDatabaseReady()) {
        const fallbackUser = readCollection('users').find((user) => user._id === decoded.id);

        if (!fallbackUser) {
          return res.status(401).json({ message: 'User not found' });
        }

        req.user = {
          _id: fallbackUser._id,
          name: fallbackUser.name,
          email: fallbackUser.email,
          role: fallbackUser.role,
        };

        return next();
      }

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      return next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };
