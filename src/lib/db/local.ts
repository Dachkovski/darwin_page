import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../../db/schema';

// This is used for local development and testing
const sqlite = new Database('darwin.db');
export const localDb = drizzle(sqlite, { schema });
