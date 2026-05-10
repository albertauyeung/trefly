# Trefly — Project Plan

A minimal, privacy-preserving, GDPR-compliant web analytics tool for simple web projects. Same category as Plausible, Umami, Fathom, GoatCounter — but personally owned and intentionally minimal.

> **Status (2026-05-10):** the shipped v1 is a **single-user / Basic Auth** simplification of this plan, intended for tracking the author's own projects (scoil-scout, naionra-scout, etc.). The multi-tenant model below — sign-up, Clerk, Stripe billing — remains the longer-term direction but is not implemented. See `README.md` for what's actually deployed.

## 1. Vision & scope

**In scope (v1):**
- Multi-tenant: users sign up, register sites (domains), embed a tracker snippet, and view a per-site dashboard.
- Metrics: pageviews, unique visitors, top pages, referrers, browsers, OS, device type, country.
- GDPR-compliant by design — no consent banner needed when using Trefly alone (privacy notice still required on the tracked site).
- Simple email-link sign-up (no passwords).
- Free tier + one paid tier via Stripe Checkout.

**Explicitly out of scope (for now):**
- Custom events / goals / funnels (can come later).
- Real-time live view.
- Heatmaps, session recording, A/B testing.
- City-level geolocation (country is sufficient and avoids GDPR risk).
- Cross-site / cross-device user identification (would break the GDPR-no-banner premise).

## 2. Architecture overview

```
┌────────────────┐      ┌────────────────────────┐      ┌──────────────┐
│  Tracked site  │      │  Trefly app (Next.js)  │      │   Postgres   │
│ (any domain)   │ ───► │                        │ ───► │  (Neon)      │
│  <script>      │      │  /api/event  collector │      │              │
│   t.js         │      │  /app/...    dashboard │      │   events     │
│  </script>     │      │  /api/auth/* auth      │      │   sites      │
└────────────────┘      │  /api/billing/*        │      │   users      │
                        └────────────────────────┘      │   (rollups)  │
                                  │                     └──────────────┘
                                  │ ┌────────────┐         ┌──────────┐
                                  └►│   Stripe   │         │  Resend  │
                                    │ Checkout + │         │ (magic-  │
                                    │  Portal    │         │  link)   │
                                    └────────────┘         └──────────┘
```

## 3. Tech stack & rationale

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Matches existing personal-project stack (scoil-scout, naionra-scout). Server actions + edge-friendly API routes fit the workload. |
| Hosting | **Vercel** | Same. Free hobby tier is enough until paid users. |
| Database | **Neon Postgres** (Vercel Marketplace) | Single store for events + metadata. Auto-scaling, branching for staging. Avoids the operational cost of a second Redis store. |
| Auth | **Clerk** (Vercel Marketplace) | Drop-in sign-in / sign-up UI, session management, and a hosted user store. Saves the wiring time of Auth.js + Resend; Clerk's free tier covers early users, paid tier kicks in at scale. |
| Email (transactional) | **Resend** | Account / billing / weekly-summary emails. Clerk handles sign-in emails itself. |
| Billing | **Stripe Checkout + Customer Portal** | Industry standard. Webhooks → update `users.plan`. |
| Geolocation | **Vercel `request.geo`** (free, edge-resolved) | Country only. Zero third-party network calls. |
| UA parsing | **`ua-parser-js`** | Browser/OS/device, parsed server-side at write time. Raw UA is **not** stored. |
| Charts | **Recharts** or **Tremor** | Minimal dashboard charts. Pick during phase 3. |
| Styling | **Tailwind + shadcn/ui** | Matches user's other projects. |
| ORM | **Drizzle** | Lightweight, SQL-first. Easier than Prisma for analytics-style queries. |

**One deliberate choice:** Postgres-only, no Redis. The scoil-scout prototype used Redis because it was a single-tenant in-app tracker; Trefly's multi-tenant model needs proper relational data anyway. Pre-aggregated daily rollup tables give us Plausible-class query performance up to millions of events without a second store.

## 4. GDPR / no-banner approach

Trefly meets the conditions under which CNIL (and most EU DPAs) exempt audience-measurement tools from prior consent:

| Requirement | How Trefly meets it |
|---|---|
| No cookies | Tracker uses no cookies, no `localStorage`, no `IndexedDB`. |
| No raw IP storage | IP is hashed with a daily-rotating salt; only the 16-char hash is stored. |
| No cross-site tracking | Visitor hash includes `site_id`, so the same browser on two sites yields different hashes. Hashes are non-linkable. |
| No cross-day tracking | Salt rotates every UTC day. Same visitor on day 1 vs day 2 → different hashes. |
| No fingerprinting | Only coarse signals stored (browser family, OS family, device class, country). No screen size, no canvas, no font enumeration. |
| Anonymous metrics only | Country only — no city, no region, no GPS. |
| No data sharing | Customer data is per-site, not pooled or sold. |
| Self-service deletion | Customer can delete a site → cascade-deletes all events. |

**Still required of the tracked site:** a privacy-notice section mentioning Trefly. We'll provide drop-in copy, matching the existing `reference_umami_gdpr_position.md` posture.

**Visitor hash formula** (carried over from scoil-scout, extended with `site_id`):

```
daily_salt = SHA256(GLOBAL_SECRET : YYYY-MM-DD)
visitor_hash = SHA256(daily_salt : site_id : ip : user_agent).slice(0, 16)
```

`GLOBAL_SECRET` is rotated annually. After rotation, all old hashes become permanently non-correlatable.

## 5. Data model (Drizzle / Postgres)

```sql
-- Account & billing  (auth lives in Clerk; this table is the local mirror + billing state)
users (
  id              uuid pk,
  clerk_user_id   text unique not null,        -- foreign key to Clerk
  email           text not null,               -- denormalised from Clerk for queries
  created_at      timestamptz default now(),
  plan            text default 'free',         -- 'free' | 'pro'
  stripe_customer_id text,
  stripe_subscription_id text
)

-- Sites a user has registered
sites (
  id           uuid pk,
  user_id      uuid references users(id) on delete cascade,
  domain       text not null,                  -- e.g. 'example.com'
  name         text,
  tracking_id  text unique not null,           -- short slug embedded in tracker snippet
  created_at   timestamptz default now()
)

-- Raw events (one row per pageview)
events (
  id            bigserial pk,
  site_id       uuid references sites(id) on delete cascade,
  ts            timestamptz default now(),     -- partition key candidate
  path          text not null,                 -- normalised, ≤256 chars
  referrer_host text,                          -- hostname only, no full URL
  country       text,                          -- ISO-3166 alpha-2
  browser       text,                          -- 'Chrome', 'Firefox', ...
  os            text,                          -- 'macOS', 'Windows', ...
  device        text,                          -- 'desktop' | 'mobile' | 'tablet'
  visitor_hash  text not null                  -- 16-char hex
)
create index events_site_ts on events(site_id, ts desc);
create index events_site_day_visitor on events(site_id, date_trunc('day', ts), visitor_hash);

-- Daily rollup, populated by a cron — for fast dashboard queries
daily_stats (
  site_id          uuid,
  day              date,
  path             text,
  country          text,
  browser          text,
  os               text,
  device           text,
  pageviews        integer not null,
  unique_visitors  integer not null,
  primary key (site_id, day, path, country, browser, os, device)
)
```

Retention: events table keeps 90 days raw; rollups kept indefinitely (free) or 12 months (free) / forever (pro).

## 6. Tracker (`t.js`)

Snippet that customers paste into their site's `<head>`:

```html
<script defer data-site="abc123" src="https://trefly.io/t.js"></script>
```

`t.js` (target ~1 KB minified):
- Reads `data-site` from its own `<script>` tag.
- On load: POSTs `{ site, path, referrer }` to `/api/event` with `keepalive: true`.
- Hooks `history.pushState` / `popstate` for SPA navigation.
- Skips if `localhost`, `Do Not Track`, or `navigator.webdriver` (best-effort bot avoidance).
- No retries, no queueing — fire-and-forget.

`/api/event` server-side:
- Bot filter (allowlist + blocklist UA patterns from scoil-scout middleware).
- Verify `site` exists; check user's plan quota (drop with 204 if over).
- Resolve country from `request.geo`.
- Parse UA → browser/os/device.
- Compute `visitor_hash`.
- Insert row.
- Return 204.

## 7. Sign-up & billing flow

**Sign-up (Clerk):**
1. User clicks "Sign in" → Clerk's hosted sign-in component (email code, magic link, or social — configurable in the Clerk dashboard).
2. Clerk sets its session cookie and redirects to `/dashboard`.
3. A Clerk webhook (`user.created`) fires → server creates a matching `users` row keyed by Clerk user ID, plan = `free`, no Stripe customer yet.
4. Server-side auth checks use Clerk's `auth()` helper from `@clerk/nextjs/server`; the local `users.id` is just a join key for `sites` and billing.

**Adding a site:**
1. From dashboard, click "Add site", enter domain.
2. Server generates `tracking_id`, inserts `sites` row.
3. UI shows the embed snippet with the user's `tracking_id` baked in.

**Upgrade to paid:**
1. User clicks "Upgrade" → server creates Stripe Checkout session.
2. After successful checkout, Stripe webhook → set `users.plan = 'pro'`, store `stripe_customer_id`, `stripe_subscription_id`.
3. Customer Portal link in account settings for managing subscription.

**Tentative tiers:**

| Tier | Price | Sites | Pageviews/mo | Retention |
|---|---|---|---|---|
| Free | €0 | 1 | 10,000 | 90 days |
| Pro | €5/mo | 10 | 1,000,000 | 12 months |

(Tune later based on real usage.)

## 8. Phased roadmap

Each phase ends with something working and demoable. Stop and re-evaluate between phases.

### Phase 0 — Foundation (1 evening)
- `pnpm create next-app` with TS, Tailwind, App Router.
- Add Drizzle, configure for Neon (provision via Vercel Marketplace).
- Land initial schema: `users`, `sites`, `events`.
- Scaffold `/api/event` with hardcoded fake `site_id`.
- Deploy to Vercel; smoke-test by curling the endpoint.

### Phase 1 — Tracker MVP (1–2 evenings)
- Build `t.js` (TypeScript → minified bundle served from `/t.js`).
- Wire `/api/event`: bot filter, UA parse, geo resolve, visitor hash, insert.
- Self-host: embed Trefly's own tracker on a test page → confirm rows land.
- Single hardcoded admin dashboard (no auth yet) showing pageviews/uniques/top paths for one site.

### Phase 2 — Auth + multi-tenant dashboard (2–3 evenings)
- Provision Clerk via Vercel Marketplace; configure sign-in methods.
- Add `<ClerkProvider>` and middleware route-protection for `/dashboard/**`.
- Webhook `/api/webhooks/clerk` → upsert `users` on `user.created` / `user.updated`.
- `/dashboard` — list of user's sites.
- `/sites/[id]` — per-site stats: pageviews, uniques, top paths, top referrers, browsers, countries — last 7/30/90 days.
- "Add site" flow with tracking-id generation and snippet copy.

### Phase 3 — Daily rollups + performance (1 evening)
- Add `daily_stats` table.
- Vercel cron (`/api/cron/rollup`) runs nightly to aggregate previous day.
- Switch dashboard to read from rollups for older windows; live-query `events` only for "today".

### Phase 4 — Stripe billing (1–2 evenings)
- Stripe products + prices (live + test mode).
- Checkout endpoint and Portal link.
- Webhook handler: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → update `users.plan`.
- Quota enforcement in `/api/event` (cheap cached lookup of user's monthly count).

### Phase 5 — Polish & launch readiness
- Marketing landing page on `/` (what, why, pricing).
- `/privacy` and `/dpa` pages with drop-in privacy-notice copy for customers.
- Site-level "Delete site" button (cascade-delete events).
- Account-level "Delete account" (GDPR right-to-erasure).
- README, license, GitHub repo polish.

### Future / maybe-never
- Custom events.
- Email weekly summaries.
- Public dashboards (read-only sharing).
- Self-hosted release for sale.

## 9. Open questions to resolve before phase 0

1. **Domain:** `trefly.io`? `trefly.dev`? `trefly.app`? Influences DMARC/SPF setup for transactional email.
2. **Pricing currency:** EUR (Ireland-based, EU customers) — to confirm.

(Auth = Clerk and DB = Neon are locked in.)

---

*Drafted 2026-05-10. Carries forward the daily-salt visitor-hash pattern, bot-filter UA lists, path normalisation, and atomic-write approach from the prior scoil-scout in-app analytics prototype (scoil-scout commits `779cf8f` → `c1aab5c`).*
