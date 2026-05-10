import { and, count, countDistinct, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { events } from '@/db/schema';

export const RANGES = {
  '24h': { hours: 24, bucket: 'hour' as const },
  '7d': { hours: 7 * 24, bucket: 'day' as const },
  '30d': { hours: 30 * 24, bucket: 'day' as const },
  '90d': { hours: 90 * 24, bucket: 'day' as const },
};

export type Range = keyof typeof RANGES;
export type Bucket = 'hour' | 'day';

export const RANGE_KEYS: Range[] = ['24h', '7d', '30d', '90d'];

export interface BarRow {
  label: string;
  value: number;
}

export interface SeriesPoint {
  bucket: string;
  pageviews: number;
  uniques: number;
}

export interface RangeData {
  range: Range;
  bucket: Bucket;
  totals: { pageviews: number; uniques: number };
  topPaths: BarRow[];
  topReferrers: BarRow[];
  topBrowsers: BarRow[];
  topCountries: BarRow[];
  topDevices: BarRow[];
  series: SeriesPoint[];
}

export type AllRanges = Record<Range, RangeData>;

const TZ_RE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+){0,2}$|^UTC$/;

export function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return 'UTC';
  return TZ_RE.test(tz) ? tz : 'UTC';
}

export async function loadRange(
  siteId: string,
  range: Range,
  timezone: string = 'UTC',
): Promise<RangeData> {
  const { hours, bucket } = RANGES[range];
  const tz = safeTimezone(timezone);
  const since = new Date(Date.now() - hours * 3_600_000);
  const where = and(eq(events.siteId, siteId), gte(events.ts, since));

  const seriesQuery =
    bucket === 'hour'
      ? db
          .select({
            bucket: sql<string>`to_char(date_trunc('hour', ${events.ts} AT TIME ZONE ${tz}), 'YYYY-MM-DD HH24:00')`,
            pageviews: count(events.id),
            uniques: countDistinct(events.visitorHash),
          })
          .from(events)
          .where(where)
          .groupBy(sql`date_trunc('hour', ${events.ts} AT TIME ZONE ${tz})`)
          .orderBy(
            sql`date_trunc('hour', ${events.ts} AT TIME ZONE ${tz}) ASC`,
          )
      : db
          .select({
            bucket: sql<string>`to_char(date_trunc('day', ${events.ts} AT TIME ZONE ${tz}), 'YYYY-MM-DD')`,
            pageviews: count(events.id),
            uniques: countDistinct(events.visitorHash),
          })
          .from(events)
          .where(where)
          .groupBy(sql`date_trunc('day', ${events.ts} AT TIME ZONE ${tz})`)
          .orderBy(
            sql`date_trunc('day', ${events.ts} AT TIME ZONE ${tz}) ASC`,
          );

  const [
    totalsRows,
    topPaths,
    topReferrers,
    topBrowsers,
    topCountries,
    topDevices,
    series,
  ] = await Promise.all([
    db
      .select({
        pageviews: count(events.id),
        uniques: countDistinct(events.visitorHash),
      })
      .from(events)
      .where(where),
    db
      .select({ path: events.path, pageviews: count(events.id) })
      .from(events)
      .where(where)
      .groupBy(events.path)
      .orderBy(desc(count(events.id)))
      .limit(10),
    db
      .select({ host: events.referrerHost, pageviews: count(events.id) })
      .from(events)
      .where(where)
      .groupBy(events.referrerHost)
      .orderBy(desc(count(events.id)))
      .limit(10),
    db
      .select({ browser: events.browser, pageviews: count(events.id) })
      .from(events)
      .where(where)
      .groupBy(events.browser)
      .orderBy(desc(count(events.id)))
      .limit(8),
    db
      .select({ country: events.country, pageviews: count(events.id) })
      .from(events)
      .where(where)
      .groupBy(events.country)
      .orderBy(desc(count(events.id)))
      .limit(10),
    db
      .select({ device: events.device, pageviews: count(events.id) })
      .from(events)
      .where(where)
      .groupBy(events.device)
      .orderBy(desc(count(events.id))),
    seriesQuery,
  ]);

  return {
    range,
    bucket,
    totals: {
      pageviews: totalsRows[0]?.pageviews ?? 0,
      uniques: totalsRows[0]?.uniques ?? 0,
    },
    topPaths: topPaths.map((r) => ({ label: r.path, value: r.pageviews })),
    topReferrers: topReferrers.map((r) => ({
      label: r.host ?? 'Direct',
      value: r.pageviews,
    })),
    topBrowsers: topBrowsers.map((r) => ({
      label: r.browser ?? 'Unknown',
      value: r.pageviews,
    })),
    topCountries: topCountries.map((r) => ({
      label: r.country ?? 'Unknown',
      value: r.pageviews,
    })),
    topDevices: topDevices.map((r) => ({
      label: r.device ?? 'Unknown',
      value: r.pageviews,
    })),
    series,
  };
}

export async function loadAllRanges(
  siteId: string,
  timezone: string = 'UTC',
): Promise<AllRanges> {
  const results = await Promise.all(
    RANGE_KEYS.map((r) => loadRange(siteId, r, timezone)),
  );
  return Object.fromEntries(
    RANGE_KEYS.map((r, i) => [r, results[i]]),
  ) as AllRanges;
}
