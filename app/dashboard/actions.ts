'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sites } from '@/db/schema';
import { newTrackingId } from '@/lib/tracking-id';

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

function normaliseDomain(raw: string): string | null {
  let v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith('http://') || v.startsWith('https://')) {
    try {
      v = new URL(v).hostname;
    } catch {
      return null;
    }
  }
  if (v.startsWith('www.')) v = v.slice(4);
  v = v.replace(/\/$/, '');
  if (!DOMAIN_RE.test(v)) return null;
  return v;
}

export async function createSite(formData: FormData) {
  const domainInput = formData.get('domain');
  const nameInput = formData.get('name');
  if (typeof domainInput !== 'string') return;
  const domain = normaliseDomain(domainInput);
  if (!domain) return;
  const name =
    typeof nameInput === 'string' && nameInput.trim().length > 0
      ? nameInput.trim().slice(0, 80)
      : null;

  const [row] = await db
    .insert(sites)
    .values({
      domain,
      name,
      trackingId: newTrackingId(),
    })
    .returning();

  revalidatePath('/dashboard');
  redirect(`/dashboard/sites/${row.id}`);
}

export async function deleteSite(formData: FormData) {
  const siteId = formData.get('siteId');
  if (typeof siteId !== 'string') return;

  await db.delete(sites).where(eq(sites.id, siteId));

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
