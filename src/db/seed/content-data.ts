import type { Localized } from "@/db/schema/common";

export const contentPages: {
  slug: string;
  title: Localized;
  body: Localized;
  showInFooter: boolean;
}[] = [
  {
    slug: "ueber-uns",
    showInFooter: true,
    title: { de: "Über refreshLab", en: "About refreshLab" },
    body: {
      de: `## Warum es refreshLab gibt

Laborgeräte sind teuer, und sie werden selten bis zum Ende ihrer technischen Lebensdauer genutzt. Ein Projekt endet, eine Gruppe zieht um, ein Gerät wird ersetzt: Was bleibt, steht im Keller.

Gleichzeitig arbeiten viele Labore unter wirtschaftlichem Druck. Allgemeine Auktionsplattformen nehmen Provisionen, die bei einem Gerät für 40'000 Franken unverhältnismässig sind, und sie können technische Fragen nicht beantworten.

## Was wir anders machen

* **Eine Gerätedatenbank statt Einzelinserate.** Jedes Modell existiert einmal, mit Spezifikationen, Zubehör und Handbüchern. Angebote hängen an diesem Datensatz.
* **Zustand, der vergleichbar ist.** Angaben der verkaufenden Person und unabhängig geprüfte Befunde werden getrennt ausgewiesen.
* **Faire Gebühren.** Je 3 Prozent für die verkaufende und die kaufende Person. Wer viel handelt, zahlt weniger, bis hinunter auf 2,5 Prozent.

## Hinweis zum Prototyp

Diese Installation ist ein lokaler Prototyp. Zahlungen sind simuliert, es entstehen keine Verpflichtungen.`,
      en: `## Why refreshLab exists

Laboratory equipment is expensive and rarely used to the end of its technical life. A project ends, a group moves, an instrument is replaced, and what is left sits in a basement.

At the same time many labs work under economic pressure. General auction platforms charge commissions that are out of proportion for a CHF 40,000 instrument, and they cannot answer technical questions.

## What we do differently

* **An equipment database, not isolated adverts.** Every model exists once, with specifications, accessories and manuals. Listings hang off that record.
* **Condition you can compare.** Seller statements and independently verified findings are shown separately.
* **A fair fee.** 3 percent each for seller and buyer. The more you trade, the less you pay, down to 2.5 percent.

## Note on this prototype

This installation is a local prototype. Payments are simulated and nothing is binding.`,
    },
  },
  {
    slug: "so-funktioniert-es",
    showInFooter: true,
    title: { de: "So funktioniert es", en: "How it works" },
    body: {
      de: `## Für Käuferinnen und Käufer

1. Gerät suchen, nach Zustand, Standort und Preis filtern.
2. Den Modelldatensatz prüfen: Spezifikationen, Zubehör, bekannte Schwächen.
3. Öffentlich fragen oder die verkaufende Person direkt kontaktieren.
4. Zum Festpreis kaufen oder ein Angebot machen.
5. Zahlen. Die Auszahlung erfolgt erst, wenn der Empfang bestätigt ist.

## Für Verkäuferinnen und Verkäufer

1. Gerät über den Modellkatalog identifizieren, damit technische Daten nicht erneut erfasst werden müssen.
2. Zustand beschreiben, Fotos und Dokumente hochladen.
3. Preis festlegen und entscheiden, ob Preisangebote zugelassen sind.
4. Anfragen beantworten, Angebot annehmen, Gerät versandbereit machen.
5. Auszahlung nach Empfangsbestätigung erhalten.

## Gebühren

Je 3 Prozent des Verkaufspreises: Die verkaufende Person erhält die Auszahlung abzüglich ihres Anteils, die kaufende Person zahlt ihren Anteil zusätzlich zum Preis. Nach je 100 abgeschlossenen Transaktionen sinkt der eigene Satz um 0,1 Prozentpunkte, bis auf 2,5 Prozent. Mit Händlern und grossen Firmen kann refreshLab Sondersätze vereinbaren. Das Einstellen von Inseraten ist kostenlos.`,
      en: `## For buyers

1. Search for equipment and filter by condition, location and price.
2. Check the model record: specifications, accessories, known weaknesses.
3. Ask publicly or contact the seller directly.
4. Buy at the asking price or make an offer.
5. Pay. The payout is released only once receipt is confirmed.

## For sellers

1. Identify the instrument through the model catalogue so technical data does not have to be entered again.
2. Describe the condition, upload photographs and documents.
3. Set a price and decide whether offers are accepted.
4. Answer enquiries, accept an offer, prepare the instrument for shipping.
5. Receive the payout after the buyer confirms receipt.

## Fees

3 percent of the sale price from each side: the seller's share comes off the payout, and the buyer pays theirs on top of the price. After every 100 completed transactions your own rate drops by 0.1 percentage points, down to 2.5 percent. refreshLab can agree special rates with dealers and large companies. Publishing a listing is free.`,
    },
  },
  {
    slug: "faq",
    showInFooter: true,
    title: { de: "Häufige Fragen", en: "Frequently asked questions" },
    body: {
      de: `## Wer darf verkaufen?

Labore, Universitäten, Unternehmen und Privatpersonen. Professionelle Anbieter können ein Organisationskonto mit mehreren Mitarbeitenden führen.

## Was bedeutet "geprüft"?

Ein Gerät gilt als geprüft, wenn ein unabhängiger Prüfbetrieb es begutachtet und einen Bericht hinterlegt hat. Angaben der verkaufenden Person allein genügen nicht und werden entsprechend gekennzeichnet.

## Wie wird bezahlt?

Über Banküberweisung oder Karte. Der Betrag wird erst an die verkaufende Person weitergeleitet, wenn der Empfang bestätigt ist.

## Was ist mit Dekontamination?

Geräte, die mit biologischem Material, Chemikalien oder radioaktiven Stoffen in Kontakt waren, brauchen eine Dekontaminationsbescheinigung. Ohne diese darf das Gerät nicht angeboten werden.

## Wer organisiert den Transport?

Standardmässig die verkaufende Person. Für empfindliche Geräte empfehlen wir einen Spezialtransport und eine dokumentierte Übergabe.

## Was kostet refreshLab?

Je 3 Prozent des Verkaufspreises für die verkaufende und die kaufende Person. Wer viel handelt, zahlt weniger: Nach je 100 abgeschlossenen Transaktionen sinkt der Satz um 0,1 Prozentpunkte, bis auf 2,5 Prozent. Inserate sind kostenlos.`,
      en: `## Who may sell?

Laboratories, universities, companies and individuals. Professional sellers can run an organisation account with several members.

## What does "verified" mean?

An instrument counts as verified when an independent inspector has assessed it and filed a report. Seller statements alone are not enough and are labelled as such.

## How is payment handled?

By bank transfer or card. The amount reaches the seller only once the buyer confirms receipt.

## What about decontamination?

Equipment that has been in contact with biological material, chemicals or radioactive substances needs a decontamination certificate. Without one it must not be listed.

## Who organises transport?

The seller by default. For sensitive instruments we recommend a specialist carrier and documented handover.

## What does refreshLab cost?

3 percent of the sale price each for seller and buyer. The more you trade, the less you pay: after every 100 completed transactions the rate drops by 0.1 percentage points, down to 2.5 percent. Listings are free.`,
    },
  },
  {
    slug: "sicherheit-und-vertrauen",
    showInFooter: true,
    title: { de: "Sicherheit und Vertrauen", en: "Safety and trust" },
    body: {
      de: `## Bevor Sie kaufen

* Fragen Sie nach aktuellen Betriebsfotos, nicht nach Katalogbildern.
* Lassen Sie sich Servicebericht, Kalibrierung und Dekontamination zeigen.
* Klären Sie, welches Zubehör wirklich mitgeliefert wird. Bei Zentrifugen ist der Rotor oft teurer als das Gerät.
* Prüfen Sie Spannung und Anschlusswerte.

## Warnsignale

* Die Zahlung soll ausserhalb der Plattform erfolgen.
* Der Preis liegt weit unter allen vergleichbaren Angeboten.
* Die verkaufende Person weicht technischen Fragen aus.
* Die Bilder stammen erkennbar aus einem Herstellerkatalog.

Melden Sie solche Inserate über die Meldefunktion. Wir prüfen jede Meldung.

## Nicht erlaubt

Medizinprodukte ohne Nachweis der Verkehrsfähigkeit, radioaktive Quellen, exportkontrollierte Geräte ohne Bewilligung sowie Geräte ohne Dekontaminationsnachweis.`,
      en: `## Before you buy

* Ask for current photographs of the unit in operation, not catalogue images.
* Ask to see the service report, calibration and decontamination records.
* Clarify which accessories are actually included. On a centrifuge the rotor is often worth more than the instrument.
* Check voltage and supply requirements.

## Warning signs

* Payment is supposed to happen off the platform.
* The price is far below every comparable offer.
* The seller avoids technical questions.
* The photographs are visibly from a manufacturer catalogue.

Report such listings with the report button. We look at every report.

## Not allowed

Medical devices without evidence that they may be placed on the market, radioactive sources, export-controlled equipment without a licence, and anything without a decontamination record.`,
    },
  },
  {
    slug: "agb",
    showInFooter: true,
    title: { de: "Allgemeine Geschäftsbedingungen", en: "Terms and conditions" },
    body: {
      de: `> Platzhaltertext für den Prototyp. Vor einem echten Betrieb ist eine juristische Prüfung nach Schweizer Recht erforderlich.

## 1. Geltungsbereich

refreshLab betreibt einen Marktplatz und vermittelt zwischen anbietenden und kaufenden Personen. Der Kaufvertrag kommt ausschliesslich zwischen diesen Parteien zustande.

## 2. Pflichten der anbietenden Person

Angebote müssen den Zustand wahrheitsgemäss beschreiben. Erforderliche Nachweise, insbesondere Dekontamination, sind beizulegen.

## 3. Gebühren

Je 3 Prozent des Verkaufspreises für die anbietende und die kaufende Person, fällig bei erfolgreichem Verkauf. Der Anteil der anbietenden Person wird von der Auszahlung abgezogen, der Anteil der kaufenden Person zusätzlich zum Kaufpreis berechnet. Nach je 100 abgeschlossenen Transaktionen in derselben Rolle sinkt der Satz um 0,1 Prozentpunkte, höchstens um 0,5 Prozentpunkte. Mit Händlern und Firmen können abweichende Sätze vereinbart werden.

## 4. Auszahlung

Die Auszahlung erfolgt nach bestätigtem Empfang oder nach Ablauf der vereinbarten Frist.

## 5. Haftung

refreshLab haftet nicht für Beschaffenheit, Funktion oder Verkehrsfähigkeit der angebotenen Geräte.`,
      en: `> Placeholder text for the prototype. A legal review under Swiss law is required before real operation.

## 1. Scope

refreshLab operates a marketplace and acts as an intermediary between sellers and buyers. The contract of sale is concluded solely between those parties.

## 2. Seller obligations

Listings must describe the condition truthfully. Required records, in particular decontamination, must be attached.

## 3. Fees

3 percent of the sale price each for seller and buyer, due on a successful sale. The seller's share is deducted from the payout, the buyer's share is charged on top of the purchase price. After every 100 completed transactions in the same role the rate drops by 0.1 percentage points, by at most 0.5 percentage points. Different rates may be agreed with dealers and companies.

## 4. Payout

The payout follows confirmed receipt or the expiry of the agreed period.

## 5. Liability

refreshLab is not liable for the condition, function or marketability of the equipment offered.`,
    },
  },
  {
    slug: "datenschutz",
    showInFooter: true,
    title: { de: "Datenschutz", en: "Privacy" },
    body: {
      de: `> Platzhaltertext für den Prototyp.

## Welche Daten wir bearbeiten

Kontoangaben, Inserate, Nachrichten, Kommentare und Transaktionsdaten. Nachrichten werden gespeichert, damit sie im Streitfall herangezogen werden können.

## Weshalb

Zur Erfüllung des Vertrags, zur Betrugsprävention und zur Erfüllung gesetzlicher Aufbewahrungspflichten.

## Ihre Rechte

Auskunft, Berichtigung und Löschung. Transaktionsunterlagen unterliegen gesetzlichen Aufbewahrungsfristen und können nicht sofort gelöscht werden.

## Hinweis

In diesem Prototyp werden ausschliesslich erfundene Daten verwendet.`,
      en: `> Placeholder text for the prototype.

## What we process

Account details, listings, messages, comments and transaction data. Messages are stored so they can be used in a dispute.

## Why

To perform the contract, to prevent fraud and to meet statutory retention duties.

## Your rights

Access, correction and deletion. Transaction records are subject to statutory retention periods and cannot be deleted immediately.

## Note

This prototype contains invented data only.`,
    },
  },
  {
    slug: "gebrauchte-zentrifuge-kaufen",
    showInFooter: false,
    title: { de: "Ratgeber: Gebrauchte Zentrifuge kaufen", en: "Guide: buying a used centrifuge" },
    body: {
      de: `Eine Zentrifuge ist mechanisch robust und elektronisch überschaubar. Trotzdem entscheiden ein paar Punkte darüber, ob ein Gebrauchtkauf sinnvoll ist.

## Der Rotor ist der halbe Preis

Prüfen Sie, welcher Rotor mitgeliefert wird und wie viele Zyklen er hat. Ausschwingrotoren haben eine begrenzte Lebensdauer, und ein Ersatzrotor kostet schnell mehrere tausend Franken. Ohne passenden Rotor ist ein günstiges Gerät kein günstiges Gerät.

## Kühlung prüfen

Bei gekühlten Modellen ist der Kompressor das teuerste Bauteil. Lassen Sie sich bestätigen, dass die Solltemperatur in der angegebenen Zeit erreicht wird.

## Unwuchterkennung und Deckelverriegelung

Beides ist sicherheitskritisch. Eine Prüfung nach IEC 61010 sollte dokumentiert sein.

## Betriebsstunden einordnen

Unter 2'000 Stunden gilt als wenig, über 10'000 Stunden sollte der Preis das deutlich abbilden.

## Realistische Preisspanne

Ein gekühltes Tischgerät der 5810-R-Klasse liegt gebraucht meist zwischen 38 und 72 Prozent des Neupreises, abhängig von Rotor, Baujahr und Servicehistorie.`,
      en: `A centrifuge is mechanically robust and electronically simple. Even so, a few points decide whether buying used makes sense.

## The rotor is half the price

Check which rotor is included and how many cycles it has. Swing-out rotors have a limited life and a replacement quickly costs several thousand francs. Without the right rotor, a cheap instrument is not cheap.

## Check the cooling

On refrigerated models the compressor is the most expensive part. Ask for confirmation that the set temperature is reached within the specified time.

## Imbalance detection and lid interlock

Both are safety critical. A test to IEC 61010 should be documented.

## Put operating hours in context

Under 2,000 hours counts as low. Above 10,000 hours the price should clearly reflect it.

## Realistic price range

A refrigerated benchtop unit in the 5810 R class usually sells for 38 to 72 percent of its list price, depending on rotor, year and service history.`,
    },
  },
];
