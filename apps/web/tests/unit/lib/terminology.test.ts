import { DEFAULT_TERMINOLOGY, resolveTerminology } from "@/lib/terminology";

describe("resolveTerminology", () => {
  it("falls back to the defaults when nothing is set", () => {
    expect(resolveTerminology(null)).toEqual(DEFAULT_TERMINOLOGY);
    expect(resolveTerminology({})).toEqual(DEFAULT_TERMINOLOGY);
  });

  it("uses what the organization set, per concept and per field", () => {
    const terms = resolveTerminology({
      servicesLabelSingular: "Program",
      servicesLabelPlural: "Programs",
      servicesDescription: "What we teach.",
      toolsLabelPlural: "Equipment",
    });

    expect(terms.services).toEqual({
      singular: "Program",
      plural: "Programs",
      description: "What we teach.",
    });
    expect(terms.tools).toEqual({
      ...DEFAULT_TERMINOLOGY.tools,
      plural: "Equipment",
    });
  });

  it("treats blank or whitespace-only values as unset", () => {
    const terms = resolveTerminology({
      servicesLabelSingular: "   ",
      toolsDescription: "",
    });
    expect(terms).toEqual(DEFAULT_TERMINOLOGY);
  });
});
