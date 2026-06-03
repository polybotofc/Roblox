const fetch = require('node-fetch');

async function getRandomRobloxUser() {
  const randomId = Math.floor(Math.random() * 5000000000) + 1;
  try {
    const res = await fetch(`https://users.roblox.com/v1/users/${randomId}`);
    if (!res.ok) return getRandomRobloxUser();
    const data = await res.json();
    if (data.isBanned) return getRandomRobloxUser();
    const avatarUrl = await getRobloxAvatar(randomId);
    return {
      robloxUserId: randomId,
      robloxUsername: data.name,
      robloxAvatarUrl: avatarUrl
    };
  } catch {
    return {
      robloxUserId: randomId,
      robloxUsername: 'RobloxUser',
      robloxAvatarUrl: `https://www.roblox.com/headshot-thumbnail/image?userId=${randomId}&width=420&height=420&format=png`
    };
  }
}

async function getRobloxAvatar(userId) {
  try {
    const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
    const data = await res.json();
    if (data.data && data.data[0] && data.data[0].imageUrl) {
      return data.data[0].imageUrl;
    }
  } catch {}
  return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;
}

async function getPopularGames() {
  try {
    const sortRes = await fetch('https://games.roblox.com/v1/games/sorts?GameSortsContext=2');
    const sortData = await sortRes.json();
    const popularSort = sortData.sorts ? sortData.sorts.find(s => s.name === 'Popular') : null;
    const token = popularSort ? popularSort.token : '';

    const gamesRes = await fetch(`https://games.roblox.com/v1/games/list?sortToken=${token}&limit=20`);
    const gamesData = await gamesRes.json();

    if (gamesData.games && gamesData.games.length > 0) {
      return await enrichGamesWithThumbnails(gamesData.games);
    }
  } catch {}
  return getFallbackGames();
}

async function getFeaturedGames() {
  try {
    const res = await fetch('https://games.roblox.com/v1/games/list?sortToken=&limit=10&sortOrder=Asc&gameFilter=1');
    const data = await res.json();
    if (data.games && data.games.length > 0) {
      return await enrichGamesWithThumbnails(data.games);
    }
  } catch {}
  return getFallbackGames();
}

async function searchGames(keyword) {
  try {
    const res = await fetch(`https://games.roblox.com/v1/games/list?keyword=${encodeURIComponent(keyword)}&limit=20`);
    const data = await res.json();
    if (data.games && data.games.length > 0) {
      return await enrichGamesWithThumbnails(data.games);
    }
  } catch {}
  return [];
}

async function getGameDetails(universeId) {
  try {
    const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
    const data = await res.json();
    if (data.data && data.data[0]) {
      const game = data.data[0];
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`);
      const thumbData = await thumbRes.json();
      let thumbnailUrl = '/images/game-placeholder.png';
      if (thumbData.data && thumbData.data[0] && thumbData.data[0].thumbnails && thumbData.data[0].thumbnails[0]) {
        thumbnailUrl = thumbData.data[0].thumbnails[0].imageUrl;
      }
      const votesRes = await fetch(`https://games.roblox.com/v1/games/votes?universeIds=${universeId}`);
      const votesData = await votesRes.json();
      let likes = 0, dislikes = 0;
      if (votesData.data && votesData.data[0]) {
        likes = votesData.data[0].upVotes || 0;
        dislikes = votesData.data[0].downVotes || 0;
      }
      return {
        universeId: game.id,
        placeId: game.rootPlaceId,
        name: game.name,
        description: game.description,
        creatorName: game.creator ? game.creator.name : 'Unknown',
        creatorId: game.creator ? game.creator.id : 0,
        playing: game.playing || 0,
        visits: game.visits || 0,
        favorites: game.favoritedCount || 0,
        likes,
        dislikes,
        maxPlayers: game.maxPlayers || 0,
        created: game.created,
        updated: game.updated,
        thumbnailUrl
      };
    }
  } catch {}
  return null;
}

async function getPlaceDetails(placeId) {
  try {
    const res = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`);
    const data = await res.json();
    if (data && data[0]) {
      return await getGameDetails(data[0].universeId);
    }
  } catch {}
  return null;
}

async function enrichGamesWithThumbnails(games) {
  const universeIds = games.map(g => g.universeId || g.id).join(',');
  let thumbnails = {};
  try {
    const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeIds}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`);
    const thumbData = await thumbRes.json();
    if (thumbData.data) {
      thumbData.data.forEach(t => {
        if (t.thumbnails && t.thumbnails[0]) {
          thumbnails[t.targetId] = t.thumbnails[0].imageUrl;
        }
      });
    }
  } catch {}

  return games.map(g => ({
    universeId: g.universeId || g.id,
    placeId: g.placeId || g.rootPlaceId,
    name: g.name,
    creatorName: g.creatorName || (g.creator ? g.creator.name : 'Unknown'),
    playing: g.playerCount || g.playing || 0,
    visits: g.totalUpVotes || g.visits || 0,
    thumbnailUrl: thumbnails[g.universeId || g.id] || '/images/game-placeholder.png'
  }));
}

function getFallbackGames() {
  const games = [
    { universeId: 2753915549, placeId: 7541759346, name: 'Blox Fruits', creatorName: 'Gamer Robot Inc', playing: 250000 },
    { universeId: 3260590327, placeId: 8737899170, name: 'Brookhaven RP', creatorName: 'Wolfpaq', playing: 300000 },
    { universeId: 65241, placeId: 286090429, name: 'Adopt Me!', creatorName: 'DreamCraft', playing: 200000 },
    { universeId: 1224539298, placeId: 3082002798, name: 'Murder Mystery 2', creatorName: 'Nikilis', playing: 100000 },
    { universeId: 2474168535, placeId: 6516141723, name: 'Anime Fighters', creatorName: 'Sulley', playing: 80000 },
    { universeId: 3241545870, placeId: 8560631822, name: 'Tower Defense Simulator', creatorName: 'Paradoxum Games', playing: 60000 },
    { universeId: 2184151436, placeId: 5581042857, name: 'Shindo Life', creatorName: 'RELL World', playing: 70000 },
    { universeId: 189707, placeId: 292439477, name: 'Jailbreak', creatorName: 'Badimo', playing: 50000 },
    { universeId: 301549746, placeId: 920587237, name: 'Royale High', creatorName: 'callmehbob', playing: 90000 },
    { universeId: 2616498302, placeId: 6872265039, name: 'Pet Simulator X', creatorName: 'BIG Games', playing: 110000 }
  ];
  return games.map(g => ({
    ...g,
    thumbnailUrl: `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${g.universeId}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`,
    visits: 0
  }));
}

async function searchUsers(keyword) {
  try {
    const res = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(keyword)}&limit=10`);
    const data = await res.json();
    if (data.data) {
      return data.data;
    }
  } catch {}
  return [];
}

module.exports = {
  getRandomRobloxUser,
  getRobloxAvatar,
  getPopularGames,
  getFeaturedGames,
  searchGames,
  getGameDetails,
  getPlaceDetails,
  searchUsers,
  getFallbackGames
};
