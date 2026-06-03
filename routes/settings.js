const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/init');
const { requireLogin } = require('../middleware/auth');

module.exports = function (csrfProtection) {
  const router = express.Router();

  router.get('/', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    res.render('settings', { title: 'Settings', profile: profile || {}, userInfo: user, errors: [], success: req.query.success, csrfToken: req.csrfToken() });
  });

  router.post('/password', requireLogin, csrfProtection, [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) throw new Error('Passwords do not match.');
      return true;
    })
  ], async (req, res) => {
    const errors = validationResult(req);
    const db = getDb();
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);

    if (!errors.isEmpty()) {
      return res.render('settings', { title: 'Settings', profile: profile || {}, userInfo: user, errors: errors.array(), success: null, csrfToken: req.csrfToken() });
    }

    const match = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!match) {
      return res.render('settings', { title: 'Settings', profile: profile || {}, userInfo: user, errors: [{ msg: 'Current password is incorrect.' }], success: null, csrfToken: req.csrfToken() });
    }

    const hashed = await bcrypt.hash(req.body.newPassword, 12);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.session.user.id);
    res.redirect('/settings?success=password');
  });

  router.post('/email', requireLogin, csrfProtection, [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email.')
  ], (req, res) => {
    const errors = validationResult(req);
    const db = getDb();
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);

    if (!errors.isEmpty()) {
      return res.render('settings', { title: 'Settings', profile: profile || {}, userInfo: user, errors: errors.array(), success: null, csrfToken: req.csrfToken() });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(req.body.email, req.session.user.id);
    if (existing) {
      return res.render('settings', { title: 'Settings', profile: profile || {}, userInfo: user, errors: [{ msg: 'Email already in use.' }], success: null, csrfToken: req.csrfToken() });
    }

    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(req.body.email, req.session.user.id);
    req.session.user.email = req.body.email;
    res.redirect('/settings?success=email');
  });

  router.post('/bio', requireLogin, csrfProtection, [
    body('bio').isLength({ max: 500 }).withMessage('Bio must be under 500 characters.')
  ], (req, res) => {
    const db = getDb();
    db.prepare('UPDATE profiles SET bio = ? WHERE user_id = ?').run(req.body.bio || '', req.session.user.id);
    res.redirect('/settings?success=bio');
  });

  router.post('/favorite-game', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    db.prepare('UPDATE profiles SET favorite_game = ? WHERE user_id = ?').run(req.body.favorite_game || '', req.session.user.id);
    res.redirect('/settings?success=game');
  });

  router.post('/privacy', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    const validOptions = ['everyone', 'friends', 'nobody'];
    const profilePrivacy = validOptions.includes(req.body.privacy_profile) ? req.body.privacy_profile : 'everyone';
    const onlinePrivacy = validOptions.includes(req.body.privacy_online) ? req.body.privacy_online : 'everyone';
    const friendsPrivacy = validOptions.includes(req.body.privacy_friends) ? req.body.privacy_friends : 'everyone';

    db.prepare('UPDATE profiles SET privacy_profile = ?, privacy_online = ?, privacy_friends = ? WHERE user_id = ?').run(profilePrivacy, onlinePrivacy, friendsPrivacy, req.session.user.id);
    res.redirect('/settings?success=privacy');
  });

  return router;
};
