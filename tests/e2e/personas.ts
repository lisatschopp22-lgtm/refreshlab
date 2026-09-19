/** Seeded accounts. Password is the same for all of them. */
export const personas = {
  admin: { email: "admin@refreshlab.local", name: "Admin refreshLab" },
  buyer: { email: "anna.buyer@refreshlab.local", name: "Anna Iten" },
  seller: { email: "beat.seller@refreshlab.local", name: "Beat Hunziker" },
  dealer: { email: "dealer@biorefurb.local", name: "Jonas Fischer" },
  lab: { email: "lab@lifescience-basel.local", name: "Lea Moser" },
} as const;

export const password = "refreshlab";
