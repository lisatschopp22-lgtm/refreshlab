export type PersonSeed = {
  email: string;
  displayName: string;
  role: "user" | "admin";
  city: string;
  country: string;
  bio?: string;
  verified?: boolean;
  org?: "biorefurb" | "lifescience" | "epfl";
  orgRole?: "owner" | "member";
};

/** Password for every seeded account is `refreshlab`. */
export const people: PersonSeed[] = [
  { email: "admin@refreshlab.local", displayName: "Admin refreshLab", role: "admin", city: "Zürich", country: "CH", verified: true,
    bio: "Plattformadministration und Moderation." },
  { email: "moderation@refreshlab.local", displayName: "Miriam Moderation", role: "admin", city: "Bern", country: "CH", verified: true,
    bio: "Moderation, Streitfälle und Gerätedatenbank." },

  { email: "anna.buyer@refreshlab.local", displayName: "Anna Iten", role: "user", city: "Lausanne", country: "CH", verified: true,
    bio: "Doktorandin, Bioengineering. Kauft gebrauchte Geräte für ein neues Labor." },
  { email: "beat.seller@refreshlab.local", displayName: "Beat Hunziker", role: "user", city: "Luzern", country: "CH", verified: true,
    bio: "Laborleiter eines kleinen Auftragslabors. Verkauft regelmässig Überbestände." },
  { email: "dealer@biorefurb.local", displayName: "Jonas Fischer", role: "user", city: "Freiburg im Breisgau", country: "DE", verified: true,
    org: "biorefurb", orgRole: "owner", bio: "Geschäftsführer BioRefurb GmbH, Aufbereitung von Life-Science-Geräten." },
  { email: "lab@lifescience-basel.local", displayName: "Lea Moser", role: "user", city: "Basel", country: "CH", verified: true,
    org: "lifescience", orgRole: "owner", bio: "Head of Operations, LifeScience Basel AG." },
  { email: "epfl@refreshlab.local", displayName: "Dr. Antoine Meier", role: "user", city: "Lausanne", country: "CH", verified: true,
    org: "epfl", orgRole: "owner", bio: "Facility Manager, Bioengineering." },

  { email: "sara.keller@refreshlab.local", displayName: "Sara Keller", role: "user", city: "Basel", country: "CH", verified: true, org: "lifescience", orgRole: "member" },
  { email: "tobias.brunner@refreshlab.local", displayName: "Tobias Brunner", role: "user", city: "Freiburg im Breisgau", country: "DE", org: "biorefurb", orgRole: "member" },
  { email: "nadia.rossi@refreshlab.local", displayName: "Nadia Rossi", role: "user", city: "Lugano", country: "CH", verified: true },
  { email: "philipp.weber@refreshlab.local", displayName: "Philipp Weber", role: "user", city: "St. Gallen", country: "CH" },
  { email: "claire.dubois@refreshlab.local", displayName: "Claire Dubois", role: "user", city: "Genf", country: "CH", verified: true },
  { email: "martin.graf@refreshlab.local", displayName: "Martin Graf", role: "user", city: "Winterthur", country: "CH" },
  { email: "elena.schmid@refreshlab.local", displayName: "Elena Schmid", role: "user", city: "Wien", country: "AT", verified: true },
  { email: "lukas.baumann@refreshlab.local", displayName: "Lukas Baumann", role: "user", city: "München", country: "DE" },
  { email: "ines.fernandez@refreshlab.local", displayName: "Inés Fernández", role: "user", city: "Mailand", country: "IT" },
  { email: "jan.novak@refreshlab.local", displayName: "Jan Novák", role: "user", city: "Konstanz", country: "DE", verified: true },
  { email: "marie.leroy@refreshlab.local", displayName: "Marie Leroy", role: "user", city: "Lyon", country: "FR" },
  { email: "samuel.frei@refreshlab.local", displayName: "Samuel Frei", role: "user", city: "Bern", country: "CH", verified: true },
  { email: "rahel.eggli@refreshlab.local", displayName: "Rahel Eggli", role: "user", city: "Zürich", country: "CH" },
  { email: "david.perez@refreshlab.local", displayName: "David Pérez", role: "user", city: "Barcelona", country: "ES" },
  { email: "nora.hofer@refreshlab.local", displayName: "Nora Hofer", role: "user", city: "Innsbruck", country: "AT" },
];

export const organisations = [
  {
    key: "biorefurb" as const,
    name: "BioRefurb GmbH",
    slug: "biorefurb",
    type: "dealer" as const,
    city: "Freiburg im Breisgau",
    country: "DE",
    website: "https://biorefurb.example",
    about:
      "Aufbereitung und Service für Life-Science-Geräte. 40-Punkte-Funktionsprüfung, Dekontamination, 12 Monate Garantie und Installation in der DACH-Region.",
    verified: true,
    verifications: ["Handelsregister geprüft", "Bankkonto bestätigt", "Werkstatt besichtigt 2025", "Dekontaminationsprozess dokumentiert"],
  },
  {
    key: "lifescience" as const,
    name: "LifeScience Basel AG",
    slug: "lifescience-basel",
    type: "company" as const,
    city: "Basel",
    country: "CH",
    website: "https://lifescience-basel.example",
    about:
      "Auftragslabor für Analytik und Zellkultur. Wir geben regelmässig Geräte aus abgeschlossenen Projekten weiter, vollständig dokumentiert und funktionsgeprüft.",
    verified: true,
    verifications: ["Unternehmen geprüft", "Bankkonto bestätigt", "Laborstandort vor Ort geprüft 2025"],
  },
  {
    key: "epfl" as const,
    name: "EPFL Bioengineering",
    slug: "epfl-bioengineering",
    type: "university" as const,
    city: "Lausanne",
    country: "CH",
    website: "https://epfl.example",
    about:
      "Institutsinfrastruktur Bioengineering. Wir beschaffen gebraucht, wo es fachlich vertretbar ist, und geben ausgesonderte Geräte strukturiert weiter.",
    verified: true,
    verifications: ["Institution geprüft", "Beschaffungsfreigabe hinterlegt"],
  },
];
