import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const assets = sqliteTable('assets', {id:text('id').primaryKey(), data:text('data').notNull()});
export const history = sqliteTable('history', {id:text('id').primaryKey(), assetId:text('asset_id').notNull(), data:text('data').notNull(), date:text('date').notNull()});
export const staff = sqliteTable('staff', {id:text('id').primaryKey(), data:text('data').notNull()});

export const audits = sqliteTable('audits', {id:text('id').primaryKey(),data:text('data').notNull(),date:text('date').notNull()});
export const auditChecks = sqliteTable('audit_checks', {id:text('id').primaryKey(),auditId:text('audit_id').notNull(),data:text('data').notNull()});
export const settings = sqliteTable('settings', {id:text('id').primaryKey(),data:text('data').notNull()});
export const authUsers = sqliteTable('auth_users', {
 id:text('id').primaryKey(),
 email:text('email').notNull().unique(),
 passwordHash:text('password_hash').notNull(),
 displayName:text('display_name').notNull(),
 createdAt:text('created_at').notNull(),
});
export const authSessions = sqliteTable('auth_sessions', {
 id:text('id').primaryKey(),
 userId:text('user_id').notNull(),
 expiresAt:text('expires_at').notNull(),
 createdAt:text('created_at').notNull(),
});
