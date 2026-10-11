/**
 * Seeds a representative demo organisation ("Acme Corp") exercising every
 * table and relationship in the relational context model: teams, a manager
 * hierarchy, product accounts, a tool catalog, parent and child services
 * with tools and dependencies, documents, and workflows
 * with steps and role-based people (owners, creators, workers).
 *
 * Re-runnable: deletes the demo org (organizations.slug = "acme") first, if
 * it exists. The ON DELETE CASCADE on organization_id takes care of every
 * child row, so re-seeding never needs manual cleanup.
 *
 * Run with `npm run db:seed` (from apps/web).
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { getDb } from "../src/db";
import {
  documentFolders,
  documents,
  organizations,
  people,
  serviceDependencies,
  services,
  serviceTools,
  teamMembers,
  teams,
  tools,
  users,
  workflowPeople,
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

  // A person can be on several teams: everyone's home team, plus a few
  // people who also sit on a second one.
  const membershipRows = [
    ...peopleSpecs.map((spec) => ({ person: spec.name, team: spec.team })),
    { person: "Dana Whitfield", team: "Platform Engineering" },
  ].map((m) => ({
    personId: personByName.get(m.person)!.id,
    teamId: teamByName.get(m.team)!.id,
  }));
  await db.insert(teamMembers).values(membershipRows);
  console.log(`Created ${membershipRows.length} team memberships`);

  // --- Users (product accounts, linked back to a subset of people) ----

  // Demo-only credential, shared by every seeded account, so login can be
  // exercised locally without a real signup. Never used outside this script.
  const DEMO_PASSWORD = "acme-demo-password";
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

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
        passwordHash: demoPasswordHash,
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
  console.log(
    `Created ${userRows.length} users (log in with workspace "acme", any of their emails, password "${DEMO_PASSWORD}")`,
  );

  // --- Tools (flat catalog) ---------------------------------------------

  const toolRows = await db
    .insert(tools)
    .values(
      [
        { name: "TypeScript", category: "language" },
        { name: "Go", category: "language" },
        { name: "Python", category: "language" },
        { name: "React", category: "framework" },
        { name: "PostgreSQL", category: "database" },
        { name: "Redis", category: "database" },
        { name: "Kafka", category: "infrastructure" },
        { name: "Docker", category: "infrastructure" },
        {
          name: "GitHub",
          category: "source_control",
          vendor: "GitHub",
          url: "https://github.com",
        },
        {
          name: "Jira",
          category: "issue_tracking",
          vendor: "Atlassian",
          url: "https://atlassian.com/jira",
        },
        {
          name: "Confluence",
          category: "documentation",
          vendor: "Atlassian",
          url: "https://atlassian.com/confluence",
        },
        {
          name: "Buildkite",
          category: "ci_cd",
          vendor: "Buildkite",
          url: "https://buildkite.com",
        },
        {
          name: "LaunchDarkly",
          category: "feature_flags",
          vendor: "LaunchDarkly",
          url: "https://launchdarkly.com",
        },
        {
          name: "Datadog",
          category: "observability",
          vendor: "Datadog",
          url: "https://datadoghq.com",
        },
      ].map((t) => ({ ...t, organizationId: org.id })),
    )
    .returning();
  console.log(`Created ${toolRows.length} tools`);

  // --- Services (platforms with services under them), tools and dependencies

  const platformRows = await db
    .insert(services)
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
      ].map(({ ownerTeam, ...p }) => ({
        ...p,
        organizationId: org.id,
        ownerTeamId: teamByName.get(ownerTeam)!.id,
      })),
    )
    .returning();
  const platformByName = new Map(platformRows.map((p) => [p.name, p]));
  console.log(`Created ${platformRows.length} platform services`);

  const serviceSpecs = [
    {
      name: "checkout-api",
      description: "Core checkout and order orchestration API.",
      parent: "Checkout Platform",
      ownerTeam: "Payments",
      stack: ["Go", "PostgreSQL"],
      dependsOn: [] as string[],
    },
    {
      name: "checkout-web",
      description: "Customer-facing checkout UI.",
      parent: "Checkout Platform",
      ownerTeam: "Payments",
      stack: ["TypeScript", "React"],
      dependsOn: ["checkout-api"],
    },
    {
      name: "payments-worker",
      description: "Async payment capture, refunds and webhook processing.",
      parent: "Checkout Platform",
      ownerTeam: "Payments",
      stack: ["Python"],
      dependsOn: ["checkout-api"],
    },
    {
      name: "experiment-service",
      description: "Serves and records A/B experiment assignments.",
      parent: "Growth Platform",
      ownerTeam: "Growth",
      stack: ["TypeScript", "Redis"],
      dependsOn: ["checkout-api"],
    },
    {
      name: "analytics-ingest",
      description: "Streams product and payment events into the data platform.",
      parent: "Data Platform",
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
        parentId: platformByName.get(spec.parent)!.id,
        ownerTeamId: teamByName.get(spec.ownerTeam)!.id,
        name: spec.name,
        description: spec.description,
      })
      .returning();
    if (!row) throw new Error(`Failed to insert service ${spec.name}`);
    serviceByName.set(spec.name, { id: row.id });
  }
  console.log(`Created ${serviceByName.size} services`);

  const toolByName = new Map(toolRows.map((t) => [t.name, t]));
  const stackRows = serviceSpecs.flatMap((spec) =>
    spec.stack.map((toolName) => ({
      serviceId: serviceByName.get(spec.name)!.id,
      toolId: toolByName.get(toolName)!.id,
    })),
  );
  await db.insert(serviceTools).values(stackRows);
  console.log(`Linked ${stackRows.length} service/tool pairs`);

  const dependencyRows = serviceSpecs.flatMap((spec) =>
    spec.dependsOn.map((depName) => ({
      serviceId: serviceByName.get(spec.name)!.id,
      dependsOnServiceId: serviceByName.get(depName)!.id,
    })),
  );
  await db.insert(serviceDependencies).values(dependencyRows);
  console.log(`Linked ${dependencyRows.length} service dependencies`);

  // --- Documents -----------------------------------------------------

  const folderRows = await db
    .insert(documentFolders)
    .values(
      ["Engineering", "People"].map((name) => ({
        name,
        organizationId: org.id,
      })),
    )
    .returning();
  const [engineeringFolder, peopleFolder] = folderRows;
  const [runbooksFolder] = await db
    .insert(documentFolders)
    .values({
      name: "Runbooks",
      parentId: engineeringFolder!.id,
      organizationId: org.id,
    })
    .returning();
  console.log(`Created ${folderRows.length + 1} document folders`);

  const documentRows = await db
    .insert(documents)
    .values(
      [
        {
          title: "Checkout API Architecture",
          type: "adr" as const,
          url: "https://docs.acme.example/adr/checkout-api",
          ownerTeam: "Payments",
          folderId: engineeringFolder!.id,
          ownerPerson: "Jordan Lee",
        },
        {
          title: "Incident Response Runbook",
          type: "runbook" as const,
          url: "https://docs.acme.example/runbooks/incident-response",
          ownerTeam: "Site Reliability",
          folderId: runbooksFolder!.id,
          ownerPerson: "Dana Whitfield",
        },
        {
          title: "New Engineer Onboarding",
          type: "other" as const,
          url: "https://docs.acme.example/onboarding",
          ownerTeam: "Platform Engineering",
          folderId: peopleFolder!.id,
          ownerPerson: null as string | null,
        },
      ].map(({ ownerTeam, ownerPerson, ...d }) => ({
        ...d,
        organizationId: org.id,
        ownerTeamId: teamByName.get(ownerTeam)!.id,
        ownerPersonId: ownerPerson ? personByName.get(ownerPerson)!.id : null,
      })),
    )
    .returning();
  console.log(`Created ${documentRows.length} documents`);

  // --- Workflows, with steps and role-based people --------------------

  const workflowSpecs = [
    {
      name: "New service needs a tech stack",
      description:
        "Flags newly created services that have no tools recorded yet.",
      triggerType: "entity_created" as const,
      triggerConfig: { entityType: "service" },
      status: "active" as const,
      steps: [
        {
          kind: "condition" as const,
          type: "field_empty",
          config: { field: "tools" },
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
      // Two owners, to show a workflow isn't limited to one.
      owners: ["Alex Kim", "Priya Shah"],
      creators: ["Priya Shah"],
      workers: ["Jordan Lee", "Dana Whitfield"],
    },
    {
      name: "Escalate stale runbooks",
      description:
        "Weekly check for runbooks that haven't been reviewed in a while.",
      triggerType: "scheduled" as const,
      triggerConfig: { cron: "0 9 * * 1" },
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
      owners: ["Sam Rivera"],
      // Two creators, and Sam is both the owner above and a creator here,
      // to show one person can hold more than one role on a workflow.
      creators: ["Alex Kim", "Sam Rivera"],
      workers: ["Taylor Brooks", "Riley Chen"],
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

    const roleAssignments = [
      ...spec.owners.map((personName) => ({
        personName,
        role: "owner" as const,
      })),
      ...spec.creators.map((personName) => ({
        personName,
        role: "creator" as const,
      })),
      ...spec.workers.map((personName) => ({
        personName,
        role: "worker" as const,
      })),
    ];
    await db.insert(workflowPeople).values(
      roleAssignments.map(({ personName, role }) => ({
        workflowId: workflowRow.id,
        personId: personByName.get(personName)!.id,
        role,
      })),
    );
  }
  console.log(
    `Created ${workflowSpecs.length} workflows with steps and role-based people`,
  );

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
