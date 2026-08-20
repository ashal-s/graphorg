/**
 * Seeds a representative demo organisation ("Acme Corp") exercising every
 * table and relationship in the relational context model: teams, a manager
 * hierarchy, product accounts, a technology/tool catalog, systems, services
 * with tech stacks and dependencies, repositories, documents, and workflows
 * with ordered steps and assignees.
 *
 * Re-runnable: deletes the demo org (organizations.slug = "acme") first, if
 * it exists. The ON DELETE CASCADE on organization_id takes care of every
 * child row, so re-seeding never needs manual cleanup.
 *
 * Run with `npm run db:seed` (from apps/web).
 */
import { eq } from "drizzle-orm";

import { getDb } from "../src/db";
import {
  documents,
  organizations,
  people,
  repositories,
  serviceDependencies,
  services,
  serviceTechnologies,
  systems,
  teams,
  technologies,
  tools,
  users,
  workflowAssignees,
  workflows,
  workflowSteps,
} from "../src/db/schema";

async function main() {
  const db = getDb();

  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, "acme"),
  });
  if (existing) {
    console.log(`Removing existing demo org (${existing.id})...`);
    await db.delete(organizations).where(eq(organizations.id, existing.id));
  }

  const [org] = await db
    .insert(organizations)
    .values({ name: "Acme Corp", slug: "acme" })
    .returning();
  if (!org) throw new Error("Failed to insert organization");
  console.log(`Created organization ${org.name} (${org.id})`);

  // --- Teams ---------------------------------------------------------

  const teamRows = await db
    .insert(teams)
    .values(
      [
        {
          name: "Platform Engineering",
          description:
            "Core platform, shared infrastructure and developer experience.",
        },
        {
          name: "Payments",
          description: "Checkout, billing and payment processing.",
        },
        {
          name: "Growth",
          description: "Acquisition, activation and experimentation.",
        },
        {
          name: "Data & Analytics",
          description: "Data pipelines, warehousing and reporting.",
        },
        {
          name: "Site Reliability",
          description: "Production reliability, on-call and incident response.",
        },
      ].map((t) => ({ ...t, organizationId: org.id })),
    )
    .returning();
  const teamByName = new Map(teamRows.map((t) => [t.name, t]));
  console.log(`Created ${teamRows.length} teams`);

  // --- People (manager hierarchy, no user link yet) -------------------

  const peopleSpecs = [
    {
      name: "Priya Shah",
      email: "priya@acme.example",
      title: "CTO",
      team: "Platform Engineering",
      manager: null as string | null,
    },
    {
      name: "Alex Kim",
      email: "alex@acme.example",
      title: "Engineering Manager",
      team: "Platform Engineering",
      manager: "Priya Shah",
    },
    {
      name: "Jordan Lee",
      email: "jordan@acme.example",
      title: "Senior Platform Engineer",
      team: "Platform Engineering",
      manager: "Alex Kim",
    },
    {
      name: "Sam Rivera",
      email: "sam@acme.example",
      title: "Engineering Manager",
      team: "Payments",
      manager: "Priya Shah",
    },
    {
      name: "Taylor Brooks",
      email: "taylor@acme.example",
      title: "Backend Engineer",
      team: "Payments",
      manager: "Sam Rivera",
    },
    {
      name: "Morgan Diaz",
      email: "morgan@acme.example",
      title: "Engineering Manager",
      team: "Growth",
      manager: "Priya Shah",
    },
    {
      name: "Riley Chen",
      email: "riley@acme.example",
      title: "Frontend Engineer",
      team: "Growth",
      manager: "Morgan Diaz",
    },
    {
      name: "Casey Okafor",
      email: "casey@acme.example",
      title: "Data Engineer",
      team: "Data & Analytics",
      manager: "Priya Shah",
    },
    {
      name: "Dana Whitfield",
      email: "dana@acme.example",
      title: "Site Reliability Engineer",
      team: "Site Reliability",
      manager: "Priya Shah",
    },
  ];

  // Every manager appears earlier in peopleSpecs than the people who report
  // to them, so a single pass can resolve managerId from names already
  // inserted, no second update pass needed.
  const personByName = new Map<string, { id: string; email: string }>();
  for (const spec of peopleSpecs) {
    const managerId = spec.manager
      ? personByName.get(spec.manager)?.id
      : undefined;
    const [row] = await db
      .insert(people)
      .values({
        organizationId: org.id,
        teamId: teamByName.get(spec.team)!.id,
        managerId,
        name: spec.name,
        email: spec.email,
        title: spec.title,
      })
      .returning();
    if (!row) throw new Error(`Failed to insert person ${spec.name}`);
    personByName.set(spec.name, { id: row.id, email: spec.email });
  }
  console.log(`Created ${personByName.size} people`);

  // --- Users (product accounts, linked back to a subset of people) ----

  const userSpecs = [
    { person: "Priya Shah", role: "owner" as const },
    { person: "Alex Kim", role: "admin" as const },
    { person: "Sam Rivera", role: "editor" as const },
    { person: "Riley Chen", role: "viewer" as const },
  ];
  const userRows = await db
    .insert(users)
    .values(
      userSpecs.map((spec) => ({
        organizationId: org.id,
        email: personByName.get(spec.person)!.email,
        name: spec.person,
        role: spec.role,
      })),
    )
    .returning();
  for (const userRow of userRows) {
    await db
      .update(people)
      .set({ userId: userRow.id })
      .where(eq(people.email, userRow.email));
  }
  console.log(`Created ${userRows.length} users`);

  // --- Technologies and tools (flat catalogs) --------------------------

  const technologyRows = await db
    .insert(technologies)
    .values(
      [
        { name: "TypeScript", category: "language" as const },
        { name: "Go", category: "language" as const },
        { name: "Python", category: "language" as const },
        { name: "React", category: "framework" as const },
        { name: "PostgreSQL", category: "database" as const },
        { name: "Redis", category: "database" as const },
        { name: "Kafka", category: "infrastructure" as const },
        { name: "Docker", category: "infrastructure" as const },
      ].map((t) => ({ ...t, organizationId: org.id })),
    )
    .returning();
  const technologyByName = new Map(technologyRows.map((t) => [t.name, t]));
  console.log(`Created ${technologyRows.length} technologies`);

  const toolRows = await db
    .insert(tools)
    .values(
      [
        {
          name: "GitHub",
          category: "source_control" as const,
          vendor: "GitHub",
          url: "https://github.com",
        },
        {
          name: "Jira",
          category: "issue_tracking" as const,
          vendor: "Atlassian",
          url: "https://atlassian.com/jira",
        },
        {
          name: "Confluence",
          category: "documentation" as const,
          vendor: "Atlassian",
          url: "https://atlassian.com/confluence",
        },
        {
          name: "Buildkite",
          category: "ci_cd" as const,
          vendor: "Buildkite",
          url: "https://buildkite.com",
        },
        {
          name: "LaunchDarkly",
          category: "feature_flags" as const,
          vendor: "LaunchDarkly",
          url: "https://launchdarkly.com",
        },
        {
          name: "Datadog",
          category: "observability" as const,
          vendor: "Datadog",
          url: "https://datadoghq.com",
        },
      ].map((t) => ({ ...t, organizationId: org.id })),
    )
    .returning();
  console.log(`Created ${toolRows.length} tools`);

  // --- Systems and repositories -----------------------------------------

  const systemRows = await db
    .insert(systems)
    .values(
      [
        {
          name: "Checkout Platform",
          description: "Cart, checkout and payment processing.",
          ownerTeam: "Payments",
        },
        {
          name: "Growth Platform",
          description: "Experimentation and lifecycle marketing.",
          ownerTeam: "Growth",
        },
        {
          name: "Data Platform",
          description: "Ingestion, warehousing and reporting.",
          ownerTeam: "Data & Analytics",
        },
      ].map(({ ownerTeam, ...s }) => ({
        ...s,
        organizationId: org.id,
        ownerTeamId: teamByName.get(ownerTeam)!.id,
      })),
    )
    .returning();
  const systemByName = new Map(systemRows.map((s) => [s.name, s]));
  console.log(`Created ${systemRows.length} systems`);

  const repositoryRows = await db
    .insert(repositories)
    .values(
      [
        {
          name: "checkout-api",
          url: "https://github.com/acme/checkout-api",
          ownerTeam: "Payments",
        },
        {
          name: "checkout-web",
          url: "https://github.com/acme/checkout-web",
          ownerTeam: "Payments",
        },
        {
          name: "growth-experiments",
          url: "https://github.com/acme/growth-experiments",
          ownerTeam: "Growth",
        },
        {
          name: "data-pipeline",
          url: "https://github.com/acme/data-pipeline",
          ownerTeam: "Data & Analytics",
        },
        {
          name: "sre-infra",
          url: "https://github.com/acme/sre-infra",
          ownerTeam: "Site Reliability",
        },
      ].map(({ ownerTeam, ...r }) => ({
        ...r,
        organizationId: org.id,
        ownerTeamId: teamByName.get(ownerTeam)!.id,
      })),
    )
    .returning();
  const repositoryByName = new Map(repositoryRows.map((r) => [r.name, r]));
  console.log(`Created ${repositoryRows.length} repositories`);

  // --- Services, with tech stacks and dependencies ----------------------

  const serviceSpecs = [
    {
      name: "checkout-api",
      description: "Core checkout and order orchestration API.",
      system: "Checkout Platform",
      repository: "checkout-api",
      ownerTeam: "Payments",
      stack: ["Go", "PostgreSQL"],
      dependsOn: [] as string[],
    },
    {
      name: "checkout-web",
      description: "Customer-facing checkout UI.",
      system: "Checkout Platform",
      repository: "checkout-web",
      ownerTeam: "Payments",
      stack: ["TypeScript", "React"],
      dependsOn: ["checkout-api"],
    },
    {
      name: "payments-worker",
      description: "Async payment capture, refunds and webhook processing.",
      system: "Checkout Platform",
      repository: null as string | null,
      ownerTeam: "Payments",
      stack: ["Python"],
      dependsOn: ["checkout-api"],
    },
    {
      name: "experiment-service",
      description: "Serves and records A/B experiment assignments.",
      system: "Growth Platform",
      repository: "growth-experiments",
      ownerTeam: "Growth",
      stack: ["TypeScript", "Redis"],
      dependsOn: ["checkout-api"],
    },
    {
      name: "analytics-ingest",
      description: "Streams product and payment events into the data platform.",
      system: "Data Platform",
      repository: "data-pipeline",
      ownerTeam: "Data & Analytics",
      stack: ["Python", "Kafka"],
      dependsOn: ["checkout-api", "payments-worker"],
    },
  ];

  const serviceByName = new Map<string, { id: string }>();
  for (const spec of serviceSpecs) {
    const [row] = await db
      .insert(services)
      .values({
        organizationId: org.id,
        systemId: systemByName.get(spec.system)!.id,
        repositoryId: spec.repository
          ? repositoryByName.get(spec.repository)!.id
          : null,
        ownerTeamId: teamByName.get(spec.ownerTeam)!.id,
        name: spec.name,
        description: spec.description,
      })
      .returning();
    if (!row) throw new Error(`Failed to insert service ${spec.name}`);
    serviceByName.set(spec.name, { id: row.id });
  }
  console.log(`Created ${serviceByName.size} services`);

  const stackRows = serviceSpecs.flatMap((spec) =>
    spec.stack.map((techName) => ({
      serviceId: serviceByName.get(spec.name)!.id,
      technologyId: technologyByName.get(techName)!.id,
    })),
  );
  await db.insert(serviceTechnologies).values(stackRows);
  console.log(`Linked ${stackRows.length} service/technology pairs`);

  const dependencyRows = serviceSpecs.flatMap((spec) =>
    spec.dependsOn.map((depName) => ({
      serviceId: serviceByName.get(spec.name)!.id,
      dependsOnServiceId: serviceByName.get(depName)!.id,
    })),
  );
  await db.insert(serviceDependencies).values(dependencyRows);
  console.log(`Linked ${dependencyRows.length} service dependencies`);

  // --- Documents -----------------------------------------------------

  const documentRows = await db
    .insert(documents)
    .values(
      [
        {
          title: "Checkout API Architecture",
          type: "adr" as const,
          url: "https://docs.acme.example/adr/checkout-api",
          ownerTeam: "Payments",
        },
        {
          title: "Incident Response Runbook",
          type: "runbook" as const,
          url: "https://docs.acme.example/runbooks/incident-response",
          ownerTeam: "Site Reliability",
        },
        {
          title: "New Engineer Onboarding",
          type: "other" as const,
          url: "https://docs.acme.example/onboarding",
          ownerTeam: "Platform Engineering",
        },
      ].map(({ ownerTeam, ...d }) => ({
        ...d,
        organizationId: org.id,
        ownerTeamId: teamByName.get(ownerTeam)!.id,
      })),
    )
    .returning();
  console.log(`Created ${documentRows.length} documents`);

  // --- Workflows, with steps and assignees ------------------------------

  const workflowSpecs = [
    {
      name: "New service needs a tech stack",
      description:
        "Flags newly created services that have no technologies recorded yet.",
      triggerType: "entity_created" as const,
      triggerConfig: { entityType: "service" },
      owner: "Alex Kim",
      createdBy: "Priya Shah",
      status: "active" as const,
      steps: [
        {
          kind: "condition" as const,
          type: "field_empty",
          config: { field: "technologies" },
        },
        {
          kind: "action" as const,
          type: "notify",
          config: {
            message: "New service has no tech stack recorded.",
            channel: "team",
          },
        },
      ],
      assignees: ["Jordan Lee", "Dana Whitfield"],
    },
    {
      name: "Escalate stale runbooks",
      description:
        "Weekly check for runbooks that haven't been reviewed in a while.",
      triggerType: "scheduled" as const,
      triggerConfig: { cron: "0 9 * * 1" },
      owner: "Sam Rivera",
      createdBy: "Alex Kim",
      status: "draft" as const,
      steps: [
        {
          kind: "condition" as const,
          type: "field_older_than",
          config: { field: "updatedAt", days: 90 },
        },
        {
          kind: "action" as const,
          type: "notify",
          config: { message: "Runbook hasn't been reviewed in 90 days." },
        },
      ],
      assignees: ["Taylor Brooks", "Riley Chen"],
    },
  ];

  for (const spec of workflowSpecs) {
    const [workflowRow] = await db
      .insert(workflows)
      .values({
        organizationId: org.id,
        name: spec.name,
        description: spec.description,
        triggerType: spec.triggerType,
        triggerConfig: spec.triggerConfig,
        ownerPersonId: personByName.get(spec.owner)!.id,
        createdByPersonId: personByName.get(spec.createdBy)!.id,
        status: spec.status,
      })
      .returning();
    if (!workflowRow) throw new Error(`Failed to insert workflow ${spec.name}`);

    await db.insert(workflowSteps).values(
      spec.steps.map((step, index) => ({
        workflowId: workflowRow.id,
        stepOrder: index + 1,
        kind: step.kind,
        type: step.type,
        config: step.config,
      })),
    );

    await db.insert(workflowAssignees).values(
      spec.assignees.map((personName) => ({
        workflowId: workflowRow.id,
        personId: personByName.get(personName)!.id,
      })),
    );
  }
  console.log(`Created ${workflowSpecs.length} workflows with steps and assignees`);

  console.log("\nSeed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
