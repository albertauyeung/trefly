import { createHash } from 'node:crypto';

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function visitorHash(args: {
  siteId: string;
  ip: string;
  userAgent: string;
  day: string;
  secret: string;
}): string {
  const dailySalt = createHash('sha256')
    .update(`${args.secret}:${args.day}`)
    .digest('hex');
  return createHash('sha256')
    .update(`${dailySalt}:${args.siteId}:${args.ip}:${args.userAgent}`)
    .digest('hex')
    .slice(0, 16);
}
