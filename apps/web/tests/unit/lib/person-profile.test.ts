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
    team: { id: "team-payments", name: "Payments" },
    manager: { id: "person-priya", name: "Priya Shah" },
    directReports: [{ id: "person-taylor", name: "Taylor Brooks" }],
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
        repository: {
          id: "repo-checkout-api",
          name: "checkout-api",
          url: "https://github.com/acme/checkout-api",
        },
        technologies: [
          { technology: { id: "tech-go", name: "Go" } },
          { technology: { id: "tech-pg", name: "PostgreSQL" } },
        ],
      },
      {
        id: "svc-checkout-web",
        name: "checkout-web",
        description: "Checkout UI.",
        repository: {
          id: "repo-checkout-web",
          name: "checkout-web",
          url: "https://github.com/acme/checkout-web",
        },
        technologies: [
          { technology: { id: "tech-ts", name: "TypeScript" } },
          { technology: { id: "tech-react", name: "React" } },
        ],
      },
      {
        id: "svc-payments-worker",
        name: "payments-worker",
        description: "Async payments.",
        repository: null,
        technologies: [{ technology: { id: "tech-py", name: "Python" } }],
      },
    ],
    repositories: [
      {
        id: "repo-checkout-api",
        name: "checkout-api",
        url: "https://github.com/acme/checkout-api",
      },
      {
        id: "repo-checkout-web",
        name: "checkout-web",
        url: "https://github.com/acme/checkout-web",
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
    tools: [
      { id: "tool-github", name: "GitHub", category: "source_control" },
      { id: "tool-jira", name: "Jira", category: "issue_tracking" },
    ],
    ...overrides,
  };
}

describe("assemblePersonProfile", () => {
  it("keeps the team, manager, and direct reports", () => {
    const profile = assemblePersonProfile(paymentsProfileInput());

    expect(profile.team).toEqual({ id: "team-payments", name: "Payments" });
    expect(profile.manager).toEqual({
      id: "person-priya",
      name: "Priya Shah",
    });
    expect(profile.directReports).toEqual([
      { id: "person-taylor", name: "Taylor Brooks" },
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

  it("dedupes technologies across the team's services", () => {
    const profile = assemblePersonProfile(
      paymentsProfileInput({
        services: [
          {
            id: "svc-a",
            name: "a",
            description: null,
            technologies: [
              { technology: { id: "tech-go", name: "Go" } },
              { technology: { id: "tech-pg", name: "PostgreSQL" } },
            ],
          },
          {
            id: "svc-b",
            name: "b",
            description: null,
            technologies: [{ technology: { id: "tech-go", name: "Go" } }],
          },
        ],
      }),
    );

    expect(profile.technologies.map((tech) => tech.name)).toEqual([
      "Go",
      "PostgreSQL",
    ]);
  });

  it("unions team-owned repositories with repositories on services", () => {
    const profile = assemblePersonProfile(
      paymentsProfileInput({
        repositories: [
          {
            id: "repo-owned",
            name: "owned-repo",
            url: null,
          },
        ],
        services: [
          {
            id: "svc-a",
            name: "a",
            description: null,
            repository: {
              id: "repo-linked",
              name: "linked-repo",
              url: "https://github.com/acme/linked",
            },
            technologies: [],
          },
        ],
      }),
    );

    expect(profile.repositories.map((repo) => repo.name)).toEqual([
      "linked-repo",
      "owned-repo",
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
        team: null,
        services: [],
        repositories: [],
        documents: [],
        tools: [],
        workflowLinks: [],
      }),
    );

    expect(profile.team).toBeNull();
    expect(profile.services).toEqual([]);
    expect(profile.repositories).toEqual([]);
    expect(profile.technologies).toEqual([]);
    expect(profile.documents).toEqual([]);
    expect(profile.workflows).toEqual([]);
    expect(profile.tools).toEqual([]);
  });
});
