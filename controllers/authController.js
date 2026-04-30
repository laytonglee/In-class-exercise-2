const crypto = require('crypto');
const User = require('../models/User');
const { signToken } = require('../middleware/jwtAuth');

const COOKIE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/** Set JWT (httpOnly) + CSRF token (readable) cookies on the response */
function setAuthCookies(res, user) {
  const isProduction = process.env.NODE_ENV === 'production';
  const token = signToken(user);

  // JWT — httpOnly so JS cannot steal it (XSS protection)
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: COOKIE_MAX_AGE_MS
  });

  // CSRF token — NOT httpOnly so JS can read it and send it as a header
  res.cookie('csrf-token', crypto.randomBytes(32).toString('hex'), {
    httpOnly: false,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: COOKIE_MAX_AGE_MS
  });
}

exports.getLogin = (req, res) => {
  res.render('login', {
    title: 'Sign In',
    csrfToken: req.csrfToken && req.csrfToken(),
    flash: req.session.flash || null
  });
  req.session.flash = null;
};

exports.postLogin = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).render('login', {
      title: 'Sign In',
      csrfToken: req.csrfToken && req.csrfToken(),
      error: 'Username and password are required',
      values: { username }
    });
  }
  try {
    const user = await User.verifyPassword(username.trim(), password);
    if (!user) {
      return res.status(401).render('login', {
        title: 'Sign In',
        csrfToken: req.csrfToken && req.csrfToken(),
        error: 'Invalid credentials',
        values: { username }
      });
    }
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).render('login', {
          title: 'Sign In',
          csrfToken: req.csrfToken && req.csrfToken(),
          error: 'Could not start a session. Please try again.'
        });
      }
      req.session.user = { id: user.id, username: user.username };
      req.session.flash = { type: 'success', message: `Welcome back, ${user.username}.` };
      setAuthCookies(res, user); // set JWT + CSRF cookies
      req.session.save(() => res.redirect('/dashboard'));
    });
  } catch (err) {
    return res.status(500).render('login', {
      title: 'Sign In',
      csrfToken: req.csrfToken && req.csrfToken(),
      error: 'Unexpected error. Please try again.'
    });
  }
};

exports.getRegister = (req, res) => {
  res.render('register', {
    title: 'Create Account',
    csrfToken: req.csrfToken && req.csrfToken()
  });
};

exports.postRegister = async (req, res) => {
  const { username, password, confirm } = req.body || {};
  const trimmed = (username || '').trim();

  if (!trimmed || trimmed.length < 3) {
    return res.status(400).render('register', {
      title: 'Create Account',
      csrfToken: req.csrfToken && req.csrfToken(),
      error: 'Username must be at least 3 characters',
      values: { username: trimmed }
    });
  }
  if (!password || password.length < 6) {
    return res.status(400).render('register', {
      title: 'Create Account',
      csrfToken: req.csrfToken && req.csrfToken(),
      error: 'Password must be at least 6 characters',
      values: { username: trimmed }
    });
  }
  if (password !== confirm) {
    return res.status(400).render('register', {
      title: 'Create Account',
      csrfToken: req.csrfToken && req.csrfToken(),
      error: 'Passwords do not match',
      values: { username: trimmed }
    });
  }

  try {
    const created = await User.create({ username: trimmed, password });
    req.session.regenerate((err) => {
      if (err) return res.redirect('/login');
      req.session.user = { id: created.id, username: created.username };
      req.session.flash = { type: 'success', message: 'Account created. Welcome.' };
      setAuthCookies(res, created); // set JWT + CSRF cookies
      req.session.save(() => res.redirect('/dashboard'));
    });
  } catch (err) {
    if (err.code === 'USER_EXISTS') {
      return res.status(409).render('register', {
        title: 'Create Account',
        csrfToken: req.csrfToken && req.csrfToken(),
        error: 'Username already taken',
        values: { username: trimmed }
      });
    }
    return res.status(500).render('register', {
      title: 'Create Account',
      csrfToken: req.csrfToken && req.csrfToken(),
      error: 'Unexpected error. Please try again.'
    });
  }
};

exports.postLogout = (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.clearCookie('token');       // clear JWT cookie
      res.clearCookie('csrf-token');  // clear CSRF cookie
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
};
