// middleware/rateLimiter.js
// Rate limiting middleware to prevent brute-force and abuse
const rateLimit = require('express-rate-limit');

/**
 * General rate limiter — applies to all routes.
 * Allows 100 requests per 15-minute window per IP.
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false   // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication routes (login, register, password reset).
 * Allows only 10 attempts per 15-minute window per IP.
 * Prevents brute-force attacks on authentication endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { generalLimiter, authLimiter };
