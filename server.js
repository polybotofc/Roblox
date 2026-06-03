const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

initDatabase();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, 'database') }),
  secret: process.env.SESSION_SECRET || 'roblox-nostalgia-2021-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

const csrfProtection = csrf();

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');
const profileRoutes = require('./routes/profile');
const gamesRoutes = require('./routes/games');
const friendsRoutes = require('./routes/friends');
const messagesRoutes = require('./routes/messages');
const forumRoutes = require('./routes/forum');
const newsRoutes = require('./routes/news');
const searchRoutes = require('./routes/search');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');
const avatarRoutes = require('./routes/avatar');

app.use('/', homeRoutes);
app.use('/auth', authRoutes(csrfProtection, loginLimiter));
app.use('/profile', profileRoutes(csrfProtection));
app.use('/games', gamesRoutes);
app.use('/friends', friendsRoutes(csrfProtection));
app.use('/messages', messagesRoutes(csrfProtection));
app.use('/forum', forumRoutes(csrfProtection));
app.use('/news', newsRoutes(csrfProtection));
app.use('/search', searchRoutes);
app.use('/settings', settingsRoutes(csrfProtection));
app.use('/admin', adminRoutes(csrfProtection));
app.use('/avatar', avatarRoutes(csrfProtection));

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', { title: 'Error', message: 'Invalid CSRF token. Please try again.' });
  }
  console.error(err.stack);
  res.status(500).render('error', { title: 'Error', message: 'Something went wrong!' });
});

app.use((req, res) => {
  res.status(404).render('error', { title: '404 Not Found', message: 'Page not found.' });
});

app.listen(PORT, () => {
  console.log(`Roblox Nostalgia 2021 running on http://localhost:${PORT}`);
});
