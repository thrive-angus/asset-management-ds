CREATE TABLE "audit_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_id" text NOT NULL,
	"data" text NOT NULL
);

CREATE TABLE "audits" (
	"id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"date" text NOT NULL
);
