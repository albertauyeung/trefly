import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sites } from '@/db/schema';
import { loadAllRanges, safeTimezone } from '@/lib/site-stats';
import { deleteSite } from '../../actions';
import { Snippet } from './snippet';
import { SiteStats } from './stats';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SitePage({ params }: PageProps) {
  const { id } = await params;

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);
  if (!site) notFound();

  const hdrs = await headers();
  const initialTimezone = safeTimezone(hdrs.get('x-vercel-ip-timezone'));
  const initial = await loadAllRanges(site.id, initialTimezone);

  return (
    <main className="px-6 py-10 max-w-5xl w-full mx-auto flex flex-col gap-10">
      <SiteStats
        siteId={site.id}
        siteName={site.name ?? site.domain}
        siteDomain={site.domain}
        initial={initial}
        initialTimezone={initialTimezone}
      />

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
