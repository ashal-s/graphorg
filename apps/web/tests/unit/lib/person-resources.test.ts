import { buildPersonResources } from "@/lib/directory/person-resources";
import type { AssembledPersonProfile } from "@/lib/directory/person-profile";
import { DEFAULT_TERMINOLOGY, resolveTerminology } from "@/lib/terminology";

const profile: AssembledPersonProfile = {
  teams: [{ id: "team-1", name: "Payments" }],
  manager: { id: "p-1", name: "Priya Shah" },
  directReports: [{ id: "p-2", name: "Taylor Brooks" }],
  workflows: [
    {
      id: "wf-1",
      name: "Escalate runbooks",
      status: "active",
      roles: ["owner", "worker"],
    },
  ],
  services: [{ id: "svc-1", name: "checkout-api", description: null }],
  tools: [{ id: "tool-1", name: "GitHub", category: "source" }],
  repositories: [{ id: "repo-1", name: "checkout-api", url: null }],
  documents: [{ id: "doc-1", title: "ADR", type: "adr", url: null }],
};

describe("buildPersonResources", () => {
  it("makes one stat per kind of relationship, each linking to its record", () => {
    const resources = buildPersonResources(profile, DEFAULT_TERMINOLOGY);

    expect(resources.map((r) => r.key)).toEqual([
      "teams",
      "workflows",
      "services",
      "tools",
      "documents",
      "reports",
    ]);
    const hrefs = Object.fromEntries(
      resources.map((r) => [r.key, r.items.map((item) => item.href)]),
    );
    expect(hrefs).toEqual({
      teams: ["/directory/teams/team-1"],
      workflows: ["/workflows/wf-1"],
      services: ["/catalog/services/svc-1"],
      tools: ["/catalog/tools/tool-1"],
      documents: ["/catalog/documents/doc-1"],
      reports: ["/directory/people/p-2"],
    });
  });

  it("labels a workflow with the person's roles and a document with its type", () => {
    const resources = buildPersonResources(profile, DEFAULT_TERMINOLOGY);
    const byKey = Object.fromEntries(resources.map((r) => [r.key, r]));

    expect(byKey.workflows!.items[0]!.badges).toEqual(["Owner", "Assigned"]);
    expect(byKey.documents!.items[0]!.badges).toEqual(["adr"]);
    expect(byKey.documents!.items[0]!.name).toBe("ADR");
  });

  it("uses the organization's wording for services and tools", () => {
    const resources = buildPersonResources(
      profile,
      resolveTerminology({
        servicesLabelPlural: "Programs",
        servicesLabelSingular: "Program",
        toolsLabelPlural: "Equipment",
        toolsLabelSingular: "Item",
      }),
    );
    const byKey = Object.fromEntries(resources.map((r) => [r.key, r]));

    expect(byKey.services!.label).toBe("Programs");
    expect(byKey.services!.singular).toBe("program");
    expect(byKey.tools!.label).toBe("Equipment");
  });

  it("explains an empty stat", () => {
    const resources = buildPersonResources(
      { ...profile, teams: [], directReports: [] },
      DEFAULT_TERMINOLOGY,
    );
    const byKey = Object.fromEntries(resources.map((r) => [r.key, r]));

    expect(byKey.teams!.items).toEqual([]);
    expect(byKey.teams!.emptyText).toBe("Not on any team.");
    expect(byKey.reports!.emptyText).toBe("Nobody reports to this person.");
  });
});
