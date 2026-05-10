'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  RANGE_KEYS,
  type AllRanges,
  type BarRow,
  type Bucket,
  type Range,
  type SeriesPoint,
} from '@/lib/site-stats';
import { refreshSiteStats } from './refresh-action';

interface SiteStatsProps {
  siteId: string;
  siteName: string;
  siteDomain: string;
  initial: AllRanges;
  initialTimezone: string;
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function SiteStats({
  siteId,
  siteName,
  siteDomain,
  initial,
  initialTimezone,
}: SiteStatsProps) {
  const [data, setData] = useState<AllRanges>(initial);
  const [range, setRange] = useState<Range>('7d');
  const [refreshing, startRefresh] = useTransition();
  const reconciledOnce = useRef(false);

  const view = data[range];

  const refresh = (tz: string) => {
    startRefresh(async () => {
      const fresh = await refreshSiteStats(siteId, tz);
      setData(fresh);
    });
  };

  useEffect(() => {
    if (reconciledOnce.current) return;
    reconciledOnce.current = true;
    const browserTz = browserTimezone();
    if (browserTz !== initialTimezone) {
      refresh(browserTz);
    }
  }, [initialTimezone]);

  const handleRefresh = () => refresh(browserTimezone());

  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            <a
              href={`https://${siteDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline inline-flex items-center gap-1.5"
            >
              {siteName}
              <ExternalLinkIcon />
            </a>
          </h1>
          <div className="flex items-center gap-2">
            <RangeTabs current={range} onSelect={setRange} />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh stats"
              title="Refresh stats"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60"
            >
              <RefreshIcon spinning={refreshing} />
            </button>
          </div>
        </div>
        <p className="text-sm text-zinc-500">{siteDomain}</p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Pageviews" value={view.totals.pageviews} />
        <Stat label="Unique visitors" value={view.totals.uniques} />
        <Stat
          label={view.bucket === 'hour' ? 'Hours with data' : 'Days with data'}
          value={view.series.length}
        />
        <Stat
          label={view.bucket === 'hour' ? 'Avg / hour' : 'Avg / day'}
          value={
            view.series.length === 0
              ? 0
              : Math.round(view.totals.pageviews / view.series.length)
          }
        />
      </section>

      <SeriesBars series={view.series} bucket={view.bucket} />

      <div className="grid sm:grid-cols-2 gap-6">
        <BarTable title="Top pages" rows={view.topPaths} />
        <BarTable title="Top referrers" rows={view.topReferrers} />
        <BarTable title="Browsers" rows={view.topBrowsers} />
        <BarTable title="Countries" rows={view.topCountries} />
        <BarTable title="Devices" rows={view.topDevices} />
      </div>
    </>
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

function RangeTabs({
  current,
  onSelect,
}: {
  current: Range;
  onSelect: (r: Range) => void;
}) {
  return (
    <nav className="flex gap-1 text-sm">
      {RANGE_KEYS.map((r) => (
        <button
          type="button"
          key={r}
          onClick={() => onSelect(r)}
          className={
            'rounded-md px-3 py-1 transition-colors ' +
            (r === current
              ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800')
          }
        >
          {r}
        </button>
      ))}
    </nav>
  );
}

function BarTable({ title, rows }: { title: string; rows: BarRow[] }) {
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

function SeriesBars({
  series,
  bucket,
}: {
  series: SeriesPoint[];
  bucket: Bucket;
}) {
  const heading = bucket === 'hour' ? 'Hourly pageviews' : 'Daily pageviews';
  if (series.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-2">
          {heading}
        </h2>
        <p className="text-sm text-zinc-500">
          No data yet. Once events start flowing, totals will show up here.
        </p>
      </section>
    );
  }
  const max = series.reduce((m, s) => Math.max(m, s.pageviews), 1);
  const labelStride = Math.max(1, Math.ceil(series.length / 10));
  const showCount = (i: number) =>
    i % labelStride === 0 || i === series.length - 1;
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">
        {heading}
      </h2>
      <div className="flex items-end gap-1 h-44">
        {series.map((s, i) => (
          <div
            key={s.bucket}
            className="flex-1 flex flex-col justify-end items-center h-full"
            title={`${s.bucket}: ${s.pageviews.toLocaleString()} views, ${s.uniques.toLocaleString()} unique`}
          >
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 tabular-nums leading-none mb-1 truncate w-full text-center">
              {s.pageviews > 0 && showCount(i)
                ? s.pageviews.toLocaleString()
                : ' '}
            </span>
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
          <span key={s.bucket} className="flex-1 text-center truncate">
            {showCount(i) ? s.bucket.slice(-5) : ''}
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

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={spinning ? 'animate-spin' : ''}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
