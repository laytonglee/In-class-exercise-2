const User = require('../models/User');
const { signToken } = require('../middleware/jwtAuth');
const crypto = require('crypto');

// How long JWT and its cookie last (match JWT_EXPIRES_IN, defaulting to 1h)
const COOKIE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/** Helper — attach both cookies after a successful auth */
function setAuthCookies(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. JWT in httpOnly cookie — JS cannot read this, protects against XSS
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: COOKIE_MAX_AGE_MS
  });

  // 2. CSRF token in a readable cookie — JS CAN read this,
  //    client must send it back in the X-CSRF-Token header.
  //    httpOnly:false is intentional — that's the whole point of the double-submit pattern.
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf-token', csrfToken, {
    httpOnly: false,   // readable by JavaScript
    sameSite: 'lax',
    secure: isProduction,
    maxAge: COOKIE_MAX_AGE_MS
  });
}

exports.register = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (String(username).trim().length < 3) {
    return res.status(400).json({ error: 'username must be at least 3 characters' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  try {
    const user = await User.create({ username: String(username).trim(), password });
    const token = signToken(user);
    setAuthCookies(res, token);
    // Token is NOT returned in the body — it lives in the httpOnly cookie
    return res.status(201).json({ message: 'Registered successfully', user });
  } catch (err) {
    if (err.code === 'USER_EXISTS') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    return res.status(500).json({ error: 'Internal error' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  try {
    const user = await User.verifyPassword(String(username).trim(), password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    setAuthCookies(res, token);
    // Token is NOT returned in the body — it lives in the httpOnly cookie
    return res.json({ message: 'Logged in successfully', user });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.clearCookie('csrf-token');
  return res.json({ message: 'Logged out successfully' });
};

exports.me = (req, res) => {
  return res.json({ user: req.user });
};
