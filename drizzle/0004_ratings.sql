CREATE TYPE "public"."rating_side" AS ENUM('buyer', 'seller');--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"side" "rating_side" NOT NULL,
	"rater_id" uuid NOT NULL,
	"ratee_profile_id" uuid NOT NULL,
	"ratee_org_id" uuid,
	"score" smallint NOT NULL,
	"comment" text,
	"hidden_at" timestamp with time zone,
	"hidden_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "ratings_score_range" CHECK ("ratings"."score" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_id_profiles_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ratee_profile_id_profiles_id_fk" FOREIGN KEY ("ratee_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ratee_org_id_organisations_id_fk" FOREIGN KEY ("ratee_org_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_order_side_idx" ON "ratings" USING btree ("order_id","side");--> statement-breakpoint
CREATE INDEX "ratings_ratee_profile_idx" ON "ratings" USING btree ("ratee_profile_id");--> statement-breakpoint
CREATE INDEX "ratings_ratee_org_idx" ON "ratings" USING btree ("ratee_org_id");