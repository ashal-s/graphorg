import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { people, teams } from "@/db/schema";
import { loadPersonProfile } from "@/lib/directory/load-person-profile";
import { buildOrgChart, type OrgChartNode } from "@/lib/directory/org-chart";

import { contextPaths } from "../paths";
import type { PageContext } from "../types";

const LEAD_FIRST = (a: { role: string }, b: { role: string }) =>
  Number(b.role === "lead") - Number(a.role === "lead");

/** Everyone: name, title, teams and manager. Contact details are left out. */
export async function buildPeople(orgId: string): Promise<PageContext> {
  const rows = await getDb().query.people.findMany({
    where: eq(people.organizationId, orgId),
    columns: { name: true, slug: true, title: true },
    with: {
      memberships: {
        columns: { teamRole: true },
        with: { team: { columns: { name: true, slug: true } } },
      },
      manager: { columns: { name: true, slug: true } },
    },
    orderBy: asc(people.name),
  });

  return {
    page: "People",
    path: "/directory/people",
    data: {
      count: rows.length,
      people: rows.map((row) => ({
        name: row.name,
        title: row.title,
        path: contextPaths.person(row.slug),
        teams: row.memberships.map((m) => ({
          name: m.team.name,
          role: m.teamRole,
          path: contextPaths.team(m.team.slug),
        })),
        manager: row.manager
          ? {
              name: row.manager.name,
              path: contextPaths.person(row.manager.slug),
            }
          : null,
      })),
    },
  };
}

/** Each team with its members as name and title only. */
export async function buildTeams(orgId: string): Promise<PageContext> {
  const rows = await getDb().query.teams.findMany({
    where: eq(teams.organizationId, orgId),
    columns: { name: true, slug: true, description: true },
    with: {
      memberships: {
        columns: { teamRole: true },
        with: { person: { columns: { name: true, slug: true, title: true } } },
      },
    },
    orderBy: asc(teams.name),
  });

  return {
    page: "Teams",
    path: "/directory/teams",
    data: {
      count: rows.length,
      teams: rows.map((row) => ({
        name: row.name,
        description: row.description,
        path: contextPaths.team(row.slug),
        memberCount: row.memberships.length,
        members: row.memberships
          .map((m) => ({
            name: m.person.name,
            title: m.person.title,
            role: m.teamRole,
            path: contextPaths.person(m.person.slug),
          }))
          .sort((a, b) => LEAD_FIRST(a, b) || a.name.localeCompare(b.name)),
      })),
    },
  };
}

export async function buildDirectory(orgId: string): Promise<PageContext> {
  const [peopleRows, teamRows] = await Promise.all([
    getDb().query.people.findMany({
      where: eq(people.organizationId, orgId),
      columns: { name: true, slug: true, title: true },
      orderBy: asc(people.name),
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { name: true, slug: true },
      orderBy: asc(teams.name),
    }),
  ]);

  return {
    page: "Directory",
    path: "/directory",
    data: {
      peopleCount: peopleRows.length,
      teamCount: teamRows.length,
      teams: teamRows.map((t) => ({
        name: t.name,
        path: contextPaths.team(t.slug),
      })),
      people: peopleRows.map((p) => ({
        name: p.name,
        title: p.title,
        path: contextPaths.person(p.slug),
      })),
    },
  };
}

function chartNode(node: OrgChartNode): unknown {
  return {
    name: node.name,
    title: node.title,
    path: contextPaths.person(node.slug ?? node.id),
    reports: node.reports.map(chartNode),
  };
}

export async function buildOrgChartContext(
  orgId: string,
): Promise<PageContext> {
  const rows = await getDb().query.people.findMany({
    where: eq(people.organizationId, orgId),
    columns: { id: true, slug: true, name: true, title: true, managerId: true },
  });
  const roots = buildOrgChart(rows);

  return {
    page: "Org chart",
    path: "/org-chart",
    data: { count: rows.length, hierarchy: roots.map(chartNode) },
  };
}

/** One person, in full. Related records are references to their own pages. */
export async function buildPerson(
  orgId: string,
  id: string,
): Promise<PageContext | null> {
  const loaded = await loadPersonProfile(orgId, id);
  if (!loaded) return null;
  const { person, profile } = loaded;

  return {
    page: person.name,
    path: contextPaths.person(person.slug),
    data: {
      name: person.name,
      title: person.title,
      email: person.email,
      manager: profile.manager && {
        name: profile.manager.name,
        path: contextPaths.person(profile.manager.slug),
      },
      directReports: profile.directReports.map((r) => ({
        name: r.name,
        path: contextPaths.person(r.slug),
      })),
      teams: profile.teams.map((t) => ({
        name: t.name,
        path: contextPaths.team(t.slug),
      })),
      services: profile.services.map((s) => ({
        name: s.name,
        description: s.description,
        assignedDirectly: s.direct,
        path: contextPaths.service(s.id),
      })),
      tools: profile.tools.map((t) => ({
        name: t.name,
        category: t.category,
        path: contextPaths.tool(t.id),
      })),
      documents: profile.documents.map((d) => ({
        name: d.title,
        type: d.type,
        path: contextPaths.document(d.id),
      })),
      workflows: profile.workflows.map((w) => ({
        name: w.name,
        status: w.status,
        roles: w.roles,
        path: contextPaths.workflow(w.id),
      })),
    },
  };
}

/** One team: its details, members by name and title, and what it owns. */
export async function buildTeam(
  orgId: string,
  id: string,
): Promise<PageContext | null> {
  const team = await getDb().query.teams.findFirst({
    where: and(eq(teams.id, id), eq(teams.organizationId, orgId)),
    with: {
      memberships: {
        columns: { teamRole: true },
        with: {
          person: {
            columns: { id: true, name: true, slug: true, title: true },
          },
        },
      },
    },
  });
  if (!team) return null;

  const db = getDb();
  const [services, documents] = await Promise.all([
    db.query.services.findMany({
      where: (row, { and, eq }) =>
        and(eq(row.ownerTeamId, id), eq(row.organizationId, orgId)),
      columns: { id: true, name: true, description: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    db.query.documents.findMany({
      where: (row, { and, eq }) =>
        and(eq(row.ownerTeamId, id), eq(row.organizationId, orgId)),
      columns: { id: true, title: true, type: true },
      orderBy: (row, { asc }) => asc(row.title),
    }),
  ]);

  const memberIds = team.memberships.map((m) => m.person.id);
  // Workflows belong to people, not teams: these are the ones its members have.
  const workflowLinks = memberIds.length
    ? await db.query.workflowPeople.findMany({
        where: (row, { inArray }) => inArray(row.personId, memberIds),
        with: {
          workflow: {
            columns: {
              id: true,
              name: true,
              status: true,
              organizationId: true,
            },
          },
        },
      })
    : [];
  const workflows = new Map<string, { name: string; status: string }>();
  for (const link of workflowLinks) {
    if (link.workflow.organizationId !== orgId) continue;
    workflows.set(link.workflow.id, {
      name: link.workflow.name,
      status: link.workflow.status,
    });
  }

  return {
    page: team.name,
    path: contextPaths.team(team.slug),
    data: {
      name: team.name,
      description: team.description,
      members: team.memberships
        .map((m) => ({
          name: m.person.name,
          title: m.person.title,
          role: m.teamRole,
          path: contextPaths.person(m.person.slug),
        }))
        .sort((a, b) => LEAD_FIRST(a, b) || a.name.localeCompare(b.name)),
      services: services.map((s) => ({
        name: s.name,
        description: s.description,
        path: contextPaths.service(s.id),
      })),
      documents: documents.map((d) => ({
        name: d.title,
        type: d.type,
        path: contextPaths.document(d.id),
      })),
      workflows: [...workflows.entries()].map(([wid, w]) => ({
        ...w,
        path: contextPaths.workflow(wid),
      })),
    },
  };
}
