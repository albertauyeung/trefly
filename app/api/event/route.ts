import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { events, sites } from '@/db/schema';
import { isBot } from '@/lib/bot-filter';
import { normalisePath, referrerHost } from '@/lib/normalise-path';
import { parseUA } from '@/lib/parse-ua';
import { todayUtc, visitorHash } from '@/lib/visitor-hash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

const noContent = () =>
  new NextResponse(null, { status: 204, headers: corsHeaders });

const eventSchema = z.object({
  s: z.string().min(1).max(64),
  p: z.string().min(1).max(256),
  r: z.string().max(2048).optional().nullable(),
});

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  if (isBot(ua)) return noContent();

  const secret = process.env.TREFLY_HASH_SECRET;
  if (!secret) return noContent();

  const raw = await req.text();
  let parsed: z.infer<typeof eventSchema>;
  try {
    parsed = eventSchema.parse(JSON.parse(raw));
  } catch {
    return noContent();
  }

  const path = normalisePath(parsed.p);
  if (!path) return noContent();

  const site = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.trackingId, parsed.s))
    .limit(1);
  if (site.length === 0) return noContent();
  const siteId = site[0].id;

  const day = todayUtc();
  const ip = clientIp(req);
  const visitor = visitorHash({ siteId, ip, userAgent: ua, day, secret });
  const country = req.headers.get('x-vercel-ip-country');
  const { browser, os, device } = parseUA(ua);

  await db.insert(events).values({
    siteId,
    path,
    referrerHost: referrerHost(parsed.r),
    country,
    browser,
    os,
    device,
    visitorHash: visitor,
  });

  return noContent();
}
