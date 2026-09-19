import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/domain/slug";

describe("slugify", () => {
  it("transliterates German umlauts rather than dropping them", () => {
    expect(slugify("Büchi Rotavapor")).toBe("buechi-rotavapor");
    expect(slugify("Grösse & Länge")).toBe("groesse-laenge");
  });

  it("keeps model identifiers readable", () => {
    expect(slugify("Centrifuge 5810 R · A-4-81 Rotor")).toBe("centrifuge-5810-r-a-4-81-rotor");
  });

  it("de-duplicates", () => {
    const taken = new Set<string>();
    expect(uniqueSlug("Sorvall ST 8R", taken)).toBe("sorvall-st-8r");
    expect(uniqueSlug("Sorvall ST 8R", taken)).toBe("sorvall-st-8r-2");
    expect(uniqueSlug("Sorvall ST 8R", taken)).toBe("sorvall-st-8r-3");
  });
});
