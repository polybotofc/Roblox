# Roblox Nostalgia 2021

A community platform with a design faithful to the Roblox 2021 era. Built with Node.js, Express, EJS, and SQLite.

## Features

- **Auth**: Register, login, logout with bcrypt hashing, sessions, CSRF protection, rate limiting
- **Roblox Avatar System**: Random Roblox avatar assigned on registration via Roblox API
- **Homepage**: Featured games, popular games, news, community stats
- **Games**: Browse and search games from the Roblox API, game detail pages, Play button (`roblox://` protocol)
- **User Profiles**: Avatar, bio, friends, join date, favorite game
- **Friend System**: Send/accept/decline requests, remove friends
- **Messages**: Inbox, sent, compose, delete
- **Forum**: Categories, threads, replies, quotes, delete own posts
- **News**: Announcements, events, updates, maintenance (admin-created)
- **Search**: Users, games, forum threads
- **Settings**: Password, email, bio, privacy settings
- **Admin Panel**: Ban/unban users, manage roles, delete threads/posts, view stats
- **Responsive**: Desktop, tablet, mobile

## Setup

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`.

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript, EJS
- **Database**: SQLite (via better-sqlite3)
- **Security**: bcrypt, express-session, csurf, express-rate-limit, express-validator
