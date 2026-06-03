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

async function getRobloxFullAvatar(userId) {
  try {
    const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=352x352&format=Png&isCircular=false`);
    const data = await res.json();
    if (data.data && data.data[0] && data.data[0].imageUrl) {
      return data.data[0].imageUrl;
    }
  } catch {}
  return null;
}

async function getRobloxAvatarBust(userId) {
  try {
    const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${userId}&size=352x352&format=Png&isCircular=false`);
    const data = await res.json();
    if (data.data && data.data[0] && data.data[0].imageUrl) {
      return data.data[0].imageUrl;
    }
  } catch {}
  return null;
}

async function getRobloxAvatarDetails(userId) {
  try {
    const [headshot, fullBody, bust] = await Promise.all([
      getRobloxAvatar(userId),
      getRobloxFullAvatar(userId),
      getRobloxAvatarBust(userId)
    ]);

    let wearing = [];
    try {
      const wornRes = await fetch(`https://avatar.roblox.com/v1/users/${userId}/currently-wearing`);
      const wornData = await wornRes.json();
      if (wornData.assetIds) {
        wearing = wornData.assetIds.slice(0, 20);
      }
    } catch {}

    let colors = null;
    try {
      const colorsRes = await fetch(`https://avatar.roblox.com/v1/users/${userId}/avatar`);
      const colorsData = await colorsRes.json();
      if (colorsData.bodyColors) {
        colors = colorsData.bodyColors;
      }
    } catch {}

    return {
      headshot,
      fullBody,
      bust,
      wearing,
      colors
    };
  } catch {
    return null;
  }
}

const SEED_UNIVERSE_IDS = [
  994732206,   // Blox Fruits
  1686885941,  // Brookhaven RP
  383310974,   // Adopt Me
  66654135,    // Murder Mystery 2
  245662005,   // Jailbreak
  2619619496,  // BedWars
  5750914919,  // Fisch
];

const POPULAR_GAMES = [
  { universeId: 994732206,  placeId: 2753915549,  name: 'Blox Fruits',               creatorName: 'Gamer Robot Inc' },
  { universeId: 1686885941, placeId: 4924922222,  name: 'Brookhaven RP',             creatorName: 'Wolfpaq' },
  { universeId: 383310974,  placeId: 920587237,   name: 'Adopt Me!',                 creatorName: 'Uplift Games' },
  { universeId: 66654135,   placeId: 142823291,   name: 'Murder Mystery 2',          creatorName: 'Nikilis' },
  { universeId: 245662005,  placeId: 606849621,   name: 'Jailbreak',                 creatorName: 'Badimo' },
  { universeId: 2619619496, placeId: 6872265039,  name: 'BedWars',                   creatorName: 'Easy.gg' },
  { universeId: 321778215,  placeId: 735030788,   name: 'Royale High',               creatorName: 'callmehbob' },
  { universeId: 111958650,  placeId: 286090429,   name: 'Arsenal',                   creatorName: 'ROLVe' },
  { universeId: 65241,      placeId: 189707,      name: 'Natural Disaster Survival', creatorName: 'Stickmasterluke' },
  { universeId: 1176784616, placeId: 3260590327,  name: 'Tower Defense Simulator',   creatorName: 'Paradoxum Games' },
  { universeId: 210851291,  placeId: 537413528,   name: 'Build A Boat For Treasure', creatorName: 'Chillz Studios' },
  { universeId: 140239261,  placeId: 370731277,   name: 'MeepCity',                  creatorName: 'alexnewtron' },
  { universeId: 1335695570, placeId: 3956818381,  name: 'Ninja Legends',             creatorName: 'Scriptbloxian Studios' },
  { universeId: 1451439645, placeId: 4520749081,  name: 'King Legacy',               creatorName: 'Sea King Games' },
  { universeId: 1511883870, placeId: 4616652839,  name: 'Shinobi Life 2',            creatorName: 'RELL World' },
  { universeId: 5750914919, placeId: 16732694052, name: 'Fisch',                     creatorName: 'Fisching' },
  { universeId: 3317679266, placeId: 8737602449,  name: 'PLS DONATE',                creatorName: 'Quataun' },
  { universeId: 88070565,   placeId: 185655149,   name: 'Welcome to Bloxburg',       creatorName: 'Coeptus' },
];

async function getPopularGames() {
  try {
    const seed = SEED_UNIVERSE_IDS[Math.floor(Math.random() * SEED_UNIVERSE_IDS.length)];
    const res = await fetch(`https://games.roblox.com/v1/games/recommendations/game/${seed}?paginationKey=&maxRows=20`);
    const data = await res.json();

    if (data.games && data.games.length > 0) {
      const games = data.games.map(g => ({
        universeId: g.universeId,
        placeId: g.placeId,
        name: g.name,
        creatorName: g.creatorName || 'Unknown',
        playing: g.playerCount || 0
      }));
      return await enrichGamesWithThumbnails(games);
    }
  } catch {}
  return await getFallbackGames();
}

async function getFeaturedGames() {
  try {
    const seed = SEED_UNIVERSE_IDS[Math.floor(Math.random() * SEED_UNIVERSE_IDS.length)];
    const res = await fetch(`https://games.roblox.com/v1/games/recommendations/game/${seed}?paginationKey=&maxRows=10`);
    const data = await res.json();

    if (data.games && data.games.length > 0) {
      const games = data.games.map(g => ({
        universeId: g.universeId,
        placeId: g.placeId,
        name: g.name,
        creatorName: g.creatorName || 'Unknown',
        playing: g.playerCount || 0
      }));
      return await enrichGamesWithThumbnails(games);
    }
  } catch {}
  return await getFallbackGames();
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
      let thumbnailUrl = '/images/roblox-game-default.svg';
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
    const res = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    const data = await res.json();
    if (data && data.universeId) {
      return await getGameDetails(data.universeId);
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
          const key = t.universeId || t.targetId;
          thumbnails[key] = t.thumbnails[0].imageUrl;
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
    thumbnailUrl: thumbnails[g.universeId || g.id] || '/images/roblox-game-default.svg'
  }));
}

async function getFallbackGames() {
  const universeIds = POPULAR_GAMES.map(g => g.universeId).join(',');
  let liveData = {};
  try {
    const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeIds}`);
    const data = await res.json();
    if (data.data) {
      data.data.forEach(g => {
        liveData[g.id] = {
          playing: g.playing || 0,
          visits: g.visits || 0,
          name: g.name
        };
      });
    }
  } catch {}

  const games = POPULAR_GAMES.map(g => ({
    ...g,
    name: (liveData[g.universeId] && liveData[g.universeId].name) || g.name,
    playing: (liveData[g.universeId] && liveData[g.universeId].playing) || 0,
    visits: (liveData[g.universeId] && liveData[g.universeId].visits) || 0
  }));

  return await enrichGamesWithThumbnails(games);
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
  getRobloxFullAvatar,
  getRobloxAvatarBust,
  getRobloxAvatarDetails,
  getPopularGames,
  getFeaturedGames,
  searchGames,
  getGameDetails,
  getPlaceDetails,
  searchUsers,
  getFallbackGames
};
