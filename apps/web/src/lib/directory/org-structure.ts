import {
  MEMBERSHIP_LEVEL_RANK,
  type MembershipLevel,
} from "@/lib/membership-levels";

import { buildDepartmentTree, type DepartmentNode } from "./departments";

export interface StructurePerson {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  /** Their level on the team they are shown under. */
  teamRole?: MembershipLevel;
}

export interface StructureTeam {
  id: string;
  slug: string;
  name: string;
  members: StructurePerson[];
}

export interface StructureDepartmentBase {
  id: string;
  name: string;
  parentId: string | null;
  teams: StructureTeam[];
  /** People in the department who aren't on one of its teams, at their department level. */
  people: StructurePerson[];
}

export type StructureDepartment = DepartmentNode<StructureDepartmentBase>;

export interface OrgStructure {
  departments: StructureDepartment[];
  /** Teams that aren't in any department. */
  teamsWithoutDepartment: StructureTeam[];
  /** People on no team and in no department. */
  peopleWithoutPlace: StructurePerson[];
}

export interface OrgStructureInput {
  departments: { id: string; name: string; parentId: string | null }[];
  teams: { id: string; slug: string; name: string }[];
  people: Omit<StructurePerson, "teamRole">[];
  /** Which teams are in which departments. */
  departmentTeams: { departmentId: string; teamId: string }[];
  /** Who is directly in which department, and at what level. */
  departmentPeople: {
    departmentId: string;
    personId: string;
    role: MembershipLevel;
  }[];
  teamMembers: {
    teamId: string;
    personId: string;
    teamRole: MembershipLevel;
  }[];
}

const ROLE_RANK = MEMBERSHIP_LEVEL_RANK;

const byName = <T extends { name: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name);

/**
 * Lays the organisation out as departments (nested under their parents),
 * the teams in each, and the people on each team. A team in several
 * departments appears under each. People directly in a department but on
 * none of its teams are listed on the department itself. Teams with no
 * department, and people with no team or department, come back separately
 * so nothing disappears from the chart.
 */
export function buildOrgStructure(input: OrgStructureInput): OrgStructure {
  const personById = new Map(input.people.map((p) => [p.id, p]));
  const teamById = new Map(input.teams.map((t) => [t.id, t]));

  const membersByTeam = new Map<string, StructurePerson[]>();
  for (const link of input.teamMembers) {
    const person = personById.get(link.personId);
    if (!person) continue;
    const list = membersByTeam.get(link.teamId) ?? [];
    list.push({ ...person, teamRole: link.teamRole });
    membersByTeam.set(link.teamId, list);
  }
  const toTeam = (teamId: string): StructureTeam | null => {
    const team = teamById.get(teamId);
    if (!team) return null;
    const members = [...(membersByTeam.get(teamId) ?? [])].sort(
      (a, b) =>
        ROLE_RANK[a.teamRole ?? "member"] - ROLE_RANK[b.teamRole ?? "member"] ||
        a.name.localeCompare(b.name),
    );
    return { ...team, members };
  };

  const teamsOf = new Map<string, string[]>();
  for (const link of input.departmentTeams) {
    const list = teamsOf.get(link.departmentId) ?? [];
    list.push(link.teamId);
    teamsOf.set(link.departmentId, list);
  }
  const peopleOf = new Map<
    string,
    { personId: string; role: "lead" | "member" | "trainee" }[]
  >();
  for (const link of input.departmentPeople) {
    const list = peopleOf.get(link.departmentId) ?? [];
    list.push({ personId: link.personId, role: link.role });
    peopleOf.set(link.departmentId, list);
  }

  const flat: StructureDepartmentBase[] = input.departments.map(
    (department) => {
      const teams = (teamsOf.get(department.id) ?? [])
        .map(toTeam)
        .filter((team): team is StructureTeam => team !== null)
        .sort(byName);
      const onATeam = new Set(
        teams.flatMap((team) => team.members.map((m) => m.id)),
      );
      const people = (peopleOf.get(department.id) ?? [])
        .filter((link) => !onATeam.has(link.personId))
        .flatMap((link) => {
          const person = personById.get(link.personId);
          return person ? [{ ...person, teamRole: link.role }] : [];
        })
        .sort(
          (a, b) =>
            ROLE_RANK[a.teamRole ?? "member"] -
              ROLE_RANK[b.teamRole ?? "member"] || a.name.localeCompare(b.name),
        );
      return { ...department, teams, people };
    },
  );

  const inADepartment = new Set(input.departmentTeams.map((l) => l.teamId));
  const teamsWithoutDepartment = input.teams
    .filter((team) => !inADepartment.has(team.id))
    .map((team) => toTeam(team.id))
    .filter((team): team is StructureTeam => team !== null)
    .sort(byName);

  const placed = new Set<string>([
    ...input.teamMembers.map((l) => l.personId),
    ...input.departmentPeople.map((l) => l.personId),
  ]);
  const peopleWithoutPlace = input.people
    .filter((person) => !placed.has(person.id))
    .sort(byName);

  return {
    departments: buildDepartmentTree(flat),
    teamsWithoutDepartment,
    peopleWithoutPlace,
  };
}
