import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';

export async function ensureUserRow(clerkUserId: string) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    '';

  const [row] = await db
    .insert(users)
    .values({ clerkUserId, email })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning();

  if (row) return row;

  const after = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return after[0];
}
