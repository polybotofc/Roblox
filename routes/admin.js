const express = require('express');
const { getDb } = require('../database/init');
const { requireRole } = require('../middleware/auth');

module.exports = function (csrfProtection) {
  const router = express.Router();
  const adminRoles = ['moderator', 'administrator', 'owner'];

  router.get('/', requireRole(adminRoles), (req, res) => {
    const db = getDb();
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    const threadCount = db.prepare('SELECT COUNT(*) as cnt FROM threads').get().cnt;
    const postCount = db.prepare('SELECT COUNT(*) as cnt FROM posts').get().cnt;
    const bannedCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_banned = 1').get().cnt;
    const newsCount = db.prepare('SELECT COUNT(*) as cnt FROM news').get().cnt;

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: { users: userCount, threads: threadCount, posts: postCount, banned: bannedCount, news: newsCount }
    });
  });

  router.get('/users', requireRole(adminRoles), (req, res) => {
    const db = getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let users, totalUsers;
    if (search) {
      users = db.prepare('SELECT * FROM users WHERE username LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(`%${search}%`, limit, offset);
      totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE username LIKE ?').get(`%${search}%`).cnt;
    } else {
      users = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
      totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    }
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/users', { title: 'Manage Users', users, page, totalPages, search, csrfToken: '' });
  });

  router.post('/ban/:userId', requireRole(['administrator', 'owner']), csrfProtection, (req, res) => {
    const db = getDb();
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(parseInt(req.params.userId));
    if (!targetUser) return res.redirect('/admin/users');

    if (targetUser.role === 'owner') return res.redirect('/admin/users');
    if (req.session.user.role === 'administrator' && ['administrator', 'owner'].includes(targetUser.role)) {
      return res.redirect('/admin/users');
    }

    db.prepare('UPDATE users SET is_banned = 1, ban_reason = ? WHERE id = ?').run(req.body.reason || 'No reason specified.', targetUser.id);
    res.redirect('/admin/users');
  });

  router.post('/unban/:userId', requireRole(['administrator', 'owner']), csrfProtection, (req, res) => {
    const db = getDb();
    db.prepare('UPDATE users SET is_banned = 0, ban_reason = NULL WHERE id = ?').run(parseInt(req.params.userId));
    res.redirect('/admin/users');
  });

  router.post('/role/:userId', requireRole(['owner']), csrfProtection, (req, res) => {
    const db = getDb();
    const validRoles = ['user', 'moderator', 'administrator', 'owner'];
    const newRole = validRoles.includes(req.body.role) ? req.body.role : 'user';
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, parseInt(req.params.userId));
    res.redirect('/admin/users');
  });

  router.post('/delete-thread/:threadId', requireRole(adminRoles), csrfProtection, (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM posts WHERE thread_id = ?').run(parseInt(req.params.threadId));
    db.prepare('DELETE FROM threads WHERE id = ?').run(parseInt(req.params.threadId));
    res.redirect('back');
  });

  router.post('/delete-post/:postId', requireRole(adminRoles), csrfProtection, (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM posts WHERE id = ?').run(parseInt(req.params.postId));
    res.redirect('back');
  });

  return router;
};
