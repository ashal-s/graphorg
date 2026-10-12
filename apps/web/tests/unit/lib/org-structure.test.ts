import {
  buildOrgStructure,
  type OrgStructureInput,
} from "@/lib/directory/org-structure";

const person = (id: string, name = id) => ({
  id,
  slug: id,
  name,
  title: null,
  photoUrl: null,
});

function input(overrides: Partial<OrgStructureInput> = {}): OrgStructureInput {
  return {
    departments: [],
    teams: [],
    people: [],
    departmentTeams: [],
    departmentPeople: [],
    teamMembers: [],
    ...overrides,
  };
}

describe("buildOrgStructure", () => {
  it("nests teams in departments and people in teams", () => {
    const result = buildOrgStructure(
      input({
        departments: [
          { id: "eng", name: "Engineering", parentId: null },
          { id: "plat", name: "Platform Org", parentId: "eng" },
        ],
        teams: [{ id: "t1", slug: "payments", name: "Payments" }],
        people: [person("a", "Ana"), person("b", "Ben")],
        departmentTeams: [{ departmentId: "plat", teamId: "t1" }],
        teamMembers: [
          { teamId: "t1", personId: "b", teamRole: "member" },
          { teamId: "t1", personId: "a", teamRole: "lead" },
        ],
      }),
    );

    expect(result.departments.map((d) => d.id)).toEqual(["eng"]);
    const plat = result.departments[0]!.children[0]!;
    expect(plat.id).toBe("plat");
    expect(plat.teams.map((t) => t.name)).toEqual(["Payments"]);
    // Leads first.
    expect(plat.teams[0]!.members.map((m) => m.name)).toEqual(["Ana", "Ben"]);
    expect(result.teamsWithoutDepartment).toEqual([]);
    expect(result.peopleWithoutPlace).toEqual([]);
  });

  it("lists a team under every department it is in", () => {
    const result = buildOrgStructure(
      input({
        departments: [
          { id: "d1", name: "A", parentId: null },
          { id: "d2", name: "B", parentId: null },
        ],
        teams: [{ id: "t", slug: "t", name: "T" }],
        departmentTeams: [
          { departmentId: "d1", teamId: "t" },
          { departmentId: "d2", teamId: "t" },
        ],
      }),
    );
    expect(result.departments.map((d) => d.teams.length)).toEqual([1, 1]);
    expect(result.teamsWithoutDepartment).toEqual([]);
  });

  it("puts direct department people on the department unless a team already shows them", () => {
    const result = buildOrgStructure(
      input({
        departments: [{ id: "d", name: "D", parentId: null }],
        teams: [{ id: "t", slug: "t", name: "T" }],
        people: [person("on-team"), person("direct")],
        departmentTeams: [{ departmentId: "d", teamId: "t" }],
        departmentPeople: [
          { departmentId: "d", personId: "on-team", role: "member" },
          { departmentId: "d", personId: "direct", role: "member" },
        ],
        teamMembers: [{ teamId: "t", personId: "on-team", teamRole: "member" }],
      }),
    );
    expect(result.departments[0]!.people.map((p) => p.id)).toEqual(["direct"]);
  });

  it("keeps teams without a department and people without a place", () => {
    const result = buildOrgStructure(
      input({
        teams: [{ id: "t", slug: "t", name: "Lonely" }],
        people: [person("x", "Xena"), person("y", "Yan")],
        teamMembers: [{ teamId: "t", personId: "y", teamRole: "member" }],
      }),
    );
    expect(result.teamsWithoutDepartment.map((t) => t.name)).toEqual([
      "Lonely",
    ]);
    expect(result.peopleWithoutPlace.map((p) => p.name)).toEqual(["Xena"]);
  });

  it("shows direct department people at their department level", () => {
    const result = buildOrgStructure(
      input({
        departments: [{ id: "d", name: "D", parentId: null }],
        people: [person("l", "Lena"), person("m", "Max")],
        departmentPeople: [
          { departmentId: "d", personId: "m", role: "member" },
          { departmentId: "d", personId: "l", role: "lead" },
        ],
      }),
    );
    expect(
      result.departments[0]!.people.map((p) => [p.name, p.teamRole]),
    ).toEqual([
      ["Lena", "lead"],
      ["Max", "member"],
    ]);
  });
});
