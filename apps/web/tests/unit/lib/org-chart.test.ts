import { buildOrgChart, countOrgChart } from "@/lib/directory/org-chart";

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
