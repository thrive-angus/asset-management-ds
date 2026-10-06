import { pgTable, text } from 'drizzle-orm/pg-core';

export const assets = pgTable('assets', {
	id: text('id').primaryKey(),
	data: text('data').notNull(),
});

export const history = pgTable('history', {
	id: text('id').primaryKey(),
	assetId: text('asset_id').notNull(),
	data: text('data').notNull(),
	date: text('date').notNull(),
});

export const staff = pgTable('staff', {
	id: text('id').primaryKey(),
	data: text('data').notNull(),
});

export const audits = pgTable('audits', {
	id: text('id').primaryKey(),
	data: text('data').notNull(),
	date: text('date').notNull(),
});

export const auditChecks = pgTable('audit_checks', {
	id: text('id').primaryKey(),
	auditId: text('audit_id').notNull(),
	data: text('data').notNull(),
});
