import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";
import { hashPassword } from "../app/password-auth";

let sqlite: Database.Database | null = null;
let db:
  | ReturnType<typeof drizzle<typeof schema>>
  | null = null;

function databasePath() {
  return process.env.DATABASE_PATH || "./data/app.db";
}

function initSchema(connection: Database.Database) {
  connection.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, asset_id TEXT NOT NULL, data TEXT NOT NULL, date TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audits (id TEXT PRIMARY KEY, data TEXT NOT NULL, date TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_checks (id TEXT PRIMARY KEY, audit_id TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS auth_users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, display_name TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
    CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions (expires_at);
  `);
}

function ensureBootstrapAdmin(connection: Database.Database) {
  const email = process.env.AUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;

  const existing = connection
    .prepare("SELECT id FROM auth_users WHERE email = ?")
    .get(email) as { id: string } | undefined;
  if (!existing) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const hash = hashPassword(password);
    connection
      .prepare(
        "INSERT INTO auth_users (id,email,password_hash,display_name,created_at) VALUES (?,?,?,?,?)",
      )
      .run(id, email, hash, "Administrator", now);
  }

  const accessRow = connection
    .prepare("SELECT data FROM settings WHERE id = 'access'")
    .get() as { data: string } | undefined;
  const access = accessRow?.data ? JSON.parse(accessRow.data) : {};
  if (access[email] !== "Administrator") {
    access[email] = "Administrator";
    connection
      .prepare(
        "INSERT INTO settings (id,data) VALUES ('access',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(JSON.stringify(access));
  }
}

export function getDb() {
  if (!sqlite) {
    mkdirSync(dirname(databasePath()), { recursive: true });
    sqlite = new Database(databasePath());
    initSchema(sqlite);
    ensureBootstrapAdmin(sqlite);
    db = drizzle(sqlite, { schema });
  }
  return db!;
}

export function getSqlite() {
  if (!sqlite) {
    getDb();
  }
  return sqlite!;
}
