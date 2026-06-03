const express = require('express');
const router = express.Router();
const { getPopularGames, getFeaturedGames } = require('../utils/roblox-api');
const { getDb } = require('../database/init');

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    let popularGames = [];
    let featuredGames = [];

    try {
      popularGames = await getPopularGames();
      featuredGames = await getFeaturedGames();
    } catch {
      popularGames = [];
      featuredGames = [];
    }

    const news = db.prepare('SELECT news.*, users.username FROM news JOIN users ON news.user_id = users.id ORDER BY news.created_at DESC LIMIT 5').all();
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    const threadCount = db.prepare('SELECT COUNT(*) as cnt FROM threads').get().cnt;

    res.render('home', {
      title: 'Home',
      popularGames: popularGames.slice(0, 10),
      featuredGames: featuredGames.slice(0, 6),
      news,
      stats: { users: userCount, threads: threadCount }
    });
  } catch (err) {
    console.error(err);
    res.render('home', {
      title: 'Home',
      popularGames: [],
      featuredGames: [],
      news: [],
      stats: { users: 0, threads: 0 }
    });
  }
});

module.exports = router;
