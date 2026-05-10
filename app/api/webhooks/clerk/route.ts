import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ClerkEmail {
  email_address: string;
  id: string;
}

interface ClerkUserData {
  id: string;
  primary_email_address_id: string | null;
  email_addresses: ClerkEmail[];
}

interface ClerkEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | string;
  data: ClerkUserData & { deleted?: boolean };
}

function pickEmail(data: ClerkUserData): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  );
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? '';
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CLERK_WEBHOOK_SECRET not set' },
      { status: 500 },
    );
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'missing svix headers' }, { status: 400 });
  }

  const payload = await req.text();
  let event: ClerkEvent;
  try {
    event = new Webhook(secret).verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkEvent;
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const email = pickEmail(event.data);
    await db
      .insert(users)
      .values({ clerkUserId: event.data.id, email })
      .onConflictDoUpdate({
        target: users.clerkUserId,
        set: { email },
      });
  } else if (event.type === 'user.deleted') {
    await db.delete(users).where(eq(users.clerkUserId, event.data.id));
  }

  return NextResponse.json({ ok: true });
}
