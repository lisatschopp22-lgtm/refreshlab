/** Seeded accounts. Password is the same for all of them. */
export const personas = {
  admin: { email: "admin@refreshlab.local", name: "Admin refreshLab", sellsAs: "Admin refreshLab" },
  buyer: { email: "anna.buyer@refreshlab.local", name: "Anna Iten", sellsAs: "Anna Iten" },
  // A private seller appears under their own name.
  seller: { email: "beat.seller@refreshlab.local", name: "Beat Hunziker", sellsAs: "Beat Hunziker" },
  // Members of an organisation appear under the organisation's name.
  dealer: { email: "dealer@biorefurb.local", name: "Jonas Fischer", sellsAs: "BioRefurb GmbH" },
  lab: { email: "lab@lifescience-basel.local", name: "Lea Moser", sellsAs: "LifeScience Basel AG" },
} as const;

export const password = "refreshlab";
