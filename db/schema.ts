import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
export const assets = pgTable('assets', {id:text('id').primaryKey(), data:text('data').notNull()});
export const history = pgTable('history', {id:text('id').primaryKey(), assetId:text('asset_id').notNull(), data:text('data').notNull(), date:text('date').notNull()});
export const staff = pgTable('staff', {id:text('id').primaryKey(), data:text('data').notNull()});

export const audits = pgTable('audits', {id:text('id').primaryKey(),data:text('data').notNull(),date:text('date').notNull()});
export const auditChecks = pgTable('audit_checks', {id:text('id').primaryKey(),auditId:text('audit_id').notNull(),data:text('data').notNull()});
export const settings = pgTable('settings', {id:text('id').primaryKey(),data:text('data').notNull()});
export const authUsers = pgTable('auth_users', {
 id:text('id').primaryKey(),
 email:text('email').notNull().unique(),
 passwordHash:text('password_hash').notNull(),
 displayName:text('display_name').notNull(),
 mustResetPassword:boolean('must_reset_password').notNull().default(false),
 createdAt:text('created_at').notNull(),
});
export const authSessions = pgTable('auth_sessions', {
 id:text('id').primaryKey(),
 userId:text('user_id').notNull(),
 expiresAt:text('expires_at').notNull(),
 createdAt:text('created_at').notNull(),
});
