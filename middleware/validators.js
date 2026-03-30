// middleware/validators.js
// Input validation rules using express-validator
const { body, param, query } = require('express-validator');

/**
 * Validation rules for user registration.
 * Checks email format, domain, password strength, and confirmation match.
 */
const registerValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail()
    .custom((value) => {
      const domain = process.env.ALLOWED_EMAIL_DOMAIN || 'eastminster.ac.uk';
      if (!value.endsWith(`@${domain}`)) {
        throw new Error(`Email must be from the ${domain} domain`);
      }
      return true;
    }),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

/**
 * Validation rules for login.
 */
const loginValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Validation rules for password reset request.
 */
const forgotPasswordValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail()
];

/**
 * Validation rules for setting a new password.
 */
const resetPasswordValidation = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

/**
 * Validation rules for profile creation/update.
 */
const profileValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 100 }).withMessage('First name cannot exceed 100 characters')
    .escape(),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 100 }).withMessage('Last name cannot exceed 100 characters')
    .escape(),
  body('biography')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Biography cannot exceed 2000 characters'),
  body('linkedInUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL().withMessage('Please enter a valid URL')
    .matches(/^https?:\/\/(www\.)?linkedin\.com\/.*$/)
    .withMessage('Please enter a valid LinkedIn URL')
];

/**
 * Validation rules for bid placement.
 */
const bidValidation = [
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('Bid amount must be greater than zero')
    .toFloat()
];

/**
 * Validation rules for API client creation.
 */
const apiClientValidation = [
  body('clientName')
    .trim()
    .notEmpty().withMessage('Client name is required')
    .isLength({ max: 100 }).withMessage('Client name cannot exceed 100 characters')
    .escape()
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  profileValidation,
  bidValidation,
  apiClientValidation
};
