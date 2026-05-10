export const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_TREFLY_CLERK_PUBLISHABLE_KEY;

export const clerkSecretKey =
  process.env.CLERK_SECRET_KEY || process.env.TREFLY_CLERK_SECRET_KEY;

export const clerkWebhookSecret =
  process.env.CLERK_WEBHOOK_SECRET || process.env.TREFLY_CLERK_WEBHOOK_SECRET;
