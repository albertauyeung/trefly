import { notFound } from 'next/navigation';
import { and, count, countDistinct, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { events, sites } from '@/db/schema';
import { deleteSite } from '../../actions';
import { Snippet } from './snippet';

export const dynamic = 'force-dynamic';

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const;
type Range = keyof typeof RANGE_DAYS;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}

export default async function SitePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { range: rangeRaw } = await searchParams;
  const range: Range =
    rangeRaw === '30d' || rangeRaw === '90d' ? rangeRaw : '7d';

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);
  if (!site) notFound();

  const since = new Date(Date.now() - RANGE_DAYS[range] * 86_400_000);
  const where = and(eq(events.siteId, site.id), gte(events.ts, since));

  const [
    totalsRows,
    topPaths,
    topReferrers,
    topBrowsers,
    topCountries,
    topDevices,
    dailySeries,
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
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${events.ts}), 'YYYY-MM-DD')`,
        pageviews: count(events.id),
        uniques: countDistinct(events.visitorHash),
      })
      .from(events)
      .where(where)
      .groupBy(sql`date_trunc('day', ${events.ts})`)
      .orderBy(sql`date_trunc('day', ${events.ts}) ASC`),
  ]);

  const totals = totalsRows[0];

  return (
    <main className="px-6 py-10 max-w-5xl w-full mx-auto flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline inline-flex items-center gap-1.5"
            >
              {site.name ?? site.domain}
              <ExternalLinkIcon />
            </a>
          </h1>
          <RangeTabs current={range} />
        </div>
        <p className="text-sm text-zinc-500">{site.domain}</p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Pageviews" value={totals?.pageviews ?? 0} />
        <Stat label="Unique visitors" value={totals?.uniques ?? 0} />
        <Stat label="Days with data" value={dailySeries.length} />
        <Stat
          label="Avg / day"
          value={
            dailySeries.length === 0
              ? 0
              : Math.round((totals?.pageviews ?? 0) / dailySeries.length)
          }
        />
      </section>

      <DailyBars series={dailySeries} />

      <div className="grid sm:grid-cols-2 gap-6">
        <BarTable
          title="Top pages"
          rows={topPaths.map((r) => ({ label: r.path, value: r.pageviews }))}
        />
        <BarTable
          title="Top referrers"
          rows={topReferrers.map((r) => ({
            label: r.host ?? 'Direct',
            value: r.pageviews,
          }))}
        />
        <BarTable
          title="Browsers"
          rows={topBrowsers.map((r) => ({
            label: r.browser ?? 'Unknown',
            value: r.pageviews,
          }))}
        />
        <BarTable
          title="Countries"
          rows={topCountries.map((r) => ({
            label: r.country ?? 'Unknown',
            value: r.pageviews,
          }))}
        />
        <BarTable
          title="Devices"
          rows={topDevices.map((r) => ({
            label: r.device ?? 'Unknown',
            value: r.pageviews,
          }))}
        />
      </div>

      <Snippet trackingId={site.trackingId} />

      <section className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
        <form action={deleteSite}>
          <input type="hidden" name="siteId" value={site.id} />
          <button
            type="submit"
            className="text-sm text-red-600 hover:underline"
          >
            Delete this site (removes all collected events)
          </button>
        </form>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-2xl font-semibold">{value.toLocaleString()}</span>
    </div>
  );
}

function RangeTabs({ current }: { current: Range }) {
  const ranges: Range[] = ['7d', '30d', '90d'];
  return (
    <nav className="flex gap-1 text-sm">
      {ranges.map((r) => (
        <a
          key={r}
          href={`?range=${r}`}
          className={
            'rounded-md px-3 py-1 ' +
            (r === current
              ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800')
          }
        >
          {r}
        </a>
      ))}
    </nav>
  );
}

function BarTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No data yet.</p>
      ) : (
        <ul className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((r) => (
            <li
              key={r.label}
              className="relative flex items-center justify-between px-3 py-2 text-sm"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 bottom-0 bg-emerald-100 dark:bg-emerald-900/30 transition-all"
                style={{
                  width: `${max > 0 ? (r.value / max) * 100 : 0}%`,
                }}
              />
              <span
                className="relative truncate max-w-[14rem]"
                title={r.label}
              >
                {r.label}
              </span>
              <span className="relative tabular-nums font-medium ml-3">
                {r.value.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DailyBars({
  series,
}: {
  series: { day: string; pageviews: number; uniques: number }[];
}) {
  if (series.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-2">
          Daily pageviews
        </h2>
        <p className="text-sm text-zinc-500">
          No data yet. Once events start flowing, daily totals will show up here.
        </p>
      </section>
    );
  }
  const max = series.reduce((m, s) => Math.max(m, s.pageviews), 1);
  const labelStride = Math.max(1, Math.ceil(series.length / 10));
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">
        Daily pageviews
      </h2>
      <div className="flex items-end gap-1 h-40">
        {series.map((s) => (
          <div
            key={s.day}
            className="flex-1 flex items-end h-full"
            title={`${s.day}: ${s.pageviews.toLocaleString()} views, ${s.uniques.toLocaleString()} unique`}
          >
            <div
              className="w-full bg-emerald-500 dark:bg-emerald-400 rounded-sm hover:bg-emerald-600 dark:hover:bg-emerald-300"
              style={{
                height: `${Math.max((s.pageviews / max) * 100, s.pageviews > 0 ? 2 : 0)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-2 text-[10px] text-zinc-500">
        {series.map((s, i) => (
          <span key={s.day} className="flex-1 text-center truncate">
            {i % labelStride === 0 || i === series.length - 1
              ? s.day.slice(5)
              : ''}
          </span>
        ))}
      </div>
    </section>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-400"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
