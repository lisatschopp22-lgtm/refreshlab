import { describe, expect, it } from "vitest";
import { hasAnyFilter, paramsExcept, parseSearchParams, toggledHref, withoutParams } from "@/domain/search-params";

describe("search parameters", () => {
  it("reads several manufacturers and models", () => {
    const query = parseSearchParams({ hersteller: "eppendorf,thermo-fisher", modell: "centrifuge-5810-r" });
    expect(query.manufacturers).toEqual(["eppendorf", "thermo-fisher"]);
    expect(query.models).toEqual(["centrifuge-5810-r"]);
  });

  it("reads a price range in francs and a range of years", () => {
    const query = parseSearchParams({ min: "1'000", max: "10000", baujahr_von: "2015", baujahr_bis: "2020" });
    expect(query.minPriceCents).toBe(100_000);
    expect(query.maxPriceCents).toBe(1_000_000);
    expect(query.minYear).toBe(2015);
    expect(query.maxYear).toBe(2020);
  });

  it("ignores empty fields and years that cannot be one", () => {
    const query = parseSearchParams({ min: "", baujahr_von: "", baujahr_bis: "20200" });
    expect(query.minPriceCents).toBeUndefined();
    expect(query.minYear).toBeUndefined();
    expect(query.maxYear).toBeUndefined();
    expect(hasAnyFilter(query)).toBe(false);
  });

  it("counts a year or a model as a filter", () => {
    expect(hasAnyFilter(parseSearchParams({ baujahr_von: "2018" }))).toBe(true);
    expect(hasAnyFilter(parseSearchParams({ modell: "centrifuge-5810-r" }))).toBe(true);
  });

  it("adds a second manufacturer and takes one away again", () => {
    const one = { hersteller: "eppendorf" };
    expect(toggledHref("/de/suche", one, "hersteller", "thermo-fisher")).toBe(
      "/de/suche?hersteller=eppendorf%2Cthermo-fisher",
    );
    expect(toggledHref("/de/suche", { hersteller: "eppendorf,thermo-fisher" }, "hersteller", "eppendorf")).toBe(
      "/de/suche?hersteller=thermo-fisher",
    );
  });

  it("keeps every other filter when a range form is sent or a range is removed", () => {
    const params = { hersteller: "eppendorf", min: "1000", max: "5000", seite: "3" };
    expect(paramsExcept(params, ["min", "max"])).toEqual([["hersteller", "eppendorf"]]);
    expect(withoutParams("/de/suche", params, ["min", "max"])).toBe("/de/suche?hersteller=eppendorf");
  });
});
