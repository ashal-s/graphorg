import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { departments, people, teams } from "@/db/schema";
import { personPhotoSrc } from "@/lib/person-photo";

import { buildOrgStructure, type OrgStructure } from "./org-structure";

/** Everything the org chart's structure view needs, laid out. */
export async function loadOrgStructure(orgId: string): Promise<OrgStructure> {
  const db = getDb();
  const [deptRows, teamRows, peopleRows] = await Promise.all([
    db.query.departments.findMany({
      where: eq(departments.organizationId, orgId),
      columns: { id: true, name: true, parentId: true },
      with: {
        teams: { columns: { teamId: true } },
        people: { columns: { personId: true } },
        heads: { columns: { personId: true } },
      },
    }),
    db.query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, slug: true, name: true },
      with: { memberships: { columns: { personId: true, teamRole: true } } },
    }),
    db.query.people.findMany({
      where: eq(people.organizationId, orgId),
      columns: {
        id: true,
        slug: true,
        name: true,
        title: true,
        photoUrl: true,
        updatedAt: true,
      },
    }),
  ]);

  return buildOrgStructure({
    departments: deptRows.map((d) => ({
      id: d.id,
      name: d.name,
      parentId: d.parentId,
    })),
    teams: teamRows.map((t) => ({ id: t.id, slug: t.slug, name: t.name })),
    people: peopleRows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      title: p.title,
      photoUrl: personPhotoSrc(p),
    })),
    departmentTeams: deptRows.flatMap((d) =>
      d.teams.map((l) => ({ departmentId: d.id, teamId: l.teamId })),
    ),
    departmentPeople: deptRows.flatMap((d) =>
      d.people.map((l) => ({ departmentId: d.id, personId: l.personId })),
    ),
    departmentHeads: deptRows.flatMap((d) =>
      d.heads.map((l) => ({ departmentId: d.id, personId: l.personId })),
    ),
    teamMembers: teamRows.flatMap((t) =>
      t.memberships.map((m) => ({
        teamId: t.id,
        personId: m.personId,
        teamRole: m.teamRole,
      })),
    ),
  });
}
