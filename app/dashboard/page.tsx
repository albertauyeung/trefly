import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { sites } from '@/db/schema';
import { ensureUserRow } from '@/lib/clerk-sync';
import { createSite } from './actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect('/sign-in');

  const user = await ensureUserRow(clerkUserId);
  const mySites = user
    ? await db
        .select()
        .from(sites)
        .where(eq(sites.userId, user.id))
        .orderBy(desc(sites.createdAt))
    : [];

  return (
    <main className="px-6 py-10 max-w-3xl w-full mx-auto flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your sites</h1>
        {mySites.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            You haven&apos;t added a site yet. Add one below to get started.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-md">
            {mySites.map((site) => (
              <li key={site.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium">{site.name ?? site.domain}</span>
                  <span className="text-xs text-zinc-500">{site.domain}</span>
                </div>
                <Link
                  href={`/dashboard/sites/${site.id}`}
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:underline"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Add a site</h2>
        <form
          action={createSite}
          className="flex flex-col gap-3 max-w-md"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Domain</span>
            <input
              type="text"
              name="domain"
              required
              placeholder="example.com"
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:focus:border-zinc-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Name (optional)</span>
            <input
              type="text"
              name="name"
              placeholder="My blog"
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:focus:border-zinc-200"
            />
          </label>
          <button
            type="submit"
            className="self-start inline-flex h-10 items-center rounded-md bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 px-5 text-sm font-medium text-zinc-50 hover:opacity-90"
          >
            Add site
          </button>
        </form>
      </section>
    </main>
  );
}
