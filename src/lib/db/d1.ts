import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';

// This is used for Cloudflare Pages/Workers D1 deployment
// The binding D1_DB will be available in the edge runtime environment
export const getD1Db = (env: any) => {
  if (!env || !env.D1_DB) {
    throw new Error('D1_DB binding not found in environment');
  }
  return drizzle(env.D1_DB, { schema });
};
