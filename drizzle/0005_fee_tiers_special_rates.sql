CREATE TYPE "public"."fee_side" AS ENUM('seller', 'buyer');--> statement-breakpoint
CREATE TYPE "public"."special_rate_status" AS ENUM('requested', 'approved', 'rejected', 'ended');--> statement-breakpoint
CREATE TABLE "special_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"side" "fee_side" NOT NULL,
	"status" "special_rate_status" DEFAULT 'requested' NOT NULL,
	"rate_bp" integer,
	"expected_per_year" integer,
	"message" text,
	"requested_by" uuid,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "special_rates_bp_range" CHECK ("special_rates"."rate_bp" is null or "special_rates"."rate_bp" between 0 and 10000)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "seller_fee_bp" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_fee_bp" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_org_id" uuid;--> statement-breakpoint
ALTER TABLE "special_rates" ADD CONSTRAINT "special_rates_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_rates" ADD CONSTRAINT "special_rates_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_rates" ADD CONSTRAINT "special_rates_decided_by_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "special_rates_organisation_idx" ON "special_rates" USING btree ("organisation_id","side");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_org_id_organisations_id_fk" FOREIGN KEY ("buyer_org_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Data, 2026-10-21: 3 % from each side, less for those who trade a lot (docs/decisions.md).
-- A rule stored before the volume tiers is replaced by the new default.
UPDATE "settings"
SET "value" = '{"sellerPercent": 3, "buyerPercent": 3, "sellerTiers": {"stepTransactions": 100, "stepPercent": 0.1, "maxPercent": 0.5}, "buyerTiers": {"stepTransactions": 100, "stepPercent": 0.1, "maxPercent": 0.5}, "capCents": null, "minCents": 0}'::jsonb
WHERE "key" = 'fee_rule' AND "value"->'sellerTiers' IS NULL;--> statement-breakpoint
-- The seeded pages follow; a sentence someone has edited stays as it is.
UPDATE "content_pages"
SET
  "body" = "body" || jsonb_build_object(
    'de', replace(replace(replace(replace("body"->>'de',
      '* **Klare Gebühren.** 5 Prozent pro Verkauf: 3 Prozent trägt die verkaufende, 2 Prozent die kaufende Person.',
      '* **Faire Gebühren.** Je 3 Prozent für die verkaufende und die kaufende Person. Wer viel handelt, zahlt weniger, bis hinunter auf 2,5 Prozent.'),
      '5 Prozent des Verkaufspreises: 3 Prozent werden von der Auszahlung an die verkaufende Person abgezogen, 2 Prozent zahlt die kaufende Person zusätzlich zum Preis. Das Einstellen von Inseraten ist kostenlos.',
      'Je 3 Prozent des Verkaufspreises: Die verkaufende Person erhält die Auszahlung abzüglich ihres Anteils, die kaufende Person zahlt ihren Anteil zusätzlich zum Preis. Nach je 100 abgeschlossenen Transaktionen sinkt der eigene Satz um 0,1 Prozentpunkte, bis auf 2,5 Prozent. Mit Händlern und grossen Firmen kann refreshLab Sondersätze vereinbaren. Das Einstellen von Inseraten ist kostenlos.'),
      '5 Prozent des Verkaufspreises: 3 Prozent zahlt die verkaufende Person, 2 Prozent die kaufende. Inserate sind kostenlos.',
      'Je 3 Prozent des Verkaufspreises für die verkaufende und die kaufende Person. Wer viel handelt, zahlt weniger: Nach je 100 abgeschlossenen Transaktionen sinkt der Satz um 0,1 Prozentpunkte, bis auf 2,5 Prozent. Inserate sind kostenlos.'),
      '5 Prozent des Verkaufspreises, fällig bei erfolgreichem Verkauf. 3 Prozent werden von der Auszahlung an die anbietende Person abgezogen, 2 Prozent werden der kaufenden Person zusätzlich zum Kaufpreis berechnet.',
      'Je 3 Prozent des Verkaufspreises für die anbietende und die kaufende Person, fällig bei erfolgreichem Verkauf. Der Anteil der anbietenden Person wird von der Auszahlung abgezogen, der Anteil der kaufenden Person zusätzlich zum Kaufpreis berechnet. Nach je 100 abgeschlossenen Transaktionen in derselben Rolle sinkt der Satz um 0,1 Prozentpunkte, höchstens um 0,5 Prozentpunkte. Mit Händlern und Firmen können abweichende Sätze vereinbart werden.'),
    'en', replace(replace(replace(replace("body"->>'en',
      '* **A clear fee.** 5 percent per sale: the seller pays 3 percent, the buyer 2 percent.',
      '* **A fair fee.** 3 percent each for seller and buyer. The more you trade, the less you pay, down to 2.5 percent.'),
      '5 percent of the sale price: 3 percent comes off the seller''s payout, and the buyer pays 2 percent on top of the price. Publishing a listing is free.',
      '3 percent of the sale price from each side: the seller''s share comes off the payout, and the buyer pays theirs on top of the price. After every 100 completed transactions your own rate drops by 0.1 percentage points, down to 2.5 percent. refreshLab can agree special rates with dealers and large companies. Publishing a listing is free.'),
      '5 percent of the sale price: the seller pays 3 percent, the buyer 2 percent. Listings are free.',
      '3 percent of the sale price each for seller and buyer. The more you trade, the less you pay: after every 100 completed transactions the rate drops by 0.1 percentage points, down to 2.5 percent. Listings are free.'),
      '5 percent of the sale price, due on a successful sale. 3 percent is deducted from the seller''s payout and 2 percent is charged to the buyer on top of the purchase price.',
      '3 percent of the sale price each for seller and buyer, due on a successful sale. The seller''s share is deducted from the payout, the buyer''s share is charged on top of the purchase price. After every 100 completed transactions in the same role the rate drops by 0.1 percentage points, by at most 0.5 percentage points. Different rates may be agreed with dealers and companies.')
  ),
  "updated_at" = now()
WHERE "body"->>'de' LIKE '%5 Prozent%' OR "body"->>'en' LIKE '%5 percent%';
