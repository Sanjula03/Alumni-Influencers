// routes/authRoutes.js - authentication routes
// maps auth endpoints to the auth controller
'use strict'

var express = require('express');
var router = express.Router();
var { validationResult, body } = require('express-validator');
var User = require('../models/User');
var { generateToken } = require('../utils/tokenGenerator');
var { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
var { Op } = require('sequelize');
var { authLimiter } = require('../middleware/rateLimiter');
var { isAuthenticated } = require('../middleware/auth');

// validation rules
var registerValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom(function(value, { req }) {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  })
];

var loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// POST /auth/register
router.post('/auth/register', authLimiter, registerValidation, async function(req, res) {
  try {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    var { email, password } = req.body;

    var existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    if (process.env.ALLOWED_EMAIL_DOMAIN) {
      var domain = email.split('@')[1];
      if (domain !== process.env.ALLOWED_EMAIL_DOMAIN) {
        return res.status(400).json({
          success: false,
          error: 'Only ' + process.env.ALLOWED_EMAIL_DOMAIN + ' email addresses are allowed'
        });
      }
    }

    var verificationToken = generateToken();
    var tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    var user = await User.create({
      email: email.toLowerCase(),
      password: password,
      verification_token: verificationToken,
      verification_token_expiry: tokenExpiry
    });

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      userId: user.id
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/auth/login', authLimiter, loginValidation, async function(req, res) {
  try {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    var { email, password } = req.body;
    var user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ success: false, error: 'Please verify your email first' });
    }

    var isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    req.session.regenerate(function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: 'Session error' });
      }
      req.session.userId = user.id;
      req.session.email = user.email;
      res.json({ success: true, message: 'Logged in successfully', userId: user.id });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /auth/logout
router.post('/auth/logout', function(req, res) {
  req.session.destroy(function(err) {
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out' });
  });
});

// GET /auth/verify
router.get('/auth/verify', async function(req, res) {
  try {
    var { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    var user = await User.findOne({
      where: {
        verification_token: token,
        verification_token_expiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    await user.update({
      is_verified: true,
      verification_token: null,
      verification_token_expiry: null
    });

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// POST /auth/forgot-password
router.post('/auth/forgot-password', async function(req, res) {
  try {
    var { email } = req.body;
    var user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
    }

    var resetToken = generateToken();
    await user.update({
      reset_password_token: resetToken,
      reset_password_token_expiry: new Date(Date.now() + 60 * 60 * 1000)
    });

    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailErr) {
      console.error('Reset email failed:', emailErr.message);
    }

    res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Request failed' });
  }
});

// POST /auth/reset-password
router.post('/auth/reset-password', async function(req, res) {
  try {
    var { token, password, confirmPassword } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    var user = await User.findOne({
      where: {
        reset_password_token: token,
        reset_password_token_expiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.reset_password_token = null;
    user.reset_password_token_expiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Password reset failed' });
  }
});

module.exports = router;
