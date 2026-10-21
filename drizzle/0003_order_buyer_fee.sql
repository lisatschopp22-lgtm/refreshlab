ALTER TABLE "orders" ADD COLUMN "buyer_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Data, 2026-10-21: the platform fee is split between seller and buyer (docs/decisions.md).
-- A rule stored before the split is replaced by the new default.
UPDATE "settings"
SET "value" = '{"sellerPercent": 3, "buyerPercent": 2, "capCents": null, "minCents": 0}'::jsonb
WHERE "key" = 'fee_rule' AND "value"->>'sellerPercent' IS NULL;--> statement-breakpoint
-- The seeded pages get the new wording; a sentence someone has edited stays as it is.
UPDATE "content_pages"
SET
  "body" = "body" || jsonb_build_object(
    'de', replace(replace(replace(replace("body"->>'de',
      '* **Gebühren mit Obergrenze.** Ein Prozent, höchstens 500 Franken pro Verkauf.',
      '* **Klare Gebühren.** 5 Prozent pro Verkauf: 3 Prozent trägt die verkaufende, 2 Prozent die kaufende Person.'),
      'Ein Prozent des Verkaufspreises, höchstens CHF 500. Das Einstellen von Inseraten ist kostenlos.',
      '5 Prozent des Verkaufspreises: 3 Prozent werden von der Auszahlung an die verkaufende Person abgezogen, 2 Prozent zahlt die kaufende Person zusätzlich zum Preis. Das Einstellen von Inseraten ist kostenlos.'),
      'Ein Prozent des Verkaufspreises, höchstens CHF 500. Inserate sind kostenlos.',
      '5 Prozent des Verkaufspreises: 3 Prozent zahlt die verkaufende Person, 2 Prozent die kaufende. Inserate sind kostenlos.'),
      'Ein Prozent des Verkaufspreises, höchstens CHF 500, fällig bei erfolgreichem Verkauf.',
      '5 Prozent des Verkaufspreises, fällig bei erfolgreichem Verkauf. 3 Prozent werden von der Auszahlung an die anbietende Person abgezogen, 2 Prozent werden der kaufenden Person zusätzlich zum Kaufpreis berechnet.'),
    'en', replace(replace(replace(replace("body"->>'en',
      '* **A capped fee.** One percent, at most CHF 500 per sale.',
      '* **A clear fee.** 5 percent per sale: the seller pays 3 percent, the buyer 2 percent.'),
      'One percent of the sale price, capped at CHF 500. Publishing a listing is free.',
      '5 percent of the sale price: 3 percent comes off the seller''s payout, and the buyer pays 2 percent on top of the price. Publishing a listing is free.'),
      'One percent of the sale price, at most CHF 500. Listings are free.',
      '5 percent of the sale price: the seller pays 3 percent, the buyer 2 percent. Listings are free.'),
      'One percent of the sale price, capped at CHF 500, due on a successful sale.',
      '5 percent of the sale price, due on a successful sale. 3 percent is deducted from the seller''s payout and 2 percent is charged to the buyer on top of the purchase price.')
  ),
  "updated_at" = now()
WHERE "body"->>'de' LIKE '%Ein Prozent%' OR "body"->>'en' LIKE '%One percent%';
