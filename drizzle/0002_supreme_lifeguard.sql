CREATE TYPE "public"."manufacturer_status" AS ENUM('pending', 'published', 'merged');--> statement-breakpoint
ALTER TYPE "public"."attachment_kind" ADD VALUE 'serial_plate';--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "status" "manufacturer_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "merged_into_id" uuid;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN "proposed_by" uuid;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD CONSTRAINT "manufacturers_proposed_by_profiles_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;