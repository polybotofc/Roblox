function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('error', { title: 'Forbidden', message: 'You do not have permission to access this page.' });
    }
    next();
  };
}

function requireNotBanned(req, res, next) {
  if (req.session.user && req.session.user.is_banned) {
    req.session.destroy();
    return res.redirect('/auth/login?banned=1');
  }
  next();
}

module.exports = { requireLogin, requireRole, requireNotBanned };
