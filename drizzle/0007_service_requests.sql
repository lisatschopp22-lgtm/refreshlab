CREATE TYPE "public"."service_kind" AS ENUM('lab_clearance', 'maintenance', 'chemicals');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('open', 'in_progress', 'done', 'declined');--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "service_kind" NOT NULL,
	"status" "service_status" DEFAULT 'open' NOT NULL,
	"profile_id" uuid,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"organisation_name" text,
	"location" text,
	"message" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"admin_note" text,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_handled_by_profiles_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status","kind");