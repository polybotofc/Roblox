const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/init');
const { requireLogin, requireRole } = require('../middleware/auth');

module.exports = function (csrfProtection) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const db = getDb();
    const category = req.query.category || '';
    let news;
    if (category) {
      news = db.prepare('SELECT news.*, users.username FROM news JOIN users ON news.user_id = users.id WHERE news.category = ? ORDER BY news.created_at DESC').all(category);
    } else {
      news = db.prepare('SELECT news.*, users.username FROM news JOIN users ON news.user_id = users.id ORDER BY news.created_at DESC').all();
    }
    res.render('news', { title: 'News', news, category });
  });

  router.get('/view/:id', (req, res) => {
    const db = getDb();
    const article = db.prepare('SELECT news.*, users.username FROM news JOIN users ON news.user_id = users.id WHERE news.id = ?').get(parseInt(req.params.id));
    if (!article) return res.status(404).render('error', { title: 'Not Found', message: 'Article not found.' });
    res.render('news-detail', { title: article.title, article });
  });

  router.get('/create', requireRole(['administrator', 'owner']), csrfProtection, (req, res) => {
    res.render('news-create', { title: 'Create News', errors: [], csrfToken: req.csrfToken(), old: {} });
  });

  router.post('/create', requireRole(['administrator', 'owner']), csrfProtection, [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title is required.'),
    body('body').trim().isLength({ min: 1 }).withMessage('Body is required.'),
    body('category').isIn(['announcement', 'event', 'update', 'maintenance']).withMessage('Invalid category.')
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('news-create', { title: 'Create News', errors: errors.array(), csrfToken: req.csrfToken(), old: req.body });
    }

    const db = getDb();
    db.prepare('INSERT INTO news (user_id, title, body, category) VALUES (?, ?, ?, ?)').run(req.session.user.id, req.body.title, req.body.body, req.body.category);
    res.redirect('/news');
  });

  router.get('/edit/:id', requireRole(['administrator', 'owner']), csrfProtection, (req, res) => {
    const db = getDb();
    const article = db.prepare('SELECT * FROM news WHERE id = ?').get(parseInt(req.params.id));
    if (!article) return res.status(404).render('error', { title: 'Not Found', message: 'Article not found.' });
    res.render('news-edit', { title: 'Edit News', article, errors: [], csrfToken: req.csrfToken() });
  });

  router.post('/edit/:id', requireRole(['administrator', 'owner']), csrfProtection, [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title is required.'),
    body('body').trim().isLength({ min: 1 }).withMessage('Body is required.'),
    body('category').isIn(['announcement', 'event', 'update', 'maintenance']).withMessage('Invalid category.')
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const db = getDb();
      const article = db.prepare('SELECT * FROM news WHERE id = ?').get(parseInt(req.params.id));
      return res.render('news-edit', { title: 'Edit News', article, errors: errors.array(), csrfToken: req.csrfToken() });
    }

    const db = getDb();
    db.prepare('UPDATE news SET title = ?, body = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.body.title, req.body.body, req.body.category, parseInt(req.params.id));
    res.redirect('/news');
  });

  return router;
};
