import { existsSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env.local')) loadEnv({ path: '.env.local' });
if (existsSync('.env')) loadEnv({ path: '.env' });

const databaseUrl =
  process.env.DATABASE_URL || process.env.TREFLY_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL (or TREFLY_DATABASE_URL) is not set');
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  verbose: true,
});
