import {
  buildOrgChart,
  countOrgChart,
  flattenOrgChart,
} from "@/lib/directory/org-chart";

const person = (id: string, managerId: string | null, name = id) => ({
  id,
  name,
  title: null,
  managerId,
  teamName: null,
});

describe("buildOrgChart", () => {
  it("nests reports under their manager, sorted by name", () => {
    const roots = buildOrgChart([
      person("c", "a", "Cara"),
      person("a", null, "Ann"),
      person("b", "a", "Bob"),
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0]!.name).toBe("Ann");
    expect(roots[0]!.reports.map((node) => node.name)).toEqual(["Bob", "Cara"]);
  });

  it("makes anyone with no or unknown manager a root", () => {
    const roots = buildOrgChart([
      person("a", null, "Ann"),
      person("b", "missing", "Bob"),
    ]);

    expect(roots.map((node) => node.name)).toEqual(["Ann", "Bob"]);
  });

  it("does not loop forever on a cycle and keeps everyone", () => {
    const roots = buildOrgChart([person("a", "b"), person("b", "a")]);

    expect(countOrgChart(roots)).toBe(2);
  });

  it("handles a person managing themselves", () => {
    const roots = buildOrgChart([person("a", "a")]);

    expect(roots).toHaveLength(1);
    expect(roots[0]!.reports).toEqual([]);
  });
});

describe("flattenOrgChart", () => {
  it("lists each person before their reports, with their depth", () => {
    const roots = buildOrgChart([
      person("ceo", null),
      person("zed", "vp"),
      person("amy", "vp"),
      person("vp", "ceo"),
      person("solo", null),
    ]);

    expect(
      flattenOrgChart(roots).map(({ node, depth }) => [node.id, depth]),
    ).toEqual([
      ["ceo", 0],
      ["vp", 1],
      ["amy", 2],
      ["zed", 2],
      ["solo", 0],
    ]);
  });
});
