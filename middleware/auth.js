// auth middleware - protects routes and manages session data
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
};

// redirect logged in users away from login/register pages
const isGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/profile/dashboard');
  }
  next();
};

// make session data available in all views
const setCurrentUser = (req, res, next) => {
  res.locals.currentUser = req.session.userId || null;
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;

  // clear flash messages after reading them
  delete req.session.success;
  delete req.session.error;

  next();
};

module.exports = { isAuthenticated, isGuest, setCurrentUser };
