import { describe, expect, it } from "vitest";
import { categories, consumableCategories, manufacturers } from "@/db/seed/catalogue-data";
import { models } from "@/db/seed/model-data";

const allCategorySlugs = [
  ...categories.flatMap((c) => [c.slug, ...c.children.map((child) => child.slug)]),
  ...consumableCategories.flatMap((c) => [c.slug, ...c.children.map((child) => child.slug)]),
];

describe("catalogue seed data", () => {
  // One table holds every category, matched by slug when the catalogue is synced.
  it("gives every category and device type a unique slug", () => {
    const duplicates = allCategorySlugs.filter((slug, index) => allCategorySlugs.indexOf(slug) !== index);
    expect(duplicates).toEqual([]);
  });

  it("gives every manufacturer a unique slug and name", () => {
    const slugs = manufacturers.map((m) => m.slug);
    const names = manufacturers.map((m) => m.name.toLowerCase());
    expect(slugs.filter((slug, index) => slugs.indexOf(slug) !== index)).toEqual([]);
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });

  it("files every model under an existing category, device type and manufacturer", () => {
    for (const model of models) {
      const category = categories.find((c) => c.slug === model.category);
      expect(category, `${model.name}: category ${model.category}`).toBeTruthy();
      if (model.sub) {
        expect(category!.children.map((c) => c.slug), `${model.name}: device type ${model.sub}`).toContain(model.sub);
      }
      expect(manufacturers.some((m) => m.slug === model.manufacturer), `${model.name}: ${model.manufacturer}`).toBe(true);
    }
  });

  it("keeps chemicals out of the consumables", () => {
    const names = consumableCategories.flatMap((c) => [c.name.de, ...c.children.map((child) => child.name.de)]);
    // Reagent reservoirs, test tubes and chemical-resistant gloves are labware, not substances.
    const substances = names.filter((name) => !/handschuh/i.test(name) && /chemikal|reagenzien|lösungsmittel|pufferlösung/i.test(name));
    expect(substances).toEqual([]);
  });

  it("only links to manufacturers over https", () => {
    const insecure = manufacturers.filter((m) => m.website && !m.website.startsWith("https://"));
    expect(insecure).toEqual([]);
  });
});
