import { localDb } from './local';
import { getD1Db } from './d1';

/**
 * Universal Database Accessor
 * Automatically switches between D1 (Production/Edge) and SQLite (Local/Node)
 */
export const getDb = (env?: any) => {
  // If we are on Cloudflare Edge and have the D1 binding, use D1
  if (env && env.D1_DB) {
    return getD1Db(env);
  }
  
  // Fallback to local SQLite (only works in Node.js environments)
  return localDb;
};

// For scripts and backwards compatibility in local Node environments
export const db = localDb;
