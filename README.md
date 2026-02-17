# RENVOX — Local Dev & Deployment

This workspace contains a minimal RENVOX demo (frontend static files + an Express backend). The backend serves API endpoints and static frontend files so you can host the whole site from one process.

## Requirements
- Node.js 16+ and npm

## Setup & Run (development)
1. Install dependencies:

```bash
npm install
```

2. Start the server (this will serve both API and frontend):

```bash
npm start
```

3. Open the site in your browser:
- http://localhost:5000 (or the port shown in logs)

## Features implemented
- Signup (POST `/api/signup`) — stores user in `data/users.json` with hashed password and issues OTP
- Verify OTP (POST `/api/verify-otp`) — verifies and returns JWT
- Login (POST `/api/login`) — returns JWT and user object
- Current user (GET `/api/me`) — returns user from JWT
- Request college verification (POST `/api/request-verification`) — mock: logs verification link
- Messages (GET/POST `/api/messages`) — simple in-app chat storage in `data/messages.json`
- Static site served from project root

## Notes & Next Steps
- OTPs and verification emails are mocked and printed to the server console for demo.
- This project uses a JSON file store (`data/users.json`, `data/messages.json`) for demo. For production, migrate to a real database (Postgres, MongoDB, etc.).
- Set `JWT_SECRET` environment variable in production for secure token signing.

## File layout (important)
- `server.js` — Express backend
- `data/users.json` — user store (demo)
- `data/messages.json` — chat messages (demo)
- `index.html`, `login.html`, `signup.html`, `otp.html`, `store.html`, `family.html`, `dashboard.html` — frontend pages

If you want, I can now:
- Add a build step and production-ready config
- Wire a real email/OTP provider
- Improve styling and responsiveness across pages
