CREATE TABLE "watch_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DROP INDEX "watchlist_unique";--> statement-breakpoint
ALTER TABLE "watchlist" ADD COLUMN "list_id" uuid;--> statement-breakpoint
-- Data: everything saved so far goes into one unnamed list per person, shown as "Merkliste".
INSERT INTO "watch_lists" ("profile_id") SELECT DISTINCT "profile_id" FROM "watchlist";--> statement-breakpoint
UPDATE "watchlist" SET "list_id" = "watch_lists"."id" FROM "watch_lists" WHERE "watch_lists"."profile_id" = "watchlist"."profile_id";--> statement-breakpoint
ALTER TABLE "watchlist" ALTER COLUMN "list_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "watch_lists" ADD CONSTRAINT "watch_lists_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "watch_lists_profile_idx" ON "watch_lists" USING btree ("profile_id");--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_list_id_watch_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."watch_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_list_listing_idx" ON "watchlist" USING btree ("list_id","listing_id");--> statement-breakpoint
CREATE INDEX "watchlist_profile_idx" ON "watchlist" USING btree ("profile_id");