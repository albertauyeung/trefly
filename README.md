# Trefly

Minimal, privacy-friendly web analytics for **personal projects**. Cookie-free, GDPR-compliant by design, no consent banner needed for the tracking itself.

This is a single-user tool: there's one dashboard protected by a password. The original PLAN.md still describes the longer-term multi-tenant + billing direction; v1 deliberately skips all of that.

## Stack

- Next.js 16 (App Router) + React 19, deployed on Vercel
- Neon Postgres (via Vercel Marketplace) + Drizzle ORM
- HTTP Basic Auth on `/dashboard` (single password env var)
- `ua-parser-js` + Vercel `x-vercel-ip-country` for browser/OS/country
- Public tracker served from `/t.js`

## Local development

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL, TREFLY_ADMIN_PASSWORD, TREFLY_HASH_SECRET
openssl rand -hex 32   # for TREFLY_HASH_SECRET
npm run db:push        # creates the sites + events tables
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/dashboard` and prompted for the password.

## Deploying to Vercel

1. Push to GitHub.
2. Import into Vercel.
3. Provision Neon Postgres via the Marketplace — sets `DATABASE_URL` (or its `TREFLY_`-prefixed variant; Drizzle reads it directly so the prefix is fine here as long as you copy the value into `DATABASE_URL`).
4. Add `TREFLY_ADMIN_PASSWORD` and `TREFLY_HASH_SECRET` in **Settings → Environment Variables**.
5. Deploy.
6. Run the schema once against the production DB: `DATABASE_URL=… npm run db:push`.

## Adding Trefly to a site

1. Visit `https://<your-trefly-domain>/dashboard` (you'll get a Basic Auth prompt — username is ignored).
2. Add a site (domain + optional name).
3. Copy the snippet on the site's stats page:
   ```html
   <script defer data-site="abc123" src="https://<your-trefly-domain>/t.js"></script>
   ```
4. Paste it into the `<head>` of the target site (e.g. `app/[locale]/layout.tsx` for scoil-scout).
5. Deploy the target site, visit a page, refresh the Trefly dashboard — pageviews will appear within seconds.

The tracker skips local addresses (`localhost`, `127.0.0.1`, RFC1918) by default. Pass `data-allow-localhost` to test from `localhost`.

## Privacy notes

For each tracked event, Trefly stores:

- A 16-character daily-rotating hash derived from `site_id + IP + User-Agent` — non-linkable across days and across sites.
- The visited path (query string and fragment stripped).
- The referrer hostname only (no full URL).
- Country (from the `x-vercel-ip-country` header).
- Browser, OS, and device family.

Trefly never stores raw IPs, raw user-agent strings, full referrer URLs, or any personally identifying data.

The site embedding the tracker is still responsible for showing a privacy notice — see `PLAN.md` for the full GDPR posture.
