const express = require('express');
const { getDb } = require('../database/init');
const { requireLogin } = require('../middleware/auth');

module.exports = function (csrfProtection) {
  const router = express.Router();

  router.get('/', requireLogin, (req, res) => {
    const db = getDb();
    const userId = req.session.user.id;

    const friends = db.prepare(`
      SELECT u.* FROM friends f
      JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
      WHERE f.user_id = ? OR f.friend_id = ?
    `).all(userId, userId, userId);

    const requests = db.prepare(`
      SELECT fr.*, u.username, u.roblox_avatar_url FROM friend_requests fr
      JOIN users u ON fr.from_user_id = u.id
      WHERE fr.to_user_id = ? AND fr.status = 'pending'
    `).all(userId);

    const sentRequests = db.prepare(`
      SELECT fr.*, u.username, u.roblox_avatar_url FROM friend_requests fr
      JOIN users u ON fr.to_user_id = u.id
      WHERE fr.from_user_id = ? AND fr.status = 'pending'
    `).all(userId);

    res.render('friends', { title: 'Friends', friends, requests, sentRequests, csrfToken: '' });
  });

  router.post('/request/:userId', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    const fromId = req.session.user.id;
    const toId = parseInt(req.params.userId);

    if (fromId === toId) return res.redirect('back');

    const existing = db.prepare("SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'").get(fromId, toId);
    if (existing) return res.redirect('back');

    const alreadyFriends = db.prepare('SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').get(fromId, toId, toId, fromId);
    if (alreadyFriends) return res.redirect('back');

    db.prepare('INSERT INTO friend_requests (from_user_id, to_user_id) VALUES (?, ?)').run(fromId, toId);
    res.redirect('back');
  });

  router.post('/accept/:requestId', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    const request = db.prepare("SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'").get(parseInt(req.params.requestId), req.session.user.id);
    if (!request) return res.redirect('/friends');

    db.prepare("UPDATE friend_requests SET status = 'accepted' WHERE id = ?").run(request.id);
    db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)').run(request.from_user_id, request.to_user_id);
    res.redirect('/friends');
  });

  router.post('/decline/:requestId', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    db.prepare("UPDATE friend_requests SET status = 'declined' WHERE id = ? AND to_user_id = ?").run(parseInt(req.params.requestId), req.session.user.id);
    res.redirect('/friends');
  });

  router.post('/remove/:userId', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    const myId = req.session.user.id;
    const friendId = parseInt(req.params.userId);
    db.prepare('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').run(myId, friendId, friendId, myId);
    res.redirect('/friends');
  });

  return router;
};
