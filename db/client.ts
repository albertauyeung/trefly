import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function makeClient() {
  const url = process.env.DATABASE_URL || process.env.TREFLY_DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL (or TREFLY_DATABASE_URL) is not set');
  }
  return drizzle(neon(url), { schema });
}

let cached: ReturnType<typeof makeClient> | null = null;

export const db = new Proxy({} as ReturnType<typeof makeClient>, {
  get(_t, prop) {
    if (!cached) cached = makeClient();
    return Reflect.get(cached, prop);
  },
});
