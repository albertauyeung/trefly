import { NextRequest, NextResponse } from 'next/server';

function decodeBase64(value: string): string {
  if (typeof atob === 'function') return atob(value);
  return Buffer.from(value, 'base64').toString('utf-8');
}

function requireAdminAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.TREFLY_ADMIN_PASSWORD;
  if (!expected) {
    return new NextResponse('Auth not configured', { status: 503 });
  }

  const header = req.headers.get('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    try {
      const decoded = decodeBase64(encoded);
      const idx = decoded.indexOf(':');
      const password = idx >= 0 ? decoded.slice(idx + 1) : decoded;
      if (password === expected) return null;
    } catch {
      // fall through
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="Trefly", charset="UTF-8"',
      'cache-control': 'no-store',
    },
  });
}

export default function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    return requireAdminAuth(req) ?? NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
