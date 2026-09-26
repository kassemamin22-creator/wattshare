import { describe, expect, it } from "vitest";
import ar from "./locales/ar.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

// Flattens a translation file into { "landing.features.items[0].title": "Real-time billing", ... }.
// Arrays are walked by index so "items" arrays must also match in length.
function collectLeaves(root: unknown): Map<string, string> {
  const leaves = new Map<string, string>();

  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
    } else if (node !== null && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        walk(child, path ? `${path}.${key}` : key);
      }
    } else {
      leaves.set(path, String(node));
    }
  };

  walk(root, "");
  return leaves;
}

function keysMissingFrom(source: Map<string, string>, target: Map<string, string>): string[] {
  return [...source.keys()].filter((key) => !target.has(key));
}

function placeholdersIn(text: string): string[] {
  return [...new Set([...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]))].sort();
}

const reference = collectLeaves(en);

describe("translation files", () => {
  it("collects a sensible number of keys from en.json (guards against a broken helper)", () => {
    expect(reference.size).toBeGreaterThan(200);
  });

  it("have identical top-level sections", () => {
    const sections = Object.keys(en).sort();

    expect(Object.keys(ar).sort()).toEqual(sections);
    expect(Object.keys(fr).sort()).toEqual(sections);
  });

  describe.each([
    ["ar", ar],
    ["fr", fr],
  ])("%s.json compared with en.json", (_name, locale) => {
    const leaves = collectLeaves(locale);

    it("has every key that en.json has", () => {
      expect(keysMissingFrom(reference, leaves)).toEqual([]);
    });

    it("has no key that en.json lacks", () => {
      expect(keysMissingFrom(leaves, reference)).toEqual([]);
    });

    it("uses the same {{placeholders}} as en.json in every string", () => {
      const mismatches = [...reference.entries()]
        .filter(([key]) => leaves.has(key))
        .map(([key, text]) => ({ key, expected: placeholdersIn(text), actual: placeholdersIn(leaves.get(key)!) }))
        .filter(({ expected, actual }) => expected.join() !== actual.join());

      expect(mismatches).toEqual([]);
    });

    it("has no empty translations", () => {
      const empty = [...leaves.entries()].filter(([, text]) => text.trim() === "").map(([key]) => key);

      expect(empty).toEqual([]);
    });

    it("keeps the same ids for list items (components look items up by id)", () => {
      const idsOf = (map: Map<string, string>) =>
        [...map.entries()].filter(([key]) => key.endsWith(".id")).map(([key, id]) => `${key}=${id}`);

      expect(idsOf(leaves)).toEqual(idsOf(reference));
    });
  });
});
