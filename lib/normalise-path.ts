const MAX_PATH_LENGTH = 256;

export function normalisePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (!raw.startsWith('/')) return null;
  if (raw.length > MAX_PATH_LENGTH) return null;
  const withoutQuery = raw.split('?')[0].split('#')[0];
  return withoutQuery.replace(/\/+$/, '') || '/';
}

export function referrerHost(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const u = new URL(raw);
    return u.hostname || null;
  } catch {
    return null;
  }
}
