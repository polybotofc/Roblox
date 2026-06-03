---
name: testing-roblox-2021
description: End-to-end testing for the Roblox 2021 Nostalgia Community Platform. Use when verifying UI, auth, forum, games, or settings features.
---

# Testing the Roblox 2021 Nostalgia Platform

## Prerequisites

1. Run `npm install` in the repo root
2. Start the server: `npm start` (runs on `http://localhost:3000`)
3. Verify the server is up: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000` should return `200`

## Test Account

- Register a new user via `http://localhost:3000/auth/register`
- Use any username/email/password (e.g. `TestUser2021` / `test@test.com` / `password123`)
- The system assigns a random Roblox avatar from the Roblox API on registration — this avatar is permanent
- If the test user already exists from a prior session, log in instead

## Devin Secrets Needed

None — the app runs fully locally with SQLite and the Roblox API is public.

## Key Test Flows

### 1. Homepage Design Verification
- Navigate to `http://localhost:3000`
- Verify navbar background is `#393b3d` (dark gray, Roblox 2021 style)
- Check for Featured and Popular game sections
- Verify Community Stats sidebar (Members count, Forum Threads count)
- Verify footer with About/Help/Community links

### 2. User Registration & Avatar
- Register at `/auth/register`
- After registration, verify Roblox avatar appears in navbar and sidebar
- Avatar should load from `tr.rbxcdn.com` domain
- Check that the Roblox username is displayed (e.g. `@robloxUsername`)

### 3. Games Browser & Play Button
- Navigate to `/games` — verify Popular and Featured tabs
- Click any game card to open detail page
- **Critical:** Verify the Play button has `href="roblox://placeID=XXXXX"` format
- Check game stats: Active Players, Visits, Favorites, Likes
- Check Game Info: Creator, Max Players, Created/Updated dates
- Note: Game thumbnails might use placeholder images if the Roblox thumbnail API is slow; the detail page should load live thumbnails from `t5.rbxcdn.com`

### 4. Forum Thread & Reply (CSRF-sensitive)
- Navigate to `/forum` — verify 4 categories (General Discussion, Help, Suggestions, Off Topic)
- Click into a category, create a new thread or open an existing one
- **Critical:** Submit a reply via the reply form
- If you get "Invalid CSRF token" error, this means CSRF tokens are not being passed correctly to the form. Check:
  - The GET route for `/forum/thread/:id` has `csrfProtection` middleware
  - The route passes `csrfToken: req.csrfToken()` (not empty string `''`)
  - The reply form template has `<input type="hidden" name="_csrf" value="<%= csrfToken %>">`
- This same CSRF pattern applies to ALL POST forms across the app (friends, messages, admin, profile)

### 5. Profile Page
- Navigate to `/profile/USERNAME`
- Verify: avatar, username, Roblox username, join date, last online, friend count

### 6. Settings — Bio Update
- Navigate to `/settings`
- Type text in the Bio textarea and click "Update Bio"
- Verify green success banner appears
- Verify bio text persists after page reload

### 7. Search
- Use the navbar search bar or navigate to `/search?q=QUERY`
- Verify results show users with avatars, or forum threads, or games
- Search supports filtering by All/Users/Games/Threads

### 8. Logout
- Click the user dropdown button in the top-right navbar area
- Click "Logout"
- Verify: redirected to homepage, navbar shows Login/Sign Up buttons, sidebar shows "Welcome to Roblox!"

## Common Issues

### CSRF Token Errors
The app uses `csurf` middleware. Every form that does a POST must:
1. Have the GET route use `csrfProtection` middleware
2. Pass `csrfToken: req.csrfToken()` to the template
3. Include `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` in the form

Affected routes: forum replies, friend requests, messages, admin actions, profile actions.

### Roblox API Rate Limiting
The Roblox API might occasionally rate-limit or timeout. Game thumbnails may fall back to placeholder images. Game detail pages fetch live data — if the API is down, fallback data from `games_cache` table is used.

### User Dropdown Click Target
The user dropdown button in the navbar might overlap with the messages icon. If clicking the navbar area navigates to `/messages` instead of opening the dropdown, try clicking directly on the username text or use JavaScript: `document.querySelector('.nav-user-btn').click()`

## Database

SQLite database at `database/roblox.db`. Tables: users, profiles, friends, friend_requests, messages, forum_categories, threads, posts, games_cache, news, settings.

To reset: stop the server, delete `database/roblox.db`, restart — the DB is recreated on startup.
