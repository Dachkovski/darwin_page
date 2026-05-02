import { getD1Db } from './d1';
import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * Universal Database Accessor
 * Automatically switches between D1 (Production/Edge) and SQLite (Local/Node)
 */
export const getDb = (env?: any) => {
  if (env && env.D1_DB) return getD1Db(env);
  
  // Try to get from next-on-pages context if no env passed
  try {
    const ctx = getRequestContext();
    if (ctx.env && (ctx.env as any).D1_DB) return getD1Db(ctx.env);
  } catch(e) {}
  
  throw new Error("D1_DB not available. Please run using 'npx wrangler pages dev'.");
};

// A proxy that dynamically fetches the DB, since we can't statically export it anymore without env
export const db = new Proxy({}, {
  get: (target, prop) => {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  }
}) as ReturnType<typeof getDb>;
