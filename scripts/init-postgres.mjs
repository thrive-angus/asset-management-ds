import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { scryptSync, randomBytes } from "node:crypto";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function init() {
  const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, asset_id TEXT NOT NULL, data TEXT NOT NULL, date TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audits (id TEXT PRIMARY KEY, data TEXT NOT NULL, date TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit_checks (id TEXT PRIMARY KEY, audit_id TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS auth_users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, display_name TEXT NOT NULL, must_reset_password BOOLEAN NOT NULL DEFAULT FALSE, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
      CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions (expires_at);
    `);
    await client.query(`
      ALTER TABLE auth_users
      ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    const bootstrapEmail = process.env.AUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    const bootstrapPassword = process.env.AUTH_BOOTSTRAP_PASSWORD;
    if (bootstrapEmail && bootstrapPassword) {
      const existing = await client.query(
        "SELECT id FROM auth_users WHERE email = $1",
        [bootstrapEmail],
      );
      if (!existing.rowCount) {
        await client.query(
          "INSERT INTO auth_users (id,email,password_hash,display_name,created_at) VALUES ($1,$2,$3,$4,$5)",
          [
            randomUUID(),
            bootstrapEmail,
            hashPassword(bootstrapPassword),
            "Administrator",
            new Date().toISOString(),
          ],
        );
      }

      const accessRow = await client.query(
        "SELECT data FROM settings WHERE id = 'access'",
      );
      const access = accessRow.rowCount ? JSON.parse(accessRow.rows[0].data) : {};
      if (access[bootstrapEmail] !== "Administrator") {
        access[bootstrapEmail] = "Administrator";
        await client.query(
          "INSERT INTO settings (id,data) VALUES ('access',$1) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
          [JSON.stringify(access)],
        );
      }
    }

    await client.query("COMMIT");
    console.log("PostgreSQL schema initialized.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch((error) => {
  console.error("PostgreSQL initialization failed:", error);
  process.exit(1);
});
