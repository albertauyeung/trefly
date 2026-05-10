'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sites } from '@/db/schema';
import {
  loadAllRanges,
  safeTimezone,
  type AllRanges,
} from '@/lib/site-stats';

export async function refreshSiteStats(
  siteId: string,
  timezone: string,
): Promise<AllRanges> {
  const [exists] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  if (!exists) {
    throw new Error('Site not found');
  }
  return loadAllRanges(siteId, safeTimezone(timezone));
}
