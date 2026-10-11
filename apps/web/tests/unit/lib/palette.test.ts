import { TONES, assignTones, toneAt, toneFor } from "@/lib/palette";

describe("palette", () => {
  it("has ten distinct tones, none of them the main blue", () => {
    expect(TONES).toHaveLength(10);
    expect(new Set(TONES.map((t) => t.name)).size).toBe(10);
    expect(TONES.map((t) => t.name)).not.toContain("blue");
    expect(TONES.map((t) => t.name)).not.toContain("sky");
  });

  it("always gives the same key the same tone", () => {
    const id = "6c61237a-c6f5-4da5-93d1-f827c576f0eb";
    expect(toneFor(id)).toBe(toneFor(id));
  });

  it("spreads a set of ids across several tones", () => {
    const ids = Array.from(
      { length: 40 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    const used = new Set(ids.map((id) => toneFor(id).name));
    expect(used.size).toBeGreaterThanOrEqual(6);
  });

  describe("assignTones", () => {
    const at = (n: number) => new Date(2026, 0, n);

    it("gives the first ten items ten different tones", () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `id-${i}`,
        createdAt: at(i + 1),
      }));
      const tones = assignTones(items);
      expect(new Set(Object.values(tones)).size).toBe(10);
    });

    it("follows creation order, not the order given", () => {
      const tones = assignTones([
        { id: "late", createdAt: at(9) },
        { id: "early", createdAt: at(1) },
        { id: "middle", createdAt: at(5) },
      ]);
      expect(tones).toEqual({ early: 0, middle: 1, late: 2 });
    });

    it("keeps existing items' tones when a newer one is added", () => {
      const before = assignTones([
        { id: "a", createdAt: at(1) },
        { id: "b", createdAt: at(2) },
      ]);
      const after = assignTones([
        { id: "a", createdAt: at(1) },
        { id: "b", createdAt: at(2) },
        { id: "c", createdAt: at(3) },
      ]);
      expect(after.a).toBe(before.a);
      expect(after.b).toBe(before.b);
    });

    it("wraps around after the last tone", () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        id: `id-${i}`,
        createdAt: at(i + 1),
      }));
      const tones = assignTones(items);
      expect(tones["id-10"]).toBe(0);
      expect(toneAt(tones["id-10"]!)).toBe(TONES[0]);
    });
  });
});
