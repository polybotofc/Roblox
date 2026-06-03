const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/init');
const { requireLogin } = require('../middleware/auth');

module.exports = function (csrfProtection) {
  const router = express.Router();

  router.get('/', requireLogin, (req, res) => {
    res.redirect('/messages/inbox');
  });

  router.get('/inbox', requireLogin, (req, res) => {
    const db = getDb();
    const messages = db.prepare(`
      SELECT m.*, u.username as from_username, u.roblox_avatar_url as from_avatar
      FROM messages m JOIN users u ON m.from_user_id = u.id
      WHERE m.to_user_id = ? AND m.deleted_by_receiver = 0
      ORDER BY m.created_at DESC
    `).all(req.session.user.id);

    res.render('messages', { title: 'Inbox', messages, tab: 'inbox', csrfToken: '' });
  });

  router.get('/sent', requireLogin, (req, res) => {
    const db = getDb();
    const messages = db.prepare(`
      SELECT m.*, u.username as to_username, u.roblox_avatar_url as to_avatar
      FROM messages m JOIN users u ON m.to_user_id = u.id
      WHERE m.from_user_id = ? AND m.deleted_by_sender = 0
      ORDER BY m.created_at DESC
    `).all(req.session.user.id);

    res.render('messages', { title: 'Sent Messages', messages, tab: 'sent', csrfToken: '' });
  });

  router.get('/compose', requireLogin, csrfProtection, (req, res) => {
    const toUser = req.query.to || '';
    res.render('compose-message', { title: 'Compose Message', errors: [], csrfToken: req.csrfToken(), toUser, old: {} });
  });

  router.post('/compose', requireLogin, csrfProtection, [
    body('to').trim().notEmpty().withMessage('Recipient is required.'),
    body('subject').trim().isLength({ min: 1, max: 100 }).withMessage('Subject is required (max 100 chars).'),
    body('body').trim().isLength({ min: 1, max: 5000 }).withMessage('Message body is required (max 5000 chars).')
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('compose-message', { title: 'Compose Message', errors: errors.array(), csrfToken: req.csrfToken(), toUser: req.body.to, old: req.body });
    }

    const db = getDb();
    const recipient = db.prepare('SELECT id FROM users WHERE username = ?').get(req.body.to);
    if (!recipient) {
      return res.render('compose-message', { title: 'Compose Message', errors: [{ msg: 'User not found.' }], csrfToken: req.csrfToken(), toUser: req.body.to, old: req.body });
    }

    db.prepare('INSERT INTO messages (from_user_id, to_user_id, subject, body) VALUES (?, ?, ?, ?)').run(req.session.user.id, recipient.id, req.body.subject, req.body.body);
    res.redirect('/messages/sent');
  });

  router.get('/view/:id', requireLogin, (req, res) => {
    const db = getDb();
    const msg = db.prepare(`
      SELECT m.*, 
        sender.username as from_username, sender.roblox_avatar_url as from_avatar,
        receiver.username as to_username
      FROM messages m 
      JOIN users sender ON m.from_user_id = sender.id
      JOIN users receiver ON m.to_user_id = receiver.id
      WHERE m.id = ? AND (m.from_user_id = ? OR m.to_user_id = ?)
    `).get(parseInt(req.params.id), req.session.user.id, req.session.user.id);

    if (!msg) return res.status(404).render('error', { title: 'Not Found', message: 'Message not found.' });

    if (msg.to_user_id === req.session.user.id && !msg.is_read) {
      db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(msg.id);
    }

    res.render('view-message', { title: msg.subject, msg });
  });

  router.post('/delete/:id', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND (from_user_id = ? OR to_user_id = ?)').get(parseInt(req.params.id), req.session.user.id, req.session.user.id);
    if (!msg) return res.redirect('/messages/inbox');

    if (msg.from_user_id === req.session.user.id) {
      db.prepare('UPDATE messages SET deleted_by_sender = 1 WHERE id = ?').run(msg.id);
    }
    if (msg.to_user_id === req.session.user.id) {
      db.prepare('UPDATE messages SET deleted_by_receiver = 1 WHERE id = ?').run(msg.id);
    }

    res.redirect('back');
  });

  return router;
};
