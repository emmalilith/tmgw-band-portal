# TMGW Brass Band Portal — Railway Deployment Guide

This app runs on **Node.js + Express + MySQL**. Railway is the recommended host because it supports both in one project.

---

## Prerequisites

- A [Railway account](https://railway.app) (free tier is enough)
- Your GitHub repository connected to Railway

---

## Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) and click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your band portal repository
4. Railway will detect it as a Node.js app automatically — click **"Deploy Now"**

---

## Step 2 — Add a MySQL database

1. Inside your Railway project, click **"New Service"** → **"Database"** → **"MySQL"**
2. Wait ~30 seconds for it to provision
3. Click on the MySQL service → go to the **"Variables"** tab
4. Copy the value of **`MYSQL_URL`** — you will need it in the next step

---

## Step 3 — Set environment variables

Click on your **app service** (not the MySQL service) → go to **"Variables"** tab → add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Paste the `MYSQL_URL` from Step 2 |
| `JWT_SECRET` | Any long random string, e.g. `tmgw-band-secret-2025-xK9mP3qR` |
| `NODE_ENV` | `production` |

> ⚠️ Do **not** add `VITE_APP_ID`, `OAUTH_SERVER_URL`, or other Manus-specific variables — they are no longer needed.

---

## Step 4 — Set build & start commands

In your app service → **"Settings"** tab:

| Setting | Value |
|---|---|
| **Build Command** | `pnpm install && pnpm build` |
| **Start Command** | `node dist/index.js` |

---

## Step 5 — Generate a public URL

1. In your app service → **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Railway gives you a free URL like `band-portal-production.up.railway.app`

---

## Step 6 — Run database migrations

After the first deploy, the database tables need to be created.

Option A (easiest): In Railway, open your app service → **"Shell"** tab → run:
```bash
pnpm drizzle-kit migrate
```

Option B: Connect to the MySQL service directly using the connection string from Step 2 and run the SQL files in `drizzle/` in order (0000, 0001, 0002).

---

## Step 7 — Set up the first admin user

1. Open your deployed site and go to `/login`
2. Click **"新規登録"** (Register) and create the first account
3. **The first registered user automatically becomes admin (顧問)**
4. From the admin panel, you can promote other users to `section_leader` or keep them as `member`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| White page / 500 error | Check Railway logs → likely missing `DATABASE_URL` |
| Login fails | Check `JWT_SECRET` is set |
| Database tables missing | Run migrations (Step 6) |
| Build fails | Make sure `pnpm install && pnpm build` is the build command |

---

## Local development

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env

# Start dev server
pnpm dev
```

The app runs at `http://localhost:3000`.
