require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { engine } = require('express-handlebars');
const { csrfSync } = require('csrf-sync');

const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const { attachUser } = require('./middleware/sessionAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine: Handlebars
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    eq: (a, b) => a === b,
    ifEq: function (a, b, options) {
      return a === b ? options.fn(this) : options.inverse(this);
    },
    toLower: (s) => String(s || '').toLowerCase(),
    json: (ctx) => JSON.stringify(ctx),
    formatMoney: (n) => {
      const v = Number(n) || 0;
      return v.toFixed(2);
    }
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cookie parsing — needed for JWT cookie + CSRF cookie on API routes
app.use(cookieParser());

// Sessions (used by web UI)
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'dev_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

// CSRF (synchroniser pattern) - applied only to web routes (NOT to /api which uses JWT)
const {
  generateToken,
  csrfSynchronisedProtection
} = csrfSync({
  getTokenFromRequest: (req) => (req.body && req.body._csrf) || req.headers['x-csrf-token']
});

// Expose csrfToken() helper to controllers / views for any web request
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  req.csrfToken = () => generateToken(req);
  next();
});

// Mount API routes BEFORE session-based CSRF protection
// API routes use: JWT in httpOnly cookie + CSRF double-submit cookie pattern
app.use('/api', (req, res, next) => {
  // Only check CSRF on state-changing methods (login/register are intentionally exempt)
  const CSRF_EXEMPT = ['POST /api/login', 'POST /api/register', 'POST /api/logout'];
  const key = `${req.method} /api${req.path.replace(/\/$/, '')}`;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !CSRF_EXEMPT.includes(key)) {
    const cookieToken = req.cookies && req.cookies['csrf-token'];
    const headerToken = req.headers['x-csrf-token'];
    if (!cookieToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token. Send the csrf-token cookie value in the X-CSRF-Token header.' });
    }
  }
  next();
}, apiRoutes);

// Web routes — guard mutating verbs with CSRF
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfSynchronisedProtection(req, res, next);
  }
  return next();
});

// Make currentUser available to all web views
app.use(attachUser);

app.use('/', webRoutes);

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).render('error', {
    title: 'Page not found',
    message: 'The page you are looking for does not exist.'
  });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err && err.stack ? err.stack : err);
  if (req.path.startsWith('/api')) {
    if (err && err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', {
      title: 'Invalid request',
      message: 'Your session expired or the security token was invalid. Please reload and try again.'
    });
  }
  res.status(500).render('error', {
    title: 'Server error',
    message: 'Something went wrong. Please try again.'
  });
});

app.listen(PORT, () => {
  console.log(`Fuel Manager running on http://localhost:${PORT}`);
});
