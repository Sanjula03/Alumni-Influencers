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
var { isAuthenticated, isGuest } = require('../middleware/auth');

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

// GET /auth/register
router.get('/auth/register', isGuest, function(req, res) {
  res.render('auth/register');
});

// GET /auth/login
router.get('/auth/login', isGuest, function(req, res) {
  res.render('auth/login');
});

// GET /auth/forgot-password
router.get('/auth/forgot-password', isGuest, function(req, res) {
  res.render('auth/forgot-password');
});

// GET /auth/reset-password
router.get('/auth/reset-password', isGuest, function(req, res) {
  res.render('auth/reset-password', { token: req.query.token });
});

// POST /auth/register
router.post('/auth/register', authLimiter, registerValidation, async function(req, res) {
  try {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(e => res.message({ type: 'error', text: e.msg }));
      return res.redirect('/auth/register');
    }

    var { email, password } = req.body;

    var existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.message({ type: 'error', text: 'Email already registered' });
      return res.redirect('/auth/register');
    }

    if (process.env.ALLOWED_EMAIL_DOMAIN) {
      var domain = email.split('@')[1];
      if (domain !== process.env.ALLOWED_EMAIL_DOMAIN) {
        res.message({ type: 'error', text: 'Only ' + process.env.ALLOWED_EMAIL_DOMAIN + ' addresses are allowed' });
        return res.redirect('/auth/register');
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

    res.message({ type: 'success', text: 'Registration successful. Please check your email to verify.' });
    res.redirect('/auth/login');
  } catch (error) {
    res.message({ type: 'error', text: 'Registration failed' });
    res.redirect('/auth/register');
  }
});

// POST /auth/login
router.post('/auth/login', authLimiter, loginValidation, async function(req, res) {
  try {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(e => res.message({ type: 'error', text: e.msg }));
      return res.redirect('/auth/login');
    }

    var { email, password } = req.body;
    var user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      res.message({ type: 'error', text: 'Invalid email or password' });
      return res.redirect('/auth/login');
    }

    if (!user.is_verified) {
      res.message({ type: 'error', text: 'Please verify your email first' });
      return res.redirect('/auth/login');
    }

    var isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.message({ type: 'error', text: 'Invalid email or password' });
      return res.redirect('/auth/login');
    }

    req.session.regenerate(function(err) {
      if (err) {
        res.message({ type: 'error', text: 'Session error' });
        return res.redirect('/auth/login');
      }
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.userRole = user.role || 'alumnus';
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Login error:', error);
    res.message({ type: 'error', text: 'Login failed' });
    res.redirect('/auth/login');
  }
});

// POST /auth/logout
router.post('/auth/logout', function(req, res) {
  req.session.destroy(function(err) {
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
});

// GET /auth/verify
router.get('/auth/verify', async function(req, res) {
  try {
    var { token } = req.query;
    if (!token) {
      res.message({ type: 'error', text: 'Verification token is missing' });
      return res.redirect('/auth/login');
    }

    var user = await User.findOne({
      where: {
        verification_token: token,
        verification_token_expiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      res.message({ type: 'error', text: 'Invalid or expired token' });
      return res.redirect('/auth/login');
    }

    await user.update({
      is_verified: true,
      verification_token: null,
      verification_token_expiry: null
    });

    res.message({ type: 'success', text: 'Email verified successfully. Please login.' });
    res.redirect('/auth/login');
  } catch (error) {
    res.message({ type: 'error', text: 'Verification failed' });
    res.redirect('/auth/login');
  }
});

// GET /auth/verify-resend
router.get('/auth/verify-resend', function(req, res) {
  res.render('auth/verify-resend');
});

// POST /auth/verify-resend
router.post('/auth/verify-resend', authLimiter, async function(req, res) {
  try {
    var { email } = req.body;
    var user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      // Security: Don't reveal if user exists
      res.message({ type: 'success', text: 'If that email is registered, a new verification link has been sent.' });
      return res.redirect('/auth/login');
    }

    if (user.is_verified) {
      res.message({ type: 'success', text: 'Email is already verified. Please login.' });
      return res.redirect('/auth/login');
    }

    // Generate new token
    var verificationToken = generateToken();
    var tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.update({
      verification_token: verificationToken,
      verification_token_expiry: tokenExpiry
    });

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailErr) {
      console.error('Resend verification email failed:', emailErr.message);
    }

    res.message({ type: 'success', text: 'If that email is registered, a new verification link has been sent.' });
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Resend verify error:', error);
    res.message({ type: 'error', text: 'Failed to resend link' });
    res.redirect('/auth/verify-resend');
  }
});

// POST /auth/forgot-password
router.post('/auth/forgot-password', async function(req, res) {
  try {
    var { email } = req.body;
    var user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      res.message({ type: 'success', text: 'If that email exists, a reset link has been sent' });
      return res.redirect('/auth/login');
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

    res.message({ type: 'success', text: 'If that email exists, a reset link has been sent' });
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Forgot password error:', error);
    res.message({ type: 'error', text: 'Request failed' });
    res.redirect('/auth/forgot-password');
  }
});

// POST /auth/reset-password
router.post('/auth/reset-password', async function(req, res) {
  try {
    var { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      res.message({ type: 'error', text: 'All fields are required' });
      return res.redirect('/auth/reset-password?token=' + (token || ''));
    }
    if (password !== confirmPassword) {
      res.message({ type: 'error', text: 'Passwords do not match' });
      return res.redirect('/auth/reset-password?token=' + token);
    }

    if (password.length < 8) {
      res.message({ type: 'error', text: 'Password must be at least 8 characters' });
      return res.redirect('/auth/reset-password?token=' + token);
    }

    var user = await User.findOne({
      where: {
        reset_password_token: token,
        reset_password_token_expiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      res.message({ type: 'error', text: 'Invalid or expired reset token' });
      return res.redirect('/auth/forgot-password');
    }

    user.password = password;
    user.reset_password_token = null;
    user.reset_password_token_expiry = null;
    await user.save();

    res.message({ type: 'success', text: 'Password reset successfully. Please login.' });
    res.redirect('/auth/login');
  } catch (error) {
    res.message({ type: 'error', text: 'Password reset failed' });
    res.redirect('/auth/login');
  }
});

module.exports = router;
