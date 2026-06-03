const express = require('express');
const router = express.Router();
const { getDb } = require('../database/init');
const { searchGames, searchUsers: searchRobloxUsers } = require('../utils/roblox-api');

router.get('/', async (req, res) => {
  const query = req.query.q || '';
  const type = req.query.type || 'all';

  if (!query.trim()) {
    return res.render('search', { title: 'Search', query: '', type, users: [], games: [], threads: [] });
  }

  const db = getDb();
  let users = [];
  let games = [];
  let threads = [];

  if (type === 'all' || type === 'users') {
    users = db.prepare("SELECT * FROM users WHERE username LIKE ? AND is_banned = 0 LIMIT 20").all(`%${query}%`);
  }

  if (type === 'all' || type === 'games') {
    try {
      games = await searchGames(query);
    } catch {
      games = [];
    }
  }

  if (type === 'all' || type === 'threads') {
    threads = db.prepare(`
      SELECT t.*, u.username, fc.name as category_name, fc.slug as category_slug
      FROM threads t JOIN users u ON t.user_id = u.id JOIN forum_categories fc ON t.category_id = fc.id
      WHERE t.title LIKE ? ORDER BY t.updated_at DESC LIMIT 20
    `).all(`%${query}%`);
  }

  res.render('search', { title: `Search: ${query}`, query, type, users, games, threads });
});

module.exports = router;
