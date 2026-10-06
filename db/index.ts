import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __dbPool: Pool | undefined;
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Configure a PostgreSQL connection string before starting the app.",
    );
  }
  return databaseUrl;
}

function getPool(): Pool {
  if (!globalThis.__dbPool) {
    globalThis.__dbPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    });
  }
  return globalThis.__dbPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}
