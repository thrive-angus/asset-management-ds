import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
let pool: Pool | null = null;
let db:
  | ReturnType<typeof drizzle<typeof schema>>
  | null = null;

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error(
      "DATABASE_URL is required for PostgreSQL runtime. Configure the app service with Dokploy internal connection URL.",
    );
  }
  return value;
}

export function getPgPool() {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl() });
  }
  return pool;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPgPool(), { schema });
  }
  return db;
}
