# Assessment Site - Ready to Deploy

This package contains a static frontend and Node.js backend (Express + SQLite) for quick deployment.

Structure:
- frontend/      -> contains index.html (your site's frontend)
- backend/       -> Node/Express API that stores assessments in SQLite (data/students.db)

IMPORTANT: SQLite is fine for quick demos. For production use a managed Postgres or MySQL database.

## Quick local run (test)
1. Install Node.js (v18+ recommended)
2. In `backend/` run:
   ```
   npm install
   node index.js
   ```
3. Open http://localhost:4000

The frontend is served by the backend so you can test the full flow.

## Deploy options

### Option A — Render (recommended for full app)
1. Push this repo to GitHub.
2. Create a new Web Service on Render: connect your repo, set the `root` to `/backend`, build command `npm install`, start command `node index.js`.
3. Add a `Persistent Disk` or use managed Postgres (recommended). If using Postgres, update backend to connect to Postgres instead of SQLite (see notes below).

### Option B — Vercel / Netlify (frontend) + Railway / Supabase (backend DB)
1. Deploy `frontend/` to Vercel or Netlify (connect GitHub).
2. Deploy backend as a service on Railway or Render.
3. For database, create a Postgres DB on Supabase/Railway and update backend to use Postgres (use `pg` npm package).

## Make site searchable on Google (SEO steps)
1. Add a sitemap.xml (provided) and robots.txt (provided).
2. Add meaningful `<meta name="description">` and `<title>` in your HTML.
3. Deploy the site and verify ownership in Google Search Console (https://search.google.com/search-console).
4. Submit sitemap URL to Search Console.
5. Optionally create backlinks and social shares to help discovery.

## Files included for SEO
- robots.txt
- sitemap.xml

## Notes on production
- Do NOT store secrets in frontend.
- Use environment variables on hosting platform for DB URLs/credentials.
- Use HTTPS.

If you want, I can convert the backend to Postgres and include a Dockerfile or a ready Render/Database configuration. 
