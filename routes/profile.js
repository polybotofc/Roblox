const express = require('express');
const { getDb } = require('../database/init');
const { requireLogin } = require('../middleware/auth');

module.exports = function (csrfProtection) {
  const router = express.Router();

  router.get('/:username', csrfProtection, async (req, res) => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
    if (!user) {
      return res.status(404).render('error', { title: 'Not Found', message: 'User not found.' });
    }

    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);
    const friendCount = db.prepare('SELECT COUNT(*) as cnt FROM friends WHERE user_id = ? OR friend_id = ?').get(user.id, user.id).cnt;

    let isFriend = false;
    let hasPendingRequest = false;
    let hasReceivedRequest = false;

    if (req.session.user && req.session.user.id !== user.id) {
      const myId = req.session.user.id;
      isFriend = !!db.prepare('SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').get(myId, user.id, user.id, myId);
      hasPendingRequest = !!db.prepare("SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'").get(myId, user.id);
      hasReceivedRequest = !!db.prepare("SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'").get(user.id, myId);
    }

    const friends = db.prepare(`
      SELECT u.* FROM friends f
      JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
      WHERE f.user_id = ? OR f.friend_id = ?
      LIMIT 8
    `).all(user.id, user.id, user.id);

    res.render('profile', {
      title: user.username,
      profileUser: user,
      profile: profile || {},
      friendCount,
      friends,
      isFriend,
      hasPendingRequest,
      hasReceivedRequest,
      csrfToken: req.csrfToken()
    });
  });

  return router;
};
