// auth middleware - protects routes and manages session/role data
//
// ROLE-BASED ACCESS CONTROL (RBAC)
// =================================
// Three user roles mapped to Use Case diagram actors:
//   - 'alumnus'   → Manage Profile + Bidding System
//   - 'developer' → Manage API Keys + API Documentation
//   - 'admin'     → Full access to all features
//
const isAuthenticated = (req, res, next) => {
  // Prevent browser from caching protected pages
  // This solves the "Back button after logout" security issue
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
};

// redirect logged in users away from login/register pages
const isGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

// make session data available in all views
const setCurrentUser = (req, res, next) => {
  res.locals.currentUser = req.session.userId || null;
  res.locals.userRole = req.session.userRole || null;
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;

  // clear flash messages after reading them
  delete req.session.success;
  delete req.session.error;

  next();
};

/**
 * Role-based access middleware factory.
 * Usage: requireRole('alumnus', 'admin') — allows alumnus OR admin
 * @param  {...string} roles - Allowed role names
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    var userRole = req.session.userRole || 'alumnus';
    if (roles.includes(userRole)) {
      return next();
    }
    res.status(403);
    res.message({ type: 'error', text: 'Access denied. This feature is not available for your role.' });
    res.redirect('/dashboard');
  };
};

module.exports = { isAuthenticated, isGuest, setCurrentUser, requireRole };
