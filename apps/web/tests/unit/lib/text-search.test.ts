import { matchesSearch } from "@/lib/text-search";

describe("matchesSearch", () => {
  it("matches everything for an empty or blank query", () => {
    expect(matchesSearch("", ["Jordan"])).toBe(true);
    expect(matchesSearch("   ", [null])).toBe(true);
  });

  it("matches a fragment anywhere, ignoring case", () => {
    expect(matchesSearch("ORD", ["Jordan Lee"])).toBe(true);
    expect(matchesSearch("lee", ["Jordan Lee"])).toBe(true);
    expect(matchesSearch("zed", ["Jordan Lee"])).toBe(false);
  });

  it("requires every word, which may come from different fields", () => {
    const fields = ["Jordan Lee", "jordan@acme.com", "Engineer"];
    expect(matchesSearch("jor engineer", fields)).toBe(true);
    expect(matchesSearch("jor designer", fields)).toBe(false);
  });

  it("skips empty fields", () => {
    expect(matchesSearch("a", [null, undefined, "", "abc"])).toBe(true);
  });
});
