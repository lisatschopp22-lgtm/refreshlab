const map: Record<string, string> = {
  ä: "ae", ö: "oe", ü: "ue", Ä: "ae", Ö: "oe", Ü: "ue", ß: "ss",
  à: "a", á: "a", â: "a", è: "e", é: "e", ê: "e", ë: "e",
  ì: "i", í: "i", î: "i", ò: "o", ó: "o", ô: "o", ù: "u", ú: "u", û: "u",
  ç: "c", ñ: "n", å: "a", ø: "o", æ: "ae",
};

export function slugify(input: string): string {
  return input
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Appends -2, -3 … until the slug is unique within `taken`. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugify(base) || "item";
  if (!taken.has(root)) {
    taken.add(root);
    return root;
  }
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  const result = `${root}-${n}`;
  taken.add(result);
  return result;
}
