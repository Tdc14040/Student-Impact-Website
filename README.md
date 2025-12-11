# Student Impact Website - Full Project (Render-ready)

This package contains a frontend and Node.js backend with SQLite, admin authentication and email OTP password reset flow.
**Placeholders are used for SMTP credentials — set them as environment variables on Render before deploying.**

## Structure
- backend/ - Node.js server (runs from backend)
  - index.js
  - package.json
  - data/ (contains .gitkeep)
- frontend/ - static site
  - index.html (main site)
  - style.css (your CSS should be here if provided)
  - admin-login.html
  - admin.html
  - forgot-password.html
  - verify-otp.html
  - reset-password.html

## Environment variables (set these on Render service -> Environment)
- SMTP_HOST (default: smtp.gmail.com)
- SMTP_PORT (default: 587)
- SMTP_USER (your gmail address)
- SMTP_PASS (your Gmail App Password)
- JWT_SECRET (random secret string)

## Deploy on Render (quick)
1. Create a new Web Service on Render and connect to this repo.
2. Set **Root Directory** to `backend`
3. Build Command: `npm install`
4. Start Command: `node index.js`
5. Add the Environment Variables above in Render dashboard.
6. Deploy. App will be available at https://<your-app>.onrender.com

## Create initial admin (one-time)
Run this (replace with your values):
```
curl -X POST https://<your-app>/api/admin/register -H "Content-Type: application/json" -d '{"username":"admin","email":"youremail@gmail.com","password":"StrongPass123","question":"Your question","answer":"Answer"}'
```

## Admin login and password reset
- Admin login: `/admin-login.html`
- Forgot password: `/forgot-password.html` (enter email)
- Verify OTP: `/verify-otp.html` (enter OTP from email)
- Reset password: `/reset-password.html`

## Notes
- The DB file is stored at `backend/data/students.db`.
- For production-grade persistence, consider Render Persistent Disk or managed Postgres.
- Do NOT store real SMTP credentials in the repo. Use Render environment variables.
