/**
 * @jest-environment node
 */
import { RESERVED_SLUGS, firstFreeSlug, toSlug } from "@/lib/slugs";

describe("toSlug", () => {
  it.each([
    ["Jordan Lee", "jordan-lee"],
    ["  Data & Analytics  ", "data-analytics"],
    ["José Núñez", "jose-nunez"],
    ["O'Brien-Smith", "o-brien-smith"],
    ["Platform Engineering (EMEA)", "platform-engineering-emea"],
  ])("turns %j into %j", (name, slug) => {
    expect(toSlug(name)).toBe(slug);
  });

  it("never returns an empty slug", () => {
    expect(toSlug("!!!")).toBe("item");
    expect(toSlug("   ")).toBe("item");
    expect(toSlug("日本語")).toBe("item");
  });
});

describe("firstFreeSlug", () => {
  it("uses the base when nothing has it", async () => {
    expect(await firstFreeSlug("payments", () => false)).toBe("payments");
  });

  it("adds -2, -3, ... until one is free", async () => {
    const taken = new Set(["alex", "alex-2", "alex-3"]);
    expect(await firstFreeSlug("alex", (s) => taken.has(s))).toBe("alex-4");
  });

  it("never hands out an app page name", async () => {
    expect(await firstFreeSlug("settings", () => false)).toBe("settings-2");
    for (const reserved of RESERVED_SLUGS) {
      expect(await firstFreeSlug(reserved, () => false)).not.toBe(reserved);
    }
  });

  it("keeps the app's own top-level routes reserved", () => {
    for (const route of [
      "directory",
      "org-chart",
      "catalog",
      "documents",
      "workflows",
      "settings",
      "login",
      "signup",
      "welcome",
      "api",
    ]) {
      expect(RESERVED_SLUGS.has(route)).toBe(true);
    }
  });
});
