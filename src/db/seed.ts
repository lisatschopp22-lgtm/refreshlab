import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./env";
import * as s from "./schema";
import { categories as categorySeed, manufacturers as manufacturerSeed } from "./seed/catalogue-data";
import { models as modelSeed } from "./seed/model-data";
import { organisations as orgSeed, people } from "./seed/people-data";
import { contentPages } from "./seed/content-data";
import { placeholderSvg, uploadSvg, type Variant } from "./seed/images";
import { uniqueSlug } from "@/domain/slug";
import { calculateFee, defaultFeeRule } from "@/domain/fees";
import { defaultFlags } from "@/domain/flags";

// ---------------------------------------------------------------- determinism
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260919);
const pickOne = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
const pickSome = <T,>(items: readonly T[], count: number): T[] => {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
  return out;
};
const intBetween = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

const NOW_YEAR = 2026;
const args = process.argv.slice(2);
const listingTarget = Number(args[args.indexOf("--listings") + 1]) || 150;

// ------------------------------------------------------------------- pricing
const conditionFactor = { new: 1, like_new: 0.9, good: 0.78, fair: 0.6, for_parts: 0.24 } as const;
type Cond = keyof typeof conditionFactor;

function priceCentsFor(listPriceChf: number, year: number, condition: Cond) {
  const age = Math.max(0, NOW_YEAR - year);
  const depreciation = Math.max(0.12, Math.pow(0.9, age));
  const jitter = 0.92 + rand() * 0.16;
  const chf = listPriceChf * depreciation * conditionFactor[condition] * jitter;
  return Math.max(15_000, Math.round(chf / 50) * 50 * 100);
}

const cities: { city: string; country: string }[] = [
  { city: "Zürich", country: "CH" }, { city: "Basel", country: "CH" }, { city: "Bern", country: "CH" },
  { city: "Lausanne", country: "CH" }, { city: "Genf", country: "CH" }, { city: "St. Gallen", country: "CH" },
  { city: "Luzern", country: "CH" }, { city: "Winterthur", country: "CH" }, { city: "Lugano", country: "CH" },
  { city: "Freiburg im Breisgau", country: "DE" }, { city: "München", country: "DE" },
  { city: "Konstanz", country: "DE" }, { city: "Heidelberg", country: "DE" },
  { city: "Wien", country: "AT" }, { city: "Innsbruck", country: "AT" },
  { city: "Lyon", country: "FR" }, { city: "Strassburg", country: "FR" }, { city: "Mailand", country: "IT" },
];

const conditionNotes: Record<Cond, string[]> = {
  new: ["Originalverpackt, nie in Betrieb genommen. Projekt wurde vor Inbetriebnahme eingestellt."],
  like_new: [
    "Technisch und optisch neuwertig, unter 200 Betriebsstunden. Vollständige Dokumentation vorhanden.",
    "Gerät stand in einem Reinraum und wurde kaum genutzt. Keine Gebrauchsspuren.",
  ],
  good: [
    "Technisch geprüft, leichte Gebrauchsspuren am Gehäuse. Funktion vollständig gegeben.",
    "Regelmässig gewartet, letzter Service dokumentiert. Übliche Kratzer an der Front.",
    "Aus laufendem Laborbetrieb, ohne Beanstandung. Kleinere optische Mängel an der Rückseite.",
  ],
  fair: [
    "Voll funktionsfähig, deutliche Gebrauchsspuren. Display an einer Ecke verfärbt.",
    "Funktioniert einwandfrei, Gehäuse mit Kratzern und einer Delle. Preis entsprechend angepasst.",
  ],
  for_parts: [
    "Defekt: Steuerplatine reagiert nicht. Mechanik und Rotor in gutem Zustand, als Ersatzteilspender geeignet.",
    "Kompressor defekt, übrige Baugruppen in Ordnung. Verkauf ausdrücklich als Ersatzteilträger.",
  ],
};

const scopeSnippets = [
  "Inklusive Netzkabel, Bedienungsanleitung und aktuellem Serviceberichten.",
  "Lieferumfang: Gerät, Zubehörsatz, Originalhandbuch als PDF.",
  "Mit Originalverpackung, Transportsicherung und Kurzanleitung.",
  "Inklusive Ersatzteilen aus Restbestand und Wartungsprotokoll der letzten drei Jahre.",
];

async function main() {
  const client = postgres(DATABASE_URL, { max: 4 });
  const db = drizzle(client, { schema: s, casing: "snake_case" });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("→ clearing existing data");
  await client.unsafe(`
    truncate table
      audit_log, reports, outbox, payment_events, orders, offers, seller_accounts,
      messages, conversation_participants, conversations, blocks, comments,
      saved_searches, watchlist, listing_attachments, listing_images, listings,
      equipment_models, categories, manufacturers,
      organisation_members, organisations, content_pages, settings
    restart identity cascade;
  `);
  await client.unsafe(`delete from auth.users;`);
  const existingObjects = await client.unsafe(`select name from storage.objects where bucket_id = 'images' limit 1;`);
  if (existingObjects.length) {
    await client.unsafe(`delete from storage.objects where bucket_id in ('images','attachments');`);
  }

  // ------------------------------------------------------------------ people
  console.log(`→ creating ${people.length} accounts`);
  const profileIdByEmail = new Map<string, string>();
  for (const person of people) {
    const { data, error } = await admin.auth.admin.createUser({
      email: person.email,
      password: "refreshlab",
      email_confirm: true,
      user_metadata: { display_name: person.displayName, role: person.role, locale: "de" },
    });
    if (error || !data.user) throw new Error(`createUser ${person.email}: ${error?.message}`);
    profileIdByEmail.set(person.email, data.user.id);

    await db
      .update(s.profiles)
      .set({
        displayName: person.displayName,
        role: person.role,
        city: person.city,
        country: person.country,
        bio: person.bio ?? null,
        verifiedAt: person.verified ? daysAgo(intBetween(30, 400)) : null,
      })
      .where(sql`${s.profiles.id} = ${data.user.id}`);
  }

  // ----------------------------------------------------------- organisations
  console.log("→ creating organisations");
  const orgIdByKey = new Map<string, string>();
  for (const org of orgSeed) {
    const [row] = await db
      .insert(s.organisations)
      .values({
        name: org.name,
        slug: org.slug,
        type: org.type,
        about: org.about,
        website: org.website,
        city: org.city,
        country: org.country,
        verifications: org.verifications,
        verifiedAt: org.verified ? daysAgo(intBetween(60, 500)) : null,
      })
      .returning({ id: s.organisations.id });
    orgIdByKey.set(org.key, row!.id);
  }
  for (const person of people) {
    if (!person.org) continue;
    await db.insert(s.organisationMembers).values({
      organisationId: orgIdByKey.get(person.org)!,
      profileId: profileIdByEmail.get(person.email)!,
      role: person.orgRole ?? "member",
    });
  }

  // --------------------------------------------------------------- catalogue
  console.log("→ creating catalogue");
  const manufacturerIdBySlug = new Map<string, string>();
  for (const m of manufacturerSeed) {
    const [row] = await db
      .insert(s.manufacturers)
      .values({ name: m.name, slug: m.slug, country: m.country, website: m.website })
      .returning({ id: s.manufacturers.id });
    manufacturerIdBySlug.set(m.slug, row!.id);
  }

  const categoryIdBySlug = new Map<string, string>();
  const categoryHue = new Map<string, number>();
  categorySeed.forEach((c, index) => categoryHue.set(c.slug, Math.round((index * 360) / categorySeed.length)));
  for (const [index, c] of categorySeed.entries()) {
    const [row] = await db
      .insert(s.categories)
      .values({
        name: c.name,
        intro: c.intro,
        slug: c.slug,
        icon: c.icon,
        sortOrder: index,
        specSchema: c.specs,
      })
      .returning({ id: s.categories.id });
    categoryIdBySlug.set(c.slug, row!.id);
  }

  console.log(`→ creating ${modelSeed.length} equipment models and uploading images`);
  const modelRows: {
    id: string;
    slug: string;
    name: string;
    manufacturerName: string;
    category: string;
    listPriceChf: number;
    year: number;
    imagePath: string;
  }[] = [];
  const modelSlugs = new Set<string>();

  for (const [index, m] of modelSeed.entries()) {
    const manufacturer = manufacturerSeed.find((x) => x.slug === m.manufacturer)!;
    const category = categorySeed.find((x) => x.slug === m.category)!;
    const slug = uniqueSlug(`${manufacturer.name} ${m.name}`, modelSlugs);
    const recordNumber = `RL-EQ-${String(4000 + index).padStart(6, "0")}`;
    const hue = categoryHue.get(m.category)!;

    const paths: Record<Variant, string> = {
      front: `models/${slug}-front.svg`,
      detail: `models/${slug}-detail.svg`,
      plate: `models/${slug}-plate.svg`,
    };
    for (const variant of ["front", "detail", "plate"] as Variant[]) {
      await uploadSvg(
        paths[variant],
        placeholderSvg({
          icon: category.icon,
          hue,
          manufacturer: manufacturer.name,
          model: m.name,
          categoryLabel: category.name.de,
          variant,
          reference: recordNumber,
        }),
      );
    }

    const [row] = await db
      .insert(s.equipmentModels)
      .values({
        recordNumber,
        revision: intBetween(1, 9),
        manufacturerId: manufacturerIdBySlug.get(m.manufacturer)!,
        categoryId: categoryIdBySlug.get(m.category)!,
        name: m.name,
        slug,
        summary: m.summary,
        description: {
          de: `${m.summary.de} Das Modell wurde ${m.year} eingeführt und ist im Sekundärmarkt gut verfügbar. Ersatzteile und Zubehör sind über den Hersteller sowie über spezialisierte Aufbereitungsbetriebe erhältlich.`,
          en: `${m.summary.en} The model was introduced in ${m.year} and is readily available on the secondary market. Spare parts and accessories are available from the manufacturer and from specialised refurbishers.`,
        },
        specs: m.specs,
        accessories: m.accessories ?? [],
        imagePath: paths.front,
        yearIntroduced: m.year,
        discontinued: m.discontinued ?? false,
        manufacturerVerifiedAt: chance(0.55) ? daysAgo(intBetween(20, 300)) : null,
        status: "published",
      })
      .returning({ id: s.equipmentModels.id });

    modelRows.push({
      id: row!.id,
      slug,
      name: m.name,
      manufacturerName: manufacturer.name,
      category: m.category,
      listPriceChf: m.listPriceChf,
      year: m.year,
      imagePath: paths.front,
    });
  }

  // ---------------------------------------------------------------- listings
  console.log(`→ creating ${listingTarget} listings`);
  const sellerPool = people.filter((p) => p.role === "user");
  const listingSlugs = new Set<string>();
  const listings: {
    id: string;
    sellerId: string;
    sellerOrgId: string | null;
    modelId: string;
    priceCents: number;
    status: string;
    title: string;
  }[] = [];

  const statusPlan: Cond[] = [];
  for (let i = 0; i < listingTarget; i += 1) {
    statusPlan.push(
      pickOne(["good", "good", "good", "like_new", "like_new", "fair", "new", "for_parts"] as const),
    );
  }

  for (let i = 0; i < listingTarget; i += 1) {
    const model = modelRows[i % modelRows.length]!;
    const condition = statusPlan[i]!;
    const seller = pickOne(sellerPool);
    const sellerId = profileIdByEmail.get(seller.email)!;
    const sellerOrgId = seller.org ? orgIdByKey.get(seller.org)! : null;
    const year = Math.max(model.year, Math.min(NOW_YEAR - 1, model.year + intBetween(0, 9)));
    const priceCents = priceCentsFor(model.listPriceChf, year, condition);
    const place = seller.org
      ? { city: seller.city, country: seller.country }
      : pickOne(cities);

    // Most listings are live; the rest cover every other state so the account
    // area and the admin queue have something real to show.
    const status =
      i % 25 === 3 ? "draft"
      : i % 25 === 7 ? "pending_review"
      : i % 25 === 11 ? "reserved"
      : i % 25 === 15 ? "sold"
      : i % 25 === 19 ? "withdrawn"
      : "active";

    const rotorSuffix = model.category === "zentrifugen" && chance(0.5) ? " · A-4-81 Rotor" : "";
    const title = `${model.manufacturerName} ${model.name}${rotorSuffix}`;
    const slug = uniqueSlug(`${title}-${year}`, listingSlugs);
    const publishedAt = status === "draft" || status === "pending_review" ? null : daysAgo(intBetween(1, 150));
    const inspected = chance(0.28) && condition !== "for_parts";

    const [row] = await db
      .insert(s.listings)
      .values({
        reference: `RL-L-${String(10_000 + i).padStart(6, "0")}`,
        sellerProfileId: sellerId,
        sellerOrgId,
        modelId: model.id,
        title,
        slug,
        description: `${pickOne(scopeSnippets)} ${
          chance(0.5)
            ? "Das Gerät kann nach Absprache vor Ort besichtigt und in Betrieb gesehen werden."
            : "Abholung bevorzugt, Versand auf Kosten der kaufenden Person möglich."
        }`,
        scopeOfDelivery: pickOne(scopeSnippets),
        condition,
        conditionNotes: pickOne(conditionNotes[condition]),
        year,
        operatingHours: condition === "new" ? 0 : intBetween(120, 14_000),
        serialSuffix: String(intBetween(1000, 9999)),
        priceCents,
        currency: place.country === "CH" ? "CHF" : chance(0.5) ? "EUR" : "CHF",
        minPriceCents: chance(0.4) ? Math.round(priceCents * 0.85) : null,
        negotiable: pickOne(["both", "both", "fixed", "offer"] as const),
        locationCity: place.city,
        locationCountry: place.country,
        warrantyMonths: seller.org === "biorefurb" ? 12 : chance(0.25) ? 6 : 0,
        status: status as typeof s.listings.$inferInsert.status,
        inspectedAt: inspected ? daysAgo(intBetween(5, 90)) : null,
        verifiedAt: inspected && chance(0.8) ? daysAgo(intBetween(5, 60)) : null,
        featuredUntil: chance(0.08) ? new Date(Date.now() + 14 * 86_400_000) : null,
        publishedAt,
        viewCount: intBetween(3, 900),
      })
      .returning({ id: s.listings.id });

    listings.push({
      id: row!.id,
      sellerId,
      sellerOrgId,
      modelId: model.id,
      priceCents,
      status,
      title,
    });

    const imageCount = intBetween(2, 3);
    const variants: Variant[] = (["front", "detail", "plate"] as Variant[]).slice(0, imageCount);
    await db.insert(s.listingImages).values(
      variants.map((variant, order) => ({
        listingId: row!.id,
        storagePath: `models/${model.slug}-${variant}.svg`,
        alt: `${title} – ${variant === "front" ? "Gesamtansicht" : variant === "detail" ? "Detailansicht" : "Typenschild"}`,
        sortOrder: order,
      })),
    );

    if (chance(0.45)) {
      await db.insert(s.listingAttachments).values({
        listingId: row!.id,
        storagePath: `attachments/${slug}-service.pdf`,
        filename: "servicebericht-2026.pdf",
        kind: pickOne(["service_report", "manual", "certificate", "decontamination"] as const),
      });
    }
  }

  const activeListings = listings.filter((l) => l.status === "active");

  // ---------------------------------------------------------------- comments
  console.log("→ creating comments");
  const commentBodies = [
    "Läuft dieses Modell auch mit 230 V ohne Adapter?",
    "Wir betreiben zwei davon seit sechs Jahren. Die Deckelverriegelung ist der übliche Schwachpunkt, Ersatzteil ist aber günstig.",
    "Ist die Software-Lizenz übertragbar, oder muss sie neu gekauft werden?",
    "Achtung beim Rotor: Die älteren Chargen haben eine kürzere Freigabedauer. Bitte Zyklenzahl erfragen.",
    "Hat jemand Erfahrung mit dem Nachfolgemodell? Lohnt sich der Aufpreis?",
    "Die technischen Daten hier stimmen mit unserem Handbuch überein, gute Arbeit.",
    "Wir haben eines davon aufbereitet gekauft. Nach zwei Jahren keine Probleme.",
    "Wie laut ist das Gerät im Betrieb? Wir hätten es im Schreibbereich stehen.",
  ];
  const commenterIds = people.filter((p) => p.role === "user").map((p) => profileIdByEmail.get(p.email)!);
  for (const model of pickSome(modelRows, Math.min(30, modelRows.length))) {
    const count = intBetween(1, 4);
    for (let i = 0; i < count; i += 1) {
      const [parent] = await db
        .insert(s.comments)
        .values({
          authorId: pickOne(commenterIds),
          targetType: "model",
          targetId: model.id,
          body: pickOne(commentBodies),
          createdAt: daysAgo(intBetween(1, 200)),
        })
        .returning({ id: s.comments.id });
      if (chance(0.4)) {
        await db.insert(s.comments).values({
          authorId: pickOne(commenterIds),
          targetType: "model",
          targetId: model.id,
          parentId: parent!.id,
          body: pickOne([
            "Ja, das lässt sich bestätigen. Wir haben das gleiche Verhalten.",
            "Die Lizenz ist an das Gerät gebunden, nicht an die Institution. Beim Hersteller nachfragen.",
            "Danke für den Hinweis, wir haben die Angabe im Datensatz korrigiert.",
          ]),
          createdAt: daysAgo(intBetween(1, 100)),
        });
      }
    }
  }
  for (const listing of pickSome(activeListings, Math.min(25, activeListings.length))) {
    await db.insert(s.comments).values({
      authorId: pickOne(commenterIds),
      targetType: "listing",
      targetId: listing.id,
      body: pickOne([
        "Ist der Rotor im Preis enthalten?",
        "Kann das Gerät vor dem Kauf in Betrieb besichtigt werden?",
        "Gibt es einen aktuellen Kalibrierschein?",
        "Wäre ein Versand nach Lausanne möglich und was würde der kosten?",
      ]),
      createdAt: daysAgo(intBetween(1, 60)),
    });
  }

  console.log("✓ base data written");
  return { db, client, profileIdByEmail, orgIdByKey, listings, activeListings, commenterIds };
}

// ------------------------------------------------- conversations, offers, orders
async function transactional(ctx: Awaited<ReturnType<typeof main>>) {
  const { db, profileIdByEmail, listings, activeListings } = ctx;
  const anna = profileIdByEmail.get("anna.buyer@refreshlab.local")!;
  const beat = profileIdByEmail.get("beat.seller@refreshlab.local")!;
  const lea = profileIdByEmail.get("lab@lifescience-basel.local")!;
  const jonas = profileIdByEmail.get("dealer@biorefurb.local")!;

  console.log("→ creating conversations and messages");
  const conversationStarters = [
    ["Guten Tag. Ist eine Lieferung nach Lausanne möglich und könnten Sie das Gerät vorab dekontaminieren?",
     "Ja. Unser Logistikpartner offeriert CHF 480. Dekontamination mit Zertifikat kostet CHF 190.",
     "Das passt. Können Sie mir das als aktualisiertes Angebot schicken?"],
    ["Hallo, gibt es zu diesem Gerät einen aktuellen Servicebericht?",
     "Ja, der letzte Service war im März 2026. Ich lade den Bericht gleich hoch.",
     "Perfekt, danke."],
    ["Wäre eine Besichtigung nächste Woche möglich?",
     "Gerne, Dienstag oder Donnerstag zwischen 9 und 16 Uhr.",
     "Dienstag 10 Uhr passt uns."],
  ];

  const conversationTargets = activeListings.slice(0, 8);
  for (const [index, listing] of conversationTargets.entries()) {
    const buyer = index % 3 === 0 ? anna : index % 3 === 1 ? beat : lea;
    if (buyer === listing.sellerId) continue;
    const thread = conversationStarters[index % conversationStarters.length]!;

    const [conversation] = await db
      .insert(s.conversations)
      .values({
        listingId: listing.id,
        subject: listing.title,
        createdBy: buyer,
        lastMessageAt: daysAgo(intBetween(0, 12)),
      })
      .returning({ id: s.conversations.id });

    await db.insert(s.conversationParticipants).values([
      { conversationId: conversation!.id, profileId: buyer, lastReadAt: daysAgo(1) },
      { conversationId: conversation!.id, profileId: listing.sellerId, lastReadAt: index % 2 === 0 ? daysAgo(2) : null },
    ]);

    for (const [messageIndex, body] of thread.entries()) {
      await db.insert(s.messages).values({
        conversationId: conversation!.id,
        senderId: messageIndex % 2 === 0 ? buyer : listing.sellerId,
        body,
        createdAt: daysAgo(12 - messageIndex * 2),
      });
    }
  }

  console.log("→ creating offers");
  const offerStatuses = ["open", "countered", "accepted", "rejected", "expired", "withdrawn"] as const;
  const offerTargets = activeListings.filter((l) => l.sellerId !== anna).slice(0, 18);
  for (const [index, listing] of offerTargets.entries()) {
    const status = offerStatuses[index % offerStatuses.length]!;
    const amount = Math.round(listing.priceCents * (0.8 + rand() * 0.15));
    await db.insert(s.offers).values({
      listingId: listing.id,
      buyerId: anna,
      sellerId: listing.sellerId,
      amountCents: amount,
      message: "Wir hätten Interesse, das Budget ist allerdings begrenzt. Wäre dieser Preis inklusive Zubehör möglich?",
      status,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      respondedAt: status === "open" ? null : daysAgo(intBetween(1, 10)),
      createdAt: daysAgo(intBetween(2, 20)),
    });
  }

  console.log("→ creating orders in every state");
  const orderStates = [
    "pending_payment", "paid", "shipped", "delivered", "completed",
    "cancelled", "disputed", "refunded",
  ] as const;
  const soldListings = listings.filter((l) => l.status === "sold" || l.status === "reserved");
  const orderPool = soldListings.length >= 8 ? soldListings : activeListings;

  for (const [index, state] of orderStates.entries()) {
    const listing = orderPool[index % orderPool.length]!;
    const buyer = listing.sellerId === anna ? lea : anna;
    const amount = listing.priceCents;
    const fee = calculateFee(amount, "CHF").cents;
    const created = daysAgo(30 - index * 2);

    const [order] = await db
      .insert(s.orders)
      .values({
        reference: `RL-2026-${String(1840 + index).padStart(4, "0")}`,
        listingId: listing.id,
        buyerId: buyer,
        sellerId: listing.sellerId,
        sellerOrgId: listing.sellerOrgId,
        amountCents: amount,
        shippingCents: chance(0.6) ? 48_000 : 0,
        feeCents: fee,
        status: state,
        paymentMethod: amount > 1_000_000 ? "bank_transfer" : "card",
        paymentProvider: "fake",
        providerRef: `fake_${index}_${Math.round(rand() * 1e6)}`,
        paidAt: ["paid", "shipped", "delivered", "completed", "disputed", "refunded"].includes(state)
          ? daysAgo(28 - index * 2) : null,
        shippedAt: ["shipped", "delivered", "completed", "disputed"].includes(state) ? daysAgo(20 - index) : null,
        deliveredAt: ["delivered", "completed", "disputed"].includes(state) ? daysAgo(14 - index) : null,
        completedAt: state === "completed" ? daysAgo(10) : null,
        cancelledAt: state === "cancelled" ? daysAgo(18) : null,
        payoutReleasedAt: state === "completed" ? daysAgo(9) : null,
        disputeReason: state === "disputed"
          ? "Das Gerät weicht von der Beschreibung ab: Der Rotor fehlt, obwohl er im Lieferumfang aufgeführt war."
          : null,
        disputeOpenedAt: state === "disputed" ? daysAgo(6) : null,
        refundedCents: state === "refunded" ? amount : 0,
        createdAt: created,
      })
      .returning({ id: s.orders.id });

    await db.insert(s.paymentEvents).values({
      orderId: order!.id,
      provider: "fake",
      type: "checkout.created",
      payload: { amountCents: amount, currency: "CHF" },
      idempotencyKey: `seed-${order!.id}-created`,
    });
    if (["paid", "shipped", "delivered", "completed", "disputed", "refunded"].includes(state)) {
      await db.insert(s.paymentEvents).values({
        orderId: order!.id,
        provider: "fake",
        type: "payment.succeeded",
        payload: { amountCents: amount, currency: "CHF" },
        idempotencyKey: `seed-${order!.id}-paid`,
      });
    }
  }

  console.log("→ creating reports, watchlist and saved searches");
  const reportTargets = activeListings.slice(0, 4);
  const reasons = [
    { reason: "price_suspicious", detail: "Preis liegt deutlich unter allen vergleichbaren Angeboten." },
    { reason: "off_platform", detail: "Anbieter fordert Zahlung per Direktüberweisung ausserhalb der Plattform." },
    { reason: "duplicate", detail: "Gleiche Bilder wie ein anderes Inserat desselben Anbieters." },
    { reason: "missing_documents", detail: "Kein Dekontaminationsnachweis, obwohl es ein Zellkulturgerät ist." },
  ];
  for (const [index, listing] of reportTargets.entries()) {
    const r = reasons[index]!;
    await db.insert(s.reports).values({
      reporterId: index % 2 === 0 ? anna : jonas,
      targetType: "listing",
      targetId: listing.id,
      reason: r.reason,
      detail: r.detail,
      riskScore: { score: [92, 88, 64, 41][index]!, signals: [r.reason] },
      status: index === 3 ? "resolved" : "open",
      createdAt: daysAgo(intBetween(1, 8)),
    });
  }

  for (const listing of activeListings.slice(0, 6)) {
    await db.insert(s.watchlist).values({ profileId: anna, listingId: listing.id });
  }
  await db.insert(s.savedSearches).values([
    { profileId: anna, name: "Gekühlte Zentrifugen bis CHF 12'000",
      query: { q: "zentrifuge", category: "zentrifugen", maxPrice: 1_200_000, condition: ["good", "like_new"] } },
    { profileId: anna, name: "HPLC in der Schweiz",
      query: { q: "hplc", category: "chromatographie", country: ["CH"] } },
  ]);

  console.log("→ creating content pages and settings");
  await db.insert(s.contentPages).values(
    contentPages.map((page) => ({
      slug: page.slug,
      title: page.title,
      body: page.body,
      published: true,
      showInFooter: page.showInFooter,
    })),
  );
  await db.insert(s.settings).values([
    { key: "fee_rule", value: defaultFeeRule },
    { key: "flags", value: defaultFlags },
  ]);
}

main()
  .then(async (ctx) => {
    await transactional(ctx);
    const counts = await ctx.client.unsafe(`
      select 'listings' as t, count(*)::int from listings
      union all select 'models', count(*)::int from equipment_models
      union all select 'profiles', count(*)::int from profiles
      union all select 'comments', count(*)::int from comments
      union all select 'orders', count(*)::int from orders
      union all select 'offers', count(*)::int from offers
      union all select 'messages', count(*)::int from messages;
    `);
    console.table(counts);
    await ctx.client.end();
    console.log("✓ seed complete — sign in with any seeded address, password: refreshlab");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
