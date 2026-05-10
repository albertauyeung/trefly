# Trefly

Minimal, privacy-friendly web analytics. Cookie-free, GDPR-compliant by design, no consent banner needed for the tracking itself.

See [`PLAN.md`](./PLAN.md) for the full architecture, data model, and roadmap.

## Stack

- Next.js 16 (App Router) + React 19, deployed on Vercel
- Neon Postgres (via Vercel Marketplace) + Drizzle ORM
- Clerk for sign-up / sign-in
- `ua-parser-js` + Vercel `x-vercel-ip-country` header for browser/OS/country
- Public tracker served from `/t.js`, ~1 KB

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Provision external services

Both have free tiers and can be provisioned through the Vercel Marketplace once the project is linked, or directly:

- **Neon Postgres** → grab the connection string (`postgresql://…?sslmode=require`).
- **Clerk** → create an application, copy the publishable + secret keys.

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Generate a strong hash secret:

```bash
openssl rand -hex 32
```

Required:

| Variable | What |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Signing secret from a Clerk webhook endpoint (set up after deploying — see below) |
| `TREFLY_HASH_SECRET` | Random 32 bytes used for daily visitor-hash salt rotation |

### 4. Push the schema

```bash
npm run db:push
```

This applies `db/schema.ts` to your Neon database (no separate migrations file in v1).

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add the env vars above in **Project → Settings → Environment Variables**, or provision Neon + Clerk through the Marketplace which sets most of them automatically.
4. After the first deploy: in the Clerk dashboard create a webhook endpoint pointing to `https://<your-domain>/api/webhooks/clerk` subscribed to `user.created`, `user.updated`, `user.deleted`. Copy the signing secret into `CLERK_WEBHOOK_SECRET` and redeploy.
5. Run the schema push against the production DB once: `DATABASE_URL=… npm run db:push`.

## Adding Trefly to scoil-scout (or any site)

1. Sign in at `https://<your-trefly-domain>/dashboard`.
2. Click **Add a site**, enter the domain (e.g. `scoilscout.ie`).
3. Copy the snippet shown:
   ```html
   <script defer data-site="abc123" src="https://<your-trefly-domain>/t.js"></script>
   ```
4. In `scoil-scout`, paste it into `app/[locale]/layout.tsx` inside the `<head>` block (or use Next's `<Script strategy="afterInteractive">` if you prefer). Deploy.
5. Visit a page — the dashboard should show pageviews within seconds.

The tracker skips local addresses (`localhost`, `127.0.0.1`, RFC1918) by default. Pass `data-allow-localhost` if you want to test from `localhost`.

## Privacy notes

For each tracked event, Trefly stores:

- A 16-character daily-rotating hash derived from `site_id + IP + User-Agent` — non-linkable across days and across sites.
- The visited path (query string and fragment stripped).
- The referrer **hostname only** (no full URL).
- Country (from the `x-vercel-ip-country` header, set by Vercel's edge).
- Browser, OS, and device family (from a small UA parser).

Trefly never stores raw IPs, raw user-agent strings, full referrer URLs, or any personally identifying data.

The site embedding the tracker is still responsible for displaying a privacy notice listing Trefly as an audience-measurement provider — see the relevant section in `PLAN.md` for drop-in copy.
