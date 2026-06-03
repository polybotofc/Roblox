const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/init');
const { requireLogin } = require('../middleware/auth');

module.exports = function (csrfProtection) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const db = getDb();
    const categories = db.prepare(`
      SELECT fc.*, 
        (SELECT COUNT(*) FROM threads WHERE category_id = fc.id) as thread_count,
        (SELECT COUNT(*) FROM posts p JOIN threads t ON p.thread_id = t.id WHERE t.category_id = fc.id) as post_count
      FROM forum_categories fc ORDER BY fc.sort_order
    `).all();
    res.render('forum', { title: 'Forum', categories });
  });

  router.get('/category/:slug', (req, res) => {
    const db = getDb();
    const category = db.prepare('SELECT * FROM forum_categories WHERE slug = ?').get(req.params.slug);
    if (!category) return res.status(404).render('error', { title: 'Not Found', message: 'Category not found.' });

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const threads = db.prepare(`
      SELECT t.*, u.username, u.roblox_avatar_url,
        (SELECT COUNT(*) FROM posts WHERE thread_id = t.id) as reply_count,
        (SELECT MAX(created_at) FROM posts WHERE thread_id = t.id) as last_reply_at
      FROM threads t JOIN users u ON t.user_id = u.id
      WHERE t.category_id = ?
      ORDER BY t.is_pinned DESC, t.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(category.id, limit, offset);

    const totalThreads = db.prepare('SELECT COUNT(*) as cnt FROM threads WHERE category_id = ?').get(category.id).cnt;
    const totalPages = Math.ceil(totalThreads / limit);

    res.render('forum-category', { title: category.name, category, threads, page, totalPages, csrfToken: '' });
  });

  router.get('/thread/:id', csrfProtection, (req, res) => {
    const db = getDb();
    const thread = db.prepare(`
      SELECT t.*, u.username, u.roblox_avatar_url, fc.name as category_name, fc.slug as category_slug
      FROM threads t JOIN users u ON t.user_id = u.id JOIN forum_categories fc ON t.category_id = fc.id
      WHERE t.id = ?
    `).get(parseInt(req.params.id));
    if (!thread) return res.status(404).render('error', { title: 'Not Found', message: 'Thread not found.' });

    db.prepare('UPDATE threads SET views = views + 1 WHERE id = ?').run(thread.id);

    const posts = db.prepare(`
      SELECT p.*, u.username, u.roblox_avatar_url, u.role,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as user_post_count,
        qp.body as quoted_body, qu.username as quoted_username
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN posts qp ON p.quote_post_id = qp.id
      LEFT JOIN users qu ON qp.user_id = qu.id
      WHERE p.thread_id = ?
      ORDER BY p.created_at ASC
    `).all(thread.id);

    res.render('thread', { title: thread.title, thread, posts, csrfToken: req.csrfToken() });
  });

  router.get('/new/:slug', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    const category = db.prepare('SELECT * FROM forum_categories WHERE slug = ?').get(req.params.slug);
    if (!category) return res.status(404).render('error', { title: 'Not Found', message: 'Category not found.' });
    res.render('new-thread', { title: 'New Thread', category, errors: [], csrfToken: req.csrfToken(), old: {} });
  });

  router.post('/new/:slug', requireLogin, csrfProtection, [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters.'),
    body('body').trim().isLength({ min: 1, max: 10000 }).withMessage('Post body is required.')
  ], (req, res) => {
    const db = getDb();
    const category = db.prepare('SELECT * FROM forum_categories WHERE slug = ?').get(req.params.slug);
    if (!category) return res.status(404).render('error', { title: 'Not Found', message: 'Category not found.' });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('new-thread', { title: 'New Thread', category, errors: errors.array(), csrfToken: req.csrfToken(), old: req.body });
    }

    const result = db.prepare('INSERT INTO threads (category_id, user_id, title) VALUES (?, ?, ?)').run(category.id, req.session.user.id, req.body.title);
    db.prepare('INSERT INTO posts (thread_id, user_id, body) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.session.user.id, req.body.body);
    res.redirect(`/forum/thread/${result.lastInsertRowid}`);
  });

  router.post('/reply/:threadId', requireLogin, csrfProtection, [
    body('body').trim().isLength({ min: 1, max: 10000 }).withMessage('Reply body is required.')
  ], (req, res) => {
    const db = getDb();
    const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(parseInt(req.params.threadId));
    if (!thread || thread.is_locked) return res.redirect('/forum');

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.redirect(`/forum/thread/${thread.id}`);

    const quoteId = req.body.quote_post_id ? parseInt(req.body.quote_post_id) : null;
    db.prepare('INSERT INTO posts (thread_id, user_id, body, quote_post_id) VALUES (?, ?, ?, ?)').run(thread.id, req.session.user.id, req.body.body, quoteId);
    db.prepare('UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(thread.id);
    res.redirect(`/forum/thread/${thread.id}`);
  });

  router.post('/delete-post/:postId', requireLogin, csrfProtection, (req, res) => {
    const db = getDb();
    const post = db.prepare('SELECT p.*, t.id as tid FROM posts p JOIN threads t ON p.thread_id = t.id WHERE p.id = ?').get(parseInt(req.params.postId));
    if (!post) return res.redirect('/forum');

    const isOwner = post.user_id === req.session.user.id;
    const isMod = ['moderator', 'administrator', 'owner'].includes(req.session.user.role);
    if (!isOwner && !isMod) return res.redirect(`/forum/thread/${post.tid}`);

    db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
    const remaining = db.prepare('SELECT COUNT(*) as cnt FROM posts WHERE thread_id = ?').get(post.tid).cnt;
    if (remaining === 0) {
      db.prepare('DELETE FROM threads WHERE id = ?').run(post.tid);
      return res.redirect('/forum');
    }
    res.redirect(`/forum/thread/${post.tid}`);
  });

  return router;
};
