# Codestarters AI Bootcamp

Landing page, login-gated student portal, and a **Redis-backed project showcase** for the Codestarters AI Bootcamp. Deployed on **Vercel**. Sponsored by TrueFoundry.

## What's here

| Path | What it is |
| --- | --- |
| `index.html` | The whole front-end — landing page, curriculum, portal, and the public Showcase. No build step. |
| `api/submit.js` | Serverless function. `POST` a project → saved to Redis. |
| `api/projects.js` | Serverless function. `GET` the published projects (newest 200). |
| `api/_redis.js` | Shared Redis client (reads Vercel/Upstash env vars). |
| `cs-logo.png` | The Codestarters brand mark. |
| `package.json` | One dependency: `@upstash/redis`. Vercel installs it on deploy. |

## How publishing works

1. A student logs into the **portal** (the login is client-side AES-GCM encrypted — see below) and fills the **Publish your project** form.
2. The form `POST`s JSON to `/api/submit`, which validates it and `LPUSH`es a record onto the Redis list `cs:projects` (capped at the newest 500).
3. The public **Showcase** section on the home page calls `/api/projects` and renders every published project — newest first. No email or personal contact info is collected at all.

> Publishing is behind the cohort login to keep spam out; the Showcase itself is public. There's no manual approval step — projects go live immediately. (To add moderation later, give each record an `approved: false` flag in `api/submit.js` and filter on it in `api/projects.js`.)

---

## Setup: connect Redis on Vercel (one time, ~3 minutes)

The site runs without a database — the Showcase just shows an empty state until you connect Redis.

1. **Import the repo into Vercel** → New Project → pick `thepc101/codestartersvibe` → Deploy. (Framework preset: **Other**. No build command, no output dir — it's static + serverless functions.)
2. In the project, go to the **Storage** tab → **Create Database** → choose **Upstash for Redis** (Vercel's managed Redis) → pick a region near your users → **Create**.
3. When prompted, **Connect** the database to this project. Vercel automatically injects the credentials as environment variables (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — the code accepts either pair).
4. **Redeploy** (Deployments → ⋯ → Redeploy) so the functions pick up the new env vars.
5. Log into the portal, publish a test project, and watch it appear in the Showcase. Done.

That's it — no schema, no migrations. Upstash has a free tier that's plenty for a bootcamp.

### Reading / clearing data

In the Upstash console (linked from Vercel's Storage tab) you can run Redis commands directly:
- `LRANGE cs:projects 0 -1` — list every submission.
- `DEL cs:projects` — wipe all submissions (e.g. to reset between cohorts).

---

## Local development

```bash
npm install          # installs @upstash/redis
node serve.cjs       # static server + IN-MEMORY mock of /api on http://localhost:4599
```

`serve.cjs` mocks the API so you can test the publish→showcase flow without a database. It is **gitignored and local-only** — the real endpoints are the Vercel functions.

To exercise the real functions locally instead, use `vercel dev` with a `.env` file containing the Upstash env vars.

## The portal & credentials

The portal's content is AES-GCM encrypted and only decrypts client-side when the right credentials are entered (key derived via PBKDF2 from `username:password`). To change the portal contents or password:

1. Edit `encrypt.mjs` (the portal markup and the `USERNAME`/`PASSWORD` constants).
2. Run `node encrypt.mjs` and paste the JSON output into the `VAULT` object in `index.html`.

> `encrypt.mjs` holds the plaintext password and is **gitignored** — never commit or deploy it. Only `index.html` (with the encrypted blob) ships.

> Client-side encryption gates cohort materials well, but it isn't a substitute for real auth on sensitive data. If you later want server-verified logins, move the gate into an API function.
