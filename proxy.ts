import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { clerkPublishableKey, clerkSecretKey } from '@/lib/clerk-env';

const isProtected = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtected(req)) {
      await auth.protect();
    }
  },
  { publishableKey: clerkPublishableKey, secretKey: clerkSecretKey },
);

export const config = {
  matcher: [
    '/((?!_next|_vercel|favicon.ico|t.js|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
};
