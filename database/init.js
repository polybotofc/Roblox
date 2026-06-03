const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'roblox_nostalgia.sqlite');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user','moderator','administrator','owner')),
      is_banned INTEGER DEFAULT 0,
      ban_reason TEXT,
      roblox_user_id INTEGER,
      roblox_username TEXT,
      roblox_avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_online DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY,
      bio TEXT DEFAULT '',
      favorite_game TEXT DEFAULT '',
      privacy_profile TEXT DEFAULT 'everyone' CHECK(privacy_profile IN ('everyone','friends','nobody')),
      privacy_online TEXT DEFAULT 'everyone' CHECK(privacy_online IN ('everyone','friends','nobody')),
      privacy_friends TEXT DEFAULT 'everyone' CHECK(privacy_friends IN ('everyone','friends','nobody')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, friend_id)
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      deleted_by_sender INTEGER DEFAULT 0,
      deleted_by_receiver INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS forum_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      quote_post_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS games_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER UNIQUE NOT NULL,
      universe_id INTEGER,
      name TEXT,
      description TEXT,
      creator_name TEXT,
      creator_id INTEGER,
      playing INTEGER DEFAULT 0,
      visits INTEGER DEFAULT 0,
      favorites INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      dislikes INTEGER DEFAULT 0,
      thumbnail_url TEXT,
      created_date TEXT,
      updated_date TEXT,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT DEFAULT 'announcement' CHECK(category IN ('announcement','event','update','maintenance')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id INTEGER PRIMARY KEY,
      theme TEXT DEFAULT 'light',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const catCount = db.prepare('SELECT COUNT(*) as cnt FROM forum_categories').get();
  if (catCount.cnt === 0) {
    const insertCat = db.prepare('INSERT INTO forum_categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)');
    insertCat.run('General Discussion', 'general-discussion', 'Talk about anything related to Roblox!', 1);
    insertCat.run('Help', 'help', 'Need help? Ask the community here.', 2);
    insertCat.run('Suggestions', 'suggestions', 'Have an idea? Share it with us!', 3);
    insertCat.run('Off Topic', 'off-topic', 'Talk about anything else here.', 4);
  }
}

module.exports = { getDb, initDatabase };
