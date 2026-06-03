const express = require('express');
const router = express.Router();
const { getPopularGames, getFeaturedGames, getGameDetails, getPlaceDetails, searchGames } = require('../utils/roblox-api');

router.get('/', async (req, res) => {
  const category = req.query.category || 'popular';
  let games = [];
  let pageTitle = 'Popular Games';

  try {
    switch (category) {
      case 'featured':
        games = await getFeaturedGames();
        pageTitle = 'Featured Games';
        break;
      case 'popular':
      default:
        games = await getPopularGames();
        pageTitle = 'Popular Games';
        break;
    }
  } catch {
    games = [];
  }

  res.render('games', { title: pageTitle, games, category });
});

router.get('/detail/:universeId', async (req, res) => {
  try {
    const game = await getGameDetails(req.params.universeId);
    if (!game) {
      return res.status(404).render('error', { title: 'Not Found', message: 'Game not found.' });
    }
    res.render('game-detail', { title: game.name, game });
  } catch {
    res.status(500).render('error', { title: 'Error', message: 'Failed to load game details.' });
  }
});

router.get('/place/:placeId', async (req, res) => {
  try {
    const game = await getPlaceDetails(req.params.placeId);
    if (!game) {
      return res.status(404).render('error', { title: 'Not Found', message: 'Game not found.' });
    }
    res.render('game-detail', { title: game.name, game });
  } catch {
    res.status(500).render('error', { title: 'Error', message: 'Failed to load game details.' });
  }
});

module.exports = router;
