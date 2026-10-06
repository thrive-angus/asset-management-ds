CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL
);

CREATE TABLE "history" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"data" text NOT NULL,
	"date" text NOT NULL
);
