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
  services: [
    { id: "svc-1", name: "checkout-api", description: null, direct: false },
  ],
  tools: [{ id: "tool-1", name: "GitHub", category: "source" }],
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
      documents: ["/documents/doc-1"],
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

describe("buildPersonResources editing", () => {
  const editing = {
    personId: "me",
    canAssign: true,
    canAssignReports: false,
    teams: [
      { id: "team-1", name: "Payments" },
      { id: "team-2", name: "Growth" },
    ],
    workflows: [
      { id: "wf-1", name: "Escalate runbooks" },
      { id: "wf-2", name: "Onboarding" },
    ],
    services: [
      { id: "svc-1", name: "checkout-api" },
      { id: "svc-2", name: "ledger" },
    ],
    people: [
      { id: "p-2", name: "Taylor Brooks" },
      { id: "p-3", name: "Sam Lee" },
    ],
  };
  const byKey = (editingArg?: typeof editing, p = profile) =>
    Object.fromEntries(
      buildPersonResources(p, DEFAULT_TERMINOLOGY, editingArg).map((r) => [
        r.key,
        r,
      ]),
    );

  it("offers nothing to assign when the viewer can't edit", () => {
    const resources = byKey(undefined);
    for (const resource of Object.values(resources)) {
      expect(resource.assign).toBeUndefined();
      expect(resource.items.every((item) => !item.remove)).toBe(true);
    }
  });

  it("only offers records the person isn't already linked to", () => {
    const resources = byKey(editing);

    expect(resources.teams!.assign!.options.map((o) => o.id)).toEqual([
      "team-2",
    ]);
    expect(resources.workflows!.assign!.options.map((o) => o.id)).toEqual([
      "wf-2",
    ]);
    expect(resources.services!.assign!.options.map((o) => o.id)).toEqual([
      "svc-2",
    ]);
  });

  it("assigns teams with a level and workflows with a role", () => {
    const resources = byKey(editing);

    expect(resources.teams!.assign).toMatchObject({
      url: "/api/teams/{id}/members/me",
      method: "PUT",
      level: { key: "teamRole", defaultValue: "member" },
    });
    expect(resources.workflows!.assign).toMatchObject({
      url: "/api/people/me/workflows/{id}",
      method: "PUT",
      level: { key: "roles", asArray: true, defaultValue: "worker" },
    });
  });

  it("lets a team, a workflow, and a direct service assignment be removed", () => {
    const resources = byKey(editing, {
      ...profile,
      services: [
        { id: "svc-1", name: "checkout-api", description: null, direct: true },
        { id: "svc-9", name: "via-team", description: null, direct: false },
      ],
    });

    expect(resources.teams!.items[0]!.remove).toEqual({
      url: "/api/teams/team-1/members/me",
      method: "DELETE",
    });
    expect(resources.workflows!.items[0]!.remove).toEqual({
      url: "/api/people/me/workflows/wf-1",
      method: "DELETE",
    });
    expect(resources.services!.items[0]!.remove).toEqual({
      url: "/api/people/me/services/svc-1",
      method: "DELETE",
    });
    // Came from a team: nothing to remove here.
    expect(resources.services!.items[1]!.remove).toBeUndefined();
  });

  it("keeps direct reports admin-only", () => {
    const editor = byKey(editing);
    expect(editor.reports!.assign).toBeUndefined();
    expect(editor.reports!.items[0]!.remove).toBeUndefined();

    const admin = byKey({ ...editing, canAssignReports: true });
    expect(admin.reports!.assign).toMatchObject({
      url: "/api/people/{id}",
      method: "PATCH",
      body: { managerId: "me" },
    });
    expect(admin.reports!.assign!.options.map((o) => o.id)).toEqual(["p-3"]);
    expect(admin.reports!.items[0]!.remove).toEqual({
      url: "/api/people/p-2",
      method: "PATCH",
      body: { managerId: null },
    });
  });
});
