# Fit In Club — Gym Buddy Finder

A web app for one gym's members to log their workout schedule, check in live, and connect with people who train at the same time.

## What it does

- **Sign up** with a shared gym access code (no public signups — gym members only)
- **My Schedule** — set a recurring weekly training schedule (e.g. Mon/Wed/Fri 6–7 AM), and a live "I'm here now" toggle that auto-expires after 2 hours
- **Find Buddies** — see members whose weekly schedule overlaps with yours
- **Live Now** — see who's currently checked in at the gym
- **Requests** — send/accept/decline buddy requests
- **Messages** — once a request is accepted, chat in real time (via WebSockets) with saved message history

Contact info is never shown directly — two people have to send and accept a buddy request before they can message each other.

## Tech stack

- **Backend:** Node.js, Express, SQLite (via `better-sqlite3`), JWT auth, Socket.io for real-time chat
- **Frontend:** React (Vite), React Router, Socket.io client

SQLite was chosen so there's zero database setup — it's a single file on disk. If you outgrow it later, the data model is plain relational SQL, so migrating to PostgreSQL is mostly swapping the driver.

## Project structure

```
gym-buddy-app/
├── server/              # Express API + SQLite + Socket.io
│   ├── src/
│   │   ├── index.js         # app entry point
│   │   ├── db.js            # SQLite schema & connection
│   │   ├── auth.js          # JWT helpers + middleware
│   │   └── routes/
│   │       ├── auth.js      # signup / login / me
│   │       ├── schedule.js  # weekly schedule + live check-in
│   │       ├── buddies.js   # buddy requests
│   │       └── messages.js  # chat (only between accepted buddies)
│   ├── data/                # gym.db (SQLite file) created here on first run
│   ├── .env.example
│   └── package.json
└── client/              # React frontend (Vite)
    ├── src/
    │   ├── pages/            # one file per screen
    │   ├── components/       # AppShell (sidebar nav)
    │   └── lib/               # api.js, AuthContext, SocketContext
    ├── .env.example
    └── package.json
```

## Setup (run this on your own machine — it needs internet access to install packages)

### 1. Backend

```bash
cd server
cp .env.example .env
```

Open `.env` and set:
- `JWT_SECRET` — a long random string used to sign login tokens. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `GYM_SIGNUP_CODE` — the code your gym members will enter when signing up (e.g. print it at the front desk)

Both are required — the server will refuse to start and print an error if either is missing, rather than silently falling back to an insecure default.

Then install and run:

```bash
npm install
npm run dev
```

The API will run on `http://localhost:4000`. On first run it automatically creates `data/gym.db` with all the tables it needs — no manual database setup required.

### 2. Frontend

In a second terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

The app will run on `http://localhost:5173`. Open that in your browser.

### 3. Try it out

1. Go to `http://localhost:5173`, click **Sign up**, and use the gym code you set in `server/.env`.
2. Set a weekly schedule on **My Schedule**.
3. Open an incognito window (or another browser) and sign up as a second user with the same gym code, with an overlapping schedule.
4. From either account, go to **Find Buddies** to see the match, send a request, accept it from the other account, then message each other from **Messages**.

## Notes on the data model

- `users` — one row per member (name, email, hashed password, training type, bio)
- `schedules` — one row per recurring weekly time slot (a user can have many)
- `live_status` — one row per user when checked in, with an expiry timestamp (auto-clears after 2 hours)
- `buddy_requests` — pending/accepted/declined connection requests between two users
- `messages` — chat history, only ever inserted/read between two users with an `accepted` buddy_request

## Things you'll likely want before using this with real members

- **Password reset / email verification** — not included yet. Right now sign-up just needs the gym code + an email/password.
- **Deployment** — this is built to run locally. To put it online you'd deploy the `server` folder (e.g. Render, Railway, Fly.io) and the `client` folder as a static site (e.g. Vercel, Netlify), then point `VITE_API_URL` and `CLIENT_ORIGIN` at the real URLs instead of localhost.
- **Admin tools** — there's currently no way to remove a member or rotate the gym code from the UI; that would mean editing the `.env` file or the database directly.
- **Push notifications** — new messages only show live while the app is open; there's no mobile push notification yet.

Happy to help build out any of those next.
