// middleware/csrf.js
// Custom CSRF protection using rotating tokens.
// Generates tokens for GET requests and verifies them on POST/PUT/DELETE.
// Tokens are single-use (rotated) for better security.

var crypto = require('crypto');

/**
 * CSRF token generation using crypto.randomBytes (CSPRNG)
 */
function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = function(req, res, next) {
  // Skip CSRF for API routes — they use Bearer token authentication instead.
  // API clients don't have sessions, so CSRF doesn't apply to them.
  if (req.path.startsWith('/api/v1/') || req.path.startsWith('/api-docs')) {
    return next();
  }

  // Generate a new token if none exists in the session
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  // Make the token available to all EJS templates via res.locals
  res.locals.csrfToken = req.session.csrfToken;

  // On data-modifying requests (POST, PUT, DELETE), verify the token
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    // Token can come from form body, query string, or X-CSRF-Token header
    const token = (req.body ? req.body._csrf : null) || req.query._csrf || req.headers['x-csrf-token'];
    
    if (!token || token !== req.session.csrfToken) {
      // Token mismatch — likely a CSRF attack or expired session
      const errorMsg = 'Session expired or security token mismatch. Please try again.';
      
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(403).json({ success: false, error: errorMsg });
      } else {
        // Use flash message helper if available on the response object
        if (typeof res.message === 'function') {
          res.message({ type: 'error', text: errorMsg });
          return res.redirect('/auth/login');
        }
        return res.status(403).send(errorMsg);
      }
    }

    // Token verified successfully — ROTATE it so it becomes single-use.
    // The next page load will receive the new token via res.locals.
    req.session.csrfToken = generateCsrfToken();
  }

  next();
};

