const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/init');
const { getRandomRobloxUser } = require('../utils/roblox-api');

module.exports = function (csrfProtection, loginLimiter) {
  const router = express.Router();

  router.get('/register', csrfProtection, (req, res) => {
    res.render('register', { title: 'Register', errors: [], csrfToken: req.csrfToken(), old: {} });
  });

  router.post('/register', csrfProtection, [
    body('username').trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters.')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores.'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match.');
      return true;
    })
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('register', { title: 'Register', errors: errors.array(), csrfToken: req.csrfToken(), old: req.body });
    }

    const db = getDb();
    const { username, email, password } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.render('register', {
        title: 'Register',
        errors: [{ msg: 'Username or email already taken.' }],
        csrfToken: req.csrfToken(),
        old: req.body
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      let robloxData;
      try {
        robloxData = await getRandomRobloxUser();
      } catch {
        robloxData = {
          robloxUserId: Math.floor(Math.random() * 1000000),
          robloxUsername: 'RobloxUser',
          robloxAvatarUrl: 'https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png'
        };
      }

      const result = db.prepare(
        'INSERT INTO users (username, email, password, roblox_user_id, roblox_username, roblox_avatar_url) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(username, email, hashedPassword, robloxData.robloxUserId, robloxData.robloxUsername, robloxData.robloxAvatarUrl);

      db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(result.lastInsertRowid);
      db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(result.lastInsertRowid);

      req.session.user = {
        id: result.lastInsertRowid,
        username,
        email,
        role: 'user',
        is_banned: 0,
        roblox_avatar_url: robloxData.robloxAvatarUrl,
        roblox_username: robloxData.robloxUsername
      };

      res.redirect('/');
    } catch (err) {
      console.error(err);
      res.render('register', {
        title: 'Register',
        errors: [{ msg: 'Registration failed. Please try again.' }],
        csrfToken: req.csrfToken(),
        old: req.body
      });
    }
  });

  router.get('/login', csrfProtection, (req, res) => {
    res.render('login', { title: 'Login', errors: [], csrfToken: req.csrfToken(), banned: req.query.banned });
  });

  router.post('/login', loginLimiter, csrfProtection, [
    body('identifier').trim().notEmpty().withMessage('Username or email is required.'),
    body('password').notEmpty().withMessage('Password is required.')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('login', { title: 'Login', errors: errors.array(), csrfToken: req.csrfToken(), banned: null });
    }

    const db = getDb();
    const { identifier, password, remember } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(identifier, identifier);
    if (!user) {
      return res.render('login', { title: 'Login', errors: [{ msg: 'Invalid credentials.' }], csrfToken: req.csrfToken(), banned: null });
    }

    if (user.is_banned) {
      return res.render('login', { title: 'Login', errors: [{ msg: `Account banned: ${user.ban_reason || 'No reason specified.'}` }], csrfToken: req.csrfToken(), banned: '1' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('login', { title: 'Login', errors: [{ msg: 'Invalid credentials.' }], csrfToken: req.csrfToken(), banned: null });
    }

    if (remember) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }

    db.prepare('UPDATE users SET last_online = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_banned: user.is_banned,
      roblox_avatar_url: user.roblox_avatar_url,
      roblox_username: user.roblox_username
    };

    res.redirect('/');
  });

  router.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });

  return router;
};
