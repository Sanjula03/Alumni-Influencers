// index.js - main entry point
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

// CSRF protection using rotating tokens
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
