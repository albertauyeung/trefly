import Link from 'next/link';
import { Show } from '@clerk/nextjs';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight">Trefly</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Minimal, privacy-friendly web analytics. No cookies, no banner, no
            personal data — just the numbers you need.
          </p>
        </header>

        <ul className="text-zinc-700 dark:text-zinc-300 list-disc pl-5 space-y-1">
          <li>Pageviews, unique visitors, top pages, referrers.</li>
          <li>Browser, OS, device, country.</li>
          <li>Cookie-free and GDPR-compliant by design.</li>
          <li>One short script tag to install.</li>
        </ul>

        <div className="flex gap-3 pt-2">
          <Show when="signed-out">
            <Link
              href="/sign-up"
              className="inline-flex h-10 items-center rounded-md bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 px-5 text-sm font-medium text-zinc-50 hover:opacity-90"
            >
              Get started
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center rounded-md border border-zinc-300 dark:border-zinc-700 px-5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Sign in
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-md bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 px-5 text-sm font-medium text-zinc-50 hover:opacity-90"
            >
              Open dashboard
            </Link>
          </Show>
        </div>
      </div>
    </main>
  );
}
