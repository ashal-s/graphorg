import {
  assemblePersonProfile,
  type AssemblePersonProfileInput,
} from "@/lib/directory/person-profile";

/**
 * Fixture shaped like Sam Rivera from the Acme seed: Payments team, owner
 * and creator of a workflow, team-owned services/repos/docs, and the org
 * tool catalog.
 */
function paymentsProfileInput(
  overrides: Partial<AssemblePersonProfileInput> = {},
): AssemblePersonProfileInput {
  return {
    teams: [{ id: "team-payments", name: "Payments", slug: "payments" }],
    manager: { id: "person-priya", name: "Priya Shah", slug: "priya-shah" },
    directReports: [
      { id: "person-taylor", name: "Taylor Brooks", slug: "taylor-brooks" },
    ],
    organizationId: "org-acme",
    workflowLinks: [
      {
        role: "owner",
        workflow: {
          id: "wf-runbooks",
          name: "Escalate stale runbooks",
          status: "draft",
          organizationId: "org-acme",
        },
      },
      {
        role: "creator",
        workflow: {
          id: "wf-runbooks",
          name: "Escalate stale runbooks",
          status: "draft",
          organizationId: "org-acme",
        },
      },
    ],
    services: [
      {
        id: "svc-checkout-api",
        name: "checkout-api",
        description: "Core checkout API.",
        tools: [
          { tool: { id: "tool-github", name: "GitHub", category: "source" } },
          { tool: { id: "tool-jira", name: "Jira", category: "tracking" } },
        ],
      },
      {
        id: "svc-checkout-web",
        name: "checkout-web",
        description: "Checkout UI.",
        tools: [
          { tool: { id: "tool-jira", name: "Jira", category: "tracking" } },
        ],
      },
      {
        id: "svc-payments-worker",
        name: "payments-worker",
        description: "Async payments.",
        tools: [],
      },
    ],
    documents: [
      {
        id: "doc-adr",
        title: "Checkout API Architecture",
        type: "adr",
        url: "https://docs.acme.example/adr/checkout-api",
      },
    ],
    ...overrides,
  };
}

describe("assemblePersonProfile", () => {
  it("keeps the team, manager, and direct reports", () => {
    const profile = assemblePersonProfile(paymentsProfileInput());

    expect(profile.teams).toEqual([
      { id: "team-payments", name: "Payments", slug: "payments" },
    ]);
    expect(profile.manager).toEqual({
      id: "person-priya",
      name: "Priya Shah",
      slug: "priya-shah",
    });
    expect(profile.directReports).toEqual([
      { id: "person-taylor", name: "Taylor Brooks", slug: "taylor-brooks" },
    ]);
  });

  it("merges multiple roles on the same workflow", () => {
    const profile = assemblePersonProfile(paymentsProfileInput());

    expect(profile.workflows).toEqual([
      {
        id: "wf-runbooks",
        name: "Escalate stale runbooks",
        status: "draft",
        roles: ["owner", "creator"],
      },
    ]);
  });

  it("drops workflows that belong to another organisation", () => {
    const profile = assemblePersonProfile(
      paymentsProfileInput({
        workflowLinks: [
          {
            role: "worker",
            workflow: {
              id: "wf-other",
              name: "Other org workflow",
              status: "active",
              organizationId: "org-other",
            },
          },
        ],
      }),
    );

    expect(profile.workflows).toEqual([]);
  });

  it("lists every team the person is on, sorted by name", () => {
    const profile = assemblePersonProfile(
      paymentsProfileInput({
        teams: [
          {
            id: "team-sre",
            name: "Site Reliability",
            slug: "site-reliability",
          },
          { id: "team-payments", name: "Payments", slug: "payments" },
        ],
      }),
    );

    expect(profile.teams.map((team) => team.name)).toEqual([
      "Payments",
      "Site Reliability",
    ]);
  });

  it("dedupes tools across the team's services", () => {
    const profile = assemblePersonProfile(
      paymentsProfileInput({
        services: [
          {
            id: "svc-a",
            name: "a",
            description: null,
            tools: [
              { tool: { id: "tool-go", name: "Go", category: "other" } },
              {
                tool: { id: "tool-pg", name: "PostgreSQL", category: "other" },
              },
            ],
          },
          {
            id: "svc-b",
            name: "b",
            description: null,
            tools: [{ tool: { id: "tool-go", name: "Go", category: "other" } }],
          },
        ],
      }),
    );

    expect(profile.tools.map((tool) => tool.name)).toEqual([
      "Go",
      "PostgreSQL",
    ]);
  });

  it("sorts services, tools, and documents by name/title", () => {
    const profile = assemblePersonProfile(paymentsProfileInput());

    expect(profile.services.map((service) => service.name)).toEqual([
      "checkout-api",
      "checkout-web",
      "payments-worker",
    ]);
    expect(profile.tools.map((tool) => tool.name)).toEqual(["GitHub", "Jira"]);
    expect(profile.documents.map((doc) => doc.title)).toEqual([
      "Checkout API Architecture",
    ]);
  });

  it("returns empty relationship lists when the person has no team", () => {
    const profile = assemblePersonProfile(
      paymentsProfileInput({
        teams: [],
        services: [],
        documents: [],
        workflowLinks: [],
      }),
    );

    expect(profile.teams).toEqual([]);
    expect(profile.services).toEqual([]);
    expect(profile.documents).toEqual([]);
    expect(profile.workflows).toEqual([]);
    expect(profile.tools).toEqual([]);
  });
});
