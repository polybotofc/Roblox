const express = require('express');
const { getRobloxAvatarDetails, getRobloxAvatar } = require('../utils/roblox-api');
const { getDb } = require('../database/init');
const { requireLogin } = require('../middleware/auth');
const fetch = require('node-fetch');

module.exports = function (csrfProtection) {
  const router = express.Router();

  router.get('/', requireLogin, csrfProtection, async (req, res) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
      const robloxUserId = user.roblox_user_id;

      const avatarDetails = await getRobloxAvatarDetails(robloxUserId);

      let assetDetails = [];
      if (avatarDetails && avatarDetails.wearing && avatarDetails.wearing.length > 0) {
        try {
          const assetIds = avatarDetails.wearing.slice(0, 12);
          const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${assetIds.join(',')}&returnPolicy=PlaceHolder&size=110x110&format=Png&isCircular=false`);
          const thumbData = await thumbRes.json();
          if (thumbData.data) {
            assetDetails = thumbData.data.map(a => ({
              id: a.targetId,
              imageUrl: a.imageUrl || '/images/roblox-game-default.svg'
            }));
          }
        } catch {}
      }

      res.render('avatar', {
        title: 'My Avatar',
        avatarDetails,
        assetDetails,
        robloxUserId,
        robloxUsername: user.roblox_username,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { title: 'Error', message: 'Failed to load avatar.' });
    }
  });

  router.get('/render/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId) return res.status(400).json({ error: 'Invalid user ID' });

      const avatarDetails = await getRobloxAvatarDetails(userId);
      if (!avatarDetails) return res.status(404).json({ error: 'Avatar not found' });

      res.json(avatarDetails);
    } catch {
      res.status(500).json({ error: 'Failed to render avatar' });
    }
  });

  router.post('/refresh', requireLogin, csrfProtection, async (req, res) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);

      const newAvatarUrl = await getRobloxAvatar(user.roblox_user_id);
      db.prepare('UPDATE users SET roblox_avatar_url = ? WHERE id = ?').run(newAvatarUrl, user.id);

      req.session.user.roblox_avatar_url = newAvatarUrl;

      res.redirect('/avatar');
    } catch (err) {
      console.error(err);
      res.redirect('/avatar');
    }
  });

  return router;
};
