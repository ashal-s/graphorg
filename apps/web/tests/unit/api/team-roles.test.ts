/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { PATCH } from "@/app/api/people/[id]/route";
import { DELETE } from "@/app/api/team-functions/[id]/route";
import { POST } from "@/app/api/team-functions/route";

const PERSON = "11111111-1111-4111-8111-111111111111";
const TEAM_A = "22222222-2222-4222-8222-222222222222";
const TEAM_B = "33333333-3333-4333-8333-333333333333";
const FUNCTION = "44444444-4444-4444-8444-444444444444";

const findFirstMock = jest.fn();
const selectRowsMock = jest.fn();
const setMock = jest.fn();
const returningMock = jest.fn();
const insertValuesMock = jest.fn();
const deleteReturningMock = jest.fn();

function makeDb() {
  return {
    query: { people: { findFirst: findFirstMock } },
    // findMissingInOrg: select().from().where() -> rows that exist.
    select: () => ({ from: () => ({ where: () => selectRowsMock() }) }),
    transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        update: () => ({
          set: (values: unknown) => {
            setMock(values);
            return { where: () => ({ returning: returningMock }) };
          },
        }),
      }),
    insert: () => ({
      values: (values: unknown) => {
        insertValuesMock(values);
        return { returning: returningMock };
      },
    }),
    delete: () => ({
      where: () => ({ returning: deleteReturningMock }),
    }),
  };
}
jest.mock("../../../src/db", () => ({ getDb: () => makeDb() }));

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const session = (role: "viewer" | "editor" | "admin" | "owner") => ({
  userId: "user-1",
  organizationId: "org-a",
  organizationName: "Org",
  organizationSlug: "org",
  role,
  name: "Test",
  email: "t@example.com",
});

const req = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/x", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const personParams = { params: Promise.resolve({ id: PERSON }) };

beforeEach(() => {
  findFirstMock.mockReset().mockResolvedValue({ id: PERSON, teamId: TEAM_A });
  selectRowsMock.mockReset();
  setMock.mockReset();
  returningMock.mockReset().mockResolvedValue([{ id: PERSON }]);
  insertValuesMock.mockReset();
  deleteReturningMock.mockReset().mockResolvedValue([{ id: FUNCTION }]);
  getSessionMock.mockReset().mockResolvedValue(session("editor"));
});

describe("PATCH /api/people/[id] team level and function", () => {
  it("sets a lead level without touching other fields", async () => {
    const response = await PATCH(
      req("PATCH", { teamRole: "lead" }),
      personParams,
    );
    expect(response.status).toBe(200);
    expect(setMock.mock.calls[0]![0]).toMatchObject({ teamRole: "lead" });
  });

  it("rejects an unknown level", async () => {
    const response = await PATCH(
      req("PATCH", { teamRole: "co-lead" }),
      personParams,
    );
    expect(response.status).toBe(400);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("rejects a function from another organization", async () => {
    selectRowsMock.mockResolvedValue([]);
    const response = await PATCH(
      req("PATCH", { functionId: FUNCTION }),
      personParams,
    );
    expect(response.status).toBe(400);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("accepts a function in this organization", async () => {
    selectRowsMock.mockResolvedValue([{ id: FUNCTION }]);
    const response = await PATCH(
      req("PATCH", { functionId: FUNCTION }),
      personParams,
    );
    expect(response.status).toBe(200);
    expect(setMock.mock.calls[0]![0]).toMatchObject({ functionId: FUNCTION });
  });

  it("resets the level to member when moved to another team", async () => {
    selectRowsMock.mockResolvedValue([{ id: TEAM_B }]);
    await PATCH(req("PATCH", { teamId: TEAM_B }), personParams);
    expect(setMock.mock.calls[0]![0]).toMatchObject({
      teamId: TEAM_B,
      teamRole: "member",
    });
  });

  it("resets level and drops the function when removed from a team", async () => {
    await PATCH(req("PATCH", { teamId: null }), personParams);
    expect(setMock.mock.calls[0]![0]).toMatchObject({
      teamId: null,
      teamRole: "member",
      functionId: null,
    });
  });

  it("keeps the level when the team is unchanged", async () => {
    selectRowsMock.mockResolvedValue([{ id: TEAM_A }]);
    await PATCH(req("PATCH", { teamId: TEAM_A }), personParams);
    expect(setMock.mock.calls[0]![0]).not.toHaveProperty("teamRole", "member");
  });

  it("lets an explicit level win when moving teams", async () => {
    selectRowsMock.mockResolvedValue([{ id: TEAM_B }]);
    await PATCH(
      req("PATCH", { teamId: TEAM_B, teamRole: "lead" }),
      personParams,
    );
    expect(setMock.mock.calls[0]![0]).toMatchObject({ teamRole: "lead" });
  });
});

describe("team functions", () => {
  it("rejects non-admins creating a function", async () => {
    const response = await POST(req("POST", { name: "DevOps" }));
    expect(response.status).toBe(403);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("lets an admin create one in their organization", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    returningMock.mockResolvedValue([{ id: FUNCTION, name: "DevOps" }]);
    const response = await POST(req("POST", { name: "  DevOps " }));
    expect(response.status).toBe(201);
    expect(insertValuesMock.mock.calls[0]![0]).toEqual({
      name: "DevOps",
      organizationId: "org-a",
    });
  });

  it("rejects non-admins deleting a function", async () => {
    const response = await DELETE(req("DELETE"), {
      params: Promise.resolve({ id: FUNCTION }),
    });
    expect(response.status).toBe(403);
  });

  it("404s deleting a function that isn't in this organization", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    deleteReturningMock.mockResolvedValue([]);
    const response = await DELETE(req("DELETE"), {
      params: Promise.resolve({ id: FUNCTION }),
    });
    expect(response.status).toBe(404);
  });
});
