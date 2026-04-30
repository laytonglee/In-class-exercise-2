function requireSession(req, res, next) {
  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;
    return next();
  }
  return res.redirect('/login');
}

function attachUser(req, res, next) {
  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;
  }
  next();
}

function redirectIfAuthed(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = { requireSession, attachUser, redirectIfAuthed };
