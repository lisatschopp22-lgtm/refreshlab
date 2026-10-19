CREATE TYPE "public"."category_kind" AS ENUM('equipment', 'consumable');--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "kind" "category_kind" DEFAULT 'equipment' NOT NULL;