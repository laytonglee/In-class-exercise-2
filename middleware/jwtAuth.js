const jwt = require('jsonwebtoken');

/**
 * requireJwt - reads JWT from the httpOnly 'token' cookie.
 * The CSRF double-submit check (x-csrf-token header vs csrf-token cookie)
 * is handled in server.js for all mutating API routes.
 */
function requireJwt(req, res, next) {
  // Read JWT from httpOnly cookie (set by /api/login or /api/register)
  const token = req.cookies && req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please log in via POST /api/login.' });
  }
  try {
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
    const decoded = jwt.verify(token, secret);
    req.user = { id: decoded.sub, username: decoded.username };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign(
    { sub: user.id, username: user.username },
    secret,
    { expiresIn, algorithm: 'HS256' }
  );
}

module.exports = { requireJwt, signToken };
