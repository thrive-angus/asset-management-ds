import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const assets = sqliteTable('assets', {id:text('id').primaryKey(), data:text('data').notNull()});
export const history = sqliteTable('history', {id:text('id').primaryKey(), assetId:text('asset_id').notNull(), data:text('data').notNull(), date:text('date').notNull()});
export const staff = sqliteTable('staff', {id:text('id').primaryKey(), data:text('data').notNull()});

export const audits = sqliteTable('audits', {id:text('id').primaryKey(),data:text('data').notNull(),date:text('date').notNull()});
export const auditChecks = sqliteTable('audit_checks', {id:text('id').primaryKey(),auditId:text('audit_id').notNull(),data:text('data').notNull()});
export const settings = sqliteTable('settings', {id:text('id').primaryKey(),data:text('data').notNull()});
