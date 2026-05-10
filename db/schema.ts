import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigserial,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: text('domain').notNull(),
  name: text('name'),
  trackingId: text('tracking_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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

export type Site = typeof sites.$inferSelect;
export type Event = typeof events.$inferSelect;
