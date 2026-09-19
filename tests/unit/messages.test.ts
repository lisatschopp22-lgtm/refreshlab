import { describe, expect, it } from "vitest";
import de from "../../messages/de.json";
import en from "../../messages/en.json";

function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key));
}

describe("message catalogues", () => {
  it("German and English define exactly the same keys", () => {
    const deKeys = keysOf(de).sort();
    const enKeys = keysOf(en).sort();
    expect(enKeys.filter((k) => !deKeys.includes(k))).toEqual([]);
    expect(deKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it("has no empty strings", () => {
    const empties: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === "string" && value.trim() === "") empties.push(path);
      else if (typeof value === "object" && value)
        Object.entries(value).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k));
    };
    walk(de, "");
    walk(en, "");
    expect(empties).toEqual([]);
  });
});
