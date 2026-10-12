import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { departments, people, teams } from "@/db/schema";
import { loadPersonProfile } from "@/lib/directory/load-person-profile";
import {
  buildDepartmentTree,
  type DepartmentNode,
} from "@/lib/directory/departments";
import { loadOrgStructure } from "@/lib/directory/load-org-structure";
import { buildOrgChart, type OrgChartNode } from "@/lib/directory/org-chart";
import type {
  StructureDepartment,
  StructurePerson,
  StructureTeam,
} from "@/lib/directory/org-structure";

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
        columns: { teamRole: true, isPrimary: true },
        with: { team: { columns: { name: true, slug: true } } },
      },
      departmentLinks: {
        columns: { isPrimary: true },
        with: { department: { columns: { id: true, name: true } } },
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
          primary: m.isPrimary,
          path: contextPaths.team(m.team.slug),
        })),
        departments: row.departmentLinks.map((l) => ({
          name: l.department.name,
          primary: l.isPrimary,
          path: contextPaths.department(l.department.id),
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
      departmentLinks: {
        columns: { isPrimary: true },
        with: { department: { columns: { id: true, name: true } } },
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
        departments: row.departmentLinks.map((l) => ({
          name: l.department.name,
          primary: l.isPrimary,
          path: contextPaths.department(l.department.id),
        })),
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
  const [peopleRows, teamRows, departmentRows] = await Promise.all([
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
    getDb().query.departments.findMany({
      where: eq(departments.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: asc(departments.name),
    }),
  ]);

  return {
    page: "Directory",
    path: "/directory",
    data: {
      departmentCount: departmentRows.length,
      teamCount: teamRows.length,
      peopleCount: peopleRows.length,
      departments: departmentRows.map((d) => ({
        name: d.name,
        path: contextPaths.department(d.id),
      })),
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

/** The org chart: departments, teams and people, or who reports to whom. */
export async function buildOrgChartContext(
  orgId: string,
  tab: "structure" | "people" = "people",
): Promise<PageContext> {
  if (tab === "structure") return buildOrgStructureContext(orgId);

  const rows = await getDb().query.people.findMany({
    where: eq(people.organizationId, orgId),
    columns: { id: true, slug: true, name: true, title: true, managerId: true },
  });
  const roots = buildOrgChart(rows);

  return {
    page: "Org chart: people",
    path: "/org-chart",
    data: { count: rows.length, hierarchy: roots.map(chartNode) },
  };
}

async function buildOrgStructureContext(orgId: string): Promise<PageContext> {
  const structure = await loadOrgStructure(orgId);

  const person = (p: StructurePerson) => ({
    name: p.name,
    title: p.title,
    ...(p.teamRole ? { role: p.teamRole } : {}),
    path: contextPaths.person(p.slug),
  });
  const team = (t: StructureTeam) => ({
    name: t.name,
    path: contextPaths.team(t.slug),
    people: t.members.map(person),
  });
  const department = (d: StructureDepartment): unknown => ({
    name: d.name,
    path: contextPaths.department(d.id),
    heads: d.heads.map((h) => ({
      name: h.name,
      path: contextPaths.person(h.slug),
    })),
    subDepartments: d.children.map(department),
    teams: d.teams.map(team),
    peopleInDepartmentOnly: d.people.map(person),
  });

  return {
    page: "Org chart: departments and teams",
    path: "/org-chart?tab=structure",
    data: {
      departments: structure.departments.map(department),
      teamsWithoutDepartment: structure.teamsWithoutDepartment.map(team),
      peopleWithoutTeamOrDepartment: structure.peopleWithoutPlace.map(person),
    },
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

  // Which team is their primary one, and the departments they're directly in.
  const [teamLinks, departmentLinks] = await Promise.all([
    getDb().query.teamMembers.findMany({
      where: (row, { eq }) => eq(row.personId, id),
      columns: { teamId: true, isPrimary: true },
    }),
    getDb().query.departmentPeople.findMany({
      where: (row, { eq }) => eq(row.personId, id),
      columns: { isPrimary: true },
      with: { department: { columns: { id: true, name: true } } },
    }),
  ]);
  const primaryTeamIds = new Set(
    teamLinks.filter((l) => l.isPrimary).map((l) => l.teamId),
  );

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
        primary: primaryTeamIds.has(t.id),
        path: contextPaths.team(t.slug),
      })),
      departments: departmentLinks
        .map((l) => ({
          name: l.department.name,
          primary: l.isPrimary,
          path: contextPaths.department(l.department.id),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
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
        columns: { teamRole: true, isPrimary: true },
        with: {
          person: {
            columns: { id: true, name: true, slug: true, title: true },
          },
        },
      },
      departmentLinks: {
        columns: { isPrimary: true },
        with: { department: { columns: { id: true, name: true } } },
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
      departments: team.departmentLinks.map((l) => ({
        name: l.department.name,
        primary: l.isPrimary,
        path: contextPaths.department(l.department.id),
      })),
      members: team.memberships
        .map((m) => ({
          name: m.person.name,
          title: m.person.title,
          role: m.teamRole,
          isTheirPrimaryTeam: m.isPrimary,
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

/** Departments as a hierarchy: heads and counts only, sub-departments nested. */
export async function buildDepartments(orgId: string): Promise<PageContext> {
  const rows = await getDb().query.departments.findMany({
    where: eq(departments.organizationId, orgId),
    with: {
      heads: { with: { person: { columns: { name: true, slug: true } } } },
      teams: { columns: { teamId: true } },
      people: { columns: { personId: true } },
    },
  });

  type Row = {
    id: string;
    name: string;
    parentId: string | null;
    description: string | null;
    heads: Array<{ name: string; path: string }>;
    teamCount: number;
    peopleCount: number;
  };
  const roots = buildDepartmentTree<Row>(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      description: row.description,
      heads: row.heads
        .map((h) => ({
          name: h.person.name,
          path: contextPaths.person(h.person.slug),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      teamCount: row.teams.length,
      peopleCount: row.people.length,
    })),
  );
  const shape = (node: DepartmentNode<Row>): unknown => ({
    name: node.name,
    description: node.description,
    path: contextPaths.department(node.id),
    heads: node.heads,
    teamCount: node.teamCount,
    peopleCount: node.peopleCount,
    subDepartments: node.children.map(shape),
  });

  return {
    page: "Departments",
    path: "/directory/departments",
    data: { count: rows.length, hierarchy: roots.map(shape) },
  };
}

/** One department: where it sits, who heads it, and its teams and people. */
export async function buildDepartment(
  orgId: string,
  id: string,
): Promise<PageContext | null> {
  const department = await getDb().query.departments.findFirst({
    where: and(eq(departments.id, id), eq(departments.organizationId, orgId)),
    with: {
      parent: { columns: { id: true, name: true } },
      heads: {
        with: { person: { columns: { name: true, slug: true, title: true } } },
      },
      children: { columns: { id: true, name: true } },
      teams: {
        columns: { isPrimary: true },
        with: { team: { columns: { name: true, slug: true } } },
      },
      people: {
        columns: { isPrimary: true },
        with: { person: { columns: { name: true, slug: true, title: true } } },
      },
    },
  });
  if (!department) return null;

  const byName = <T extends { name: string }>(a: T, b: T) =>
    a.name.localeCompare(b.name);

  return {
    page: department.name,
    path: contextPaths.department(department.id),
    data: {
      name: department.name,
      description: department.description,
      parent: department.parent && {
        name: department.parent.name,
        path: contextPaths.department(department.parent.id),
      },
      heads: department.heads
        .map((h) => ({
          name: h.person.name,
          title: h.person.title,
          path: contextPaths.person(h.person.slug),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      subDepartments: department.children
        .map((c) => ({
          name: c.name,
          path: contextPaths.department(c.id),
        }))
        .sort(byName),
      teams: department.teams
        .map((l) => ({
          name: l.team.name,
          primary: l.isPrimary,
          path: contextPaths.team(l.team.slug),
        }))
        .sort(byName),
      people: department.people
        .map((l) => ({
          name: l.person.name,
          title: l.person.title,
          primary: l.isPrimary,
          path: contextPaths.person(l.person.slug),
        }))
        .sort(byName),
    },
  };
}
