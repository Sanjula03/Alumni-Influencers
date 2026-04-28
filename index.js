// index.js - main entry point
// 
// APPLICATION ARCHITECTURE (Express MVC with SSR)
// ================================================
// This is a Server-Side Rendered (SSR) web application using the MVC pattern:
//   - Models:      /models/*.js (Sequelize ORM → MySQL)
//   - Views:       /views/**/*.ejs (EJS templates)
//   - Controllers: /controllers/*/index.js (loaded by lib/boot.js)
//   - Routes:      /routes/*.js (Express Router files for API endpoints)
//
// MIDDLEWARE PIPELINE (order matters for security):
//   1. Helmet (security headers: X-Frame-Options, CSP, etc.)
//   2. CORS (restricts origins to APP_URL only)
//   3. Rate Limiter (100 req/15min general, 10 req/15min for auth)
//   4. Body Parser (urlencoded + JSON)
//   5. XSS Sanitisation (strips < > from all string inputs)
//   6. Session (express-session with httpOnly, sameSite cookies)
//   7. CSRF Protection (single-use rotating tokens)
//   8. Route Handlers (auth, profiles, bids, API)
//
'use strict'

require('dotenv').config();

var express = require('express');
var session = require('express-session');
var helmet = require('helmet');
var cors = require('cors');
var path = require('node:path');
var methodOverride = require('method-override');

var { connectDB } = require('./db');

var app = module.exports = express();

// set our default template engine to "ejs"
app.set('view engine', 'ejs');

// set views for pages
app.set('views', path.join(__dirname, 'views'));

// connect to mysql
connectDB();

// load model associations
require('./models/index');

// Security headers via Helmet
// CSP configured to allow:
//   - Chart.js from JSDelivr CDN (for analytics charts)
//   - Inline scripts (required for EJS template data injection into Chart.js)
//   - Swagger UI resources from unpkg CDN
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true
}));

// rate limiting
var { generalLimiter } = require('./middleware/rateLimiter');
app.use(generalLimiter);

// serve static files
app.use(express.static(path.join(__dirname, 'public')));

// parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// allow overriding methods in query (?_method=put)
app.use(methodOverride('_method'));

// xss sanitisation for request body
app.use(function(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    var sanitize = function(obj) {
      for (var key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(/</g, '&lt;').replace(/>/g, '&gt;');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
});

// session
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET || 'change-this-in-production',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// csrf protection middleware
var csrfProtection = require('./middleware/csrf');
app.use(csrfProtection);

// session messages helper
app.response.message = function(msg) {
  var sess = this.req.session;
  sess.messages = sess.messages || [];
  sess.messages.push(msg);
  return this;
};

app.use(function(req, res, next) {
  if (req.session) {
    var msgs = req.session.messages || [];
    res.locals.messages = msgs;
    res.locals.hasMessages = !!msgs.length;
    res.locals.currentUser = req.session.userId || null;
    res.locals.userRole = req.session.userRole || null;
    if (msgs.length > 0) {
      req.session.messages = [];
    }
  }
  next();
});

// swagger api docs
var swaggerUi = require('swagger-ui-express');
var swaggerSpec = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Alumni Influencers API Docs'
}));

// mount routes
var authRoutes = require('./routes/authRoutes');
var profileRoutes = require('./routes/profileRoutes');
var bidRoutes = require('./routes/bidRoutes');
var apiRoutes = require('./routes/apiRoutes');

app.use('/', authRoutes);
app.use('/', profileRoutes);
app.use('/', bidRoutes);
app.use('/', apiRoutes);

// load main controllers via boot.js (lecturer's boilerplate pattern)
require('./lib/boot')(app, { verbose: !module.parent });

// start cron jobs
var { initCronJobs } = require('./utils/cronJobs');
initCronJobs();

app.use(function(err, req, res, next) {
  if (!module.parent) console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error: ' + err.message,
    stack: err.stack 
  });
});

// 404
app.use(function(req, res) {
  res.status(404).json({ error: 'Not found', url: req.originalUrl });
});

if (!module.parent) {
  var PORT = process.env.PORT || 3000;
  app.listen(PORT);
  console.log('Express started on port ' + PORT);
}
