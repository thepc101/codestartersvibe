# Codestarters AI Bootcamp

Landing page, **account system**, and a **Redis-backed project showcase** for the Codestarters AI Bootcamp. Deployed on **Vercel**. Sponsored by TrueFoundry.

## What's here

| Path | What it is |
| --- | --- |
| `index.html` | The whole front-end — landing page, account portal, and the public Showcase. No build step. |
| `api/signup.js` | Create an account. **The first account ever created becomes the owner/admin.** |
| `api/login.js` | Log in → returns a session token. |
| `api/me.js` | Returns the current account for a session token. |
| `api/logout.js` | Ends a session. |
| `api/submit.js` | Publish a project (**requires a logged-in account**). |
| `api/projects.js` | Public showcase feed (newest 200). |
| `api/admin.js` | **Owner only.** Every account + every submission. |
| `api/health.js` | Connectivity check — `/api/health` returns whether Redis is wired up. |
| `api/_redis.js`, `api/_auth.js` | Shared Redis client + auth helpers (scrypt password hashing, session tokens). |
| `cs-logo.png` | The Codestarters brand mark. |
| `package.json` | One dependency: `@upstash/redis`. Vercel installs it on deploy. |

## How it works

1. Anyone can **create an account** (username + password) in the portal. Passwords are hashed with scrypt; sessions are random tokens stored in Redis and kept in the browser's `localStorage`.
2. The **first account created is the owner/admin** (claimed atomically). The owner sees an **Owner dashboard** with every account and every submission.
3. Logged-in users **publish projects** → saved to the Redis list `cs:projects`. The author is the account username (no email is ever collected).
4. The public **Showcase** on the home page renders every published project, newest first.

### Redis keys

| Key | Type | Purpose |
| --- | --- | --- |
| `meta:owner` | string | First account's id (set once, atomically). |
| `user:<id>` | json | Account record (username, scrypt hash + salt, role, createdAt). |
| `user:byname:<lower>` | string | Username → id (uniqueness + login lookup). |
| `users:all` | list | All account ids. |
| `sess:<token>` | string (TTL 30d) | Session token → account id. |
| `cs:projects` | list | Published projects (newest first, capped at 500). |

---

## Setup: connect Upstash Redis (one time, ~5 minutes)

Until Redis is connected, accounts and publishing return "Database not configured" and the Showcase shows an empty state. Visit **`/api/health`** any time to check the connection.

### A. Create the database at Upstash
1. Go to [console.upstash.com](https://console.upstash.com) → **Create Database** → type **Redis**. Pick a region near your users → **Create**.
2. On the database page, open the **REST API** section. Copy these two values:
   - **`UPSTASH_REDIS_REST_URL`** — the `https://…upstash.io` URL
   - **`UPSTASH_REDIS_REST_TOKEN`** — the REST token
   > Use the **REST** URL/token, **not** the `redis://` connection string — this code talks to Upstash over HTTPS.

### B. Add the credentials to Vercel
3. Import the repo into Vercel (**Add New → Project** → `thepc101/codestartersvibe`). Framework preset: **Other** (no build command — static files + serverless functions).
4. Project → **Settings → Environment Variables**. Add both:
   | Name | Value |
   | --- | --- |
   | `UPSTASH_REDIS_REST_URL` | the `https://…upstash.io` URL |
   | `UPSTASH_REDIS_REST_TOKEN` | the REST token |
   Apply to **Production, Preview, and Development**.
5. **Redeploy** (Deployments → ⋯ → Redeploy) so the functions pick up the vars.
6. Open **`https://your-site.vercel.app/api/health`** → you want `{ "ok": true, "redis": "connected" }`.
7. Go to the portal and **create your account first** — that one becomes the owner/admin. Done.

> Already created the Upstash DB via Vercel's **Storage** tab instead? That auto-injects the same vars (sometimes named `KV_REST_API_*`) — the code accepts both, so just redeploy and skip to step 6.

No schema, no migrations. Upstash's free tier is plenty for a bootcamp.

### Inspecting / resetting data

In the Upstash console (linked from Vercel's Storage tab):
- `LRANGE cs:projects 0 -1` — every submission.
- `LRANGE users:all 0 -1` then `GET user:<id>` — accounts.
- `FLUSHDB` — wipe everything (accounts + projects) to start a fresh cohort. The next account created becomes the new owner.

---

## Local development

```bash
npm install          # installs @upstash/redis
node serve.cjs       # static server + IN-MEMORY mock of the whole API on http://localhost:4599
```

`serve.cjs` mocks accounts, sessions, and the showcase in memory so you can test the full flow (signup → owner → publish → showcase) without a database. It is **gitignored and local-only**. To run against real Redis locally, use `vercel dev` with a `.env` holding the Upstash env vars.

## Notes

- **Make your account first.** Whoever signs up first is the permanent owner. Do it immediately after the first deploy.
- Sessions last 30 days, then users log in again. Logging out deletes the session server-side.
- This is username + password auth — fine for a bootcamp. There's no email/password reset; if someone forgets a password, delete their `user:*` keys in Upstash and have them sign up again.
