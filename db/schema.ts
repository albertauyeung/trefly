import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigserial,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  plan: text('plan').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sites = pgTable(
  'sites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
    name: text('name'),
    trackingId: text('tracking_id').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('sites_user_id_idx').on(table.userId)],
);

export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    path: text('path').notNull(),
    referrerHost: text('referrer_host'),
    country: text('country'),
    browser: text('browser'),
    os: text('os'),
    device: text('device'),
    visitorHash: text('visitor_hash').notNull(),
  },
  (table) => [
    index('events_site_ts_idx').on(table.siteId, sql`${table.ts} DESC`),
  ],
);

export type User = typeof users.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type Event = typeof events.$inferSelect;
