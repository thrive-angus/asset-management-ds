import Database from "better-sqlite3";
import { Pool } from "pg";

const SQLITE_PATH = process.env.SQLITE_PATH || "./data/app.db";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const TABLES = [
  "assets",
  "history",
  "staff",
  "audits",
  "audit_checks",
  "settings",
  "auth_users",
  "auth_sessions",
];

function placeholders(count) {
  return Array.from({ length: count }, (_, index) => `$${index + 1}`).join(",");
}

async function migrate() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const table of TABLES) {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      if (!rows.length) {
        console.log(`${table}: no rows`);
        continue;
      }

      const keys = Object.keys(rows[0]);
      const sql = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${placeholders(keys.length)}) ON CONFLICT DO NOTHING`;
      for (const row of rows) {
        await client.query(sql, keys.map((key) => row[key]));
      }
      console.log(`${table}: migrated ${rows.length} row(s)`);
    }
    await client.query("COMMIT");
    console.log("SQLite to PostgreSQL migration complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
