/**
 * @jest-environment node
 */
import { DELETE, PUT } from "@/app/api/teams/[id]/members/[personId]/route";

// jest.mock specifiers are plain strings, so they must be relative.
const findFirstMock = jest.fn();
const returningMock = jest.fn();
jest.mock("../../../src/db", () => {
  const tx = {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: returningMock }),
      }),
    }),
    delete: () => ({ where: jest.fn() }),
    // Locking and settling the person's primary team: no links, nothing to do.
    execute: async () => [],
  };
  return {
    getDb: () => ({
      query: {
        teams: { findFirst: findFirstMock },
        people: { findFirst: findFirstMock },
      },
      transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    }),
  };
});

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const TEAM = "11111111-1111-4111-8111-111111111111";
const PERSON = "22222222-2222-4222-8222-222222222222";
const params = (id = TEAM, personId = PERSON) => ({
  params: Promise.resolve({ id, personId }),
});
const session = (role: "viewer" | "editor") => ({
  userId: "user-1",
  organizationId: "org-a",
  organizationName: "A",
  organizationSlug: "a",
  role,
  name: "Test",
  email: "t@example.com",
});
const put = (body: unknown) =>
  new Request("http://localhost/api/teams/x/members/y", {
    method: "PUT",
    body: JSON.stringify(body),
  }) as never;

describe("PUT /api/teams/[id]/members/[personId]", () => {
  beforeEach(() => {
    findFirstMock.mockReset().mockResolvedValue({ id: "found" });
    returningMock
      .mockReset()
      .mockResolvedValue([
        { teamId: TEAM, personId: PERSON, teamRole: "lead" },
      ]);
    getSessionMock.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    getSessionMock.mockResolvedValue(null);
    const response = await PUT(put({ teamRole: "lead" }), params());
    expect(response.status).toBe(401);
  });

  it("forbids viewers", async () => {
    getSessionMock.mockResolvedValue(session("viewer"));
    const response = await PUT(put({ teamRole: "lead" }), params());
    expect(response.status).toBe(403);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown level", async () => {
    getSessionMock.mockResolvedValue(session("editor"));
    const response = await PUT(put({ teamRole: "boss" }), params());
    expect(response.status).toBe(400);
  });

  it("returns 404 when the person is not in the caller's organization", async () => {
    getSessionMock.mockResolvedValue(session("editor"));
    findFirstMock
      .mockResolvedValueOnce({ id: TEAM })
      .mockResolvedValueOnce(undefined);
    const response = await PUT(put({ teamRole: "member" }), params());
    expect(response.status).toBe(404);
    expect(returningMock).not.toHaveBeenCalled();
  });

  it("adds or updates the membership for an editor", async () => {
    getSessionMock.mockResolvedValue(session("editor"));
    const response = await PUT(put({ teamRole: "lead" }), params());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      membership: { teamId: TEAM, personId: PERSON, teamRole: "lead" },
    });
  });
});

describe("DELETE /api/teams/[id]/members/[personId]", () => {
  beforeEach(() => {
    findFirstMock.mockReset().mockResolvedValue({ id: "found" });
    getSessionMock.mockReset().mockResolvedValue(session("editor"));
  });

  it("removes the membership", async () => {
    const response = await DELETE(
      new Request("http://localhost/x", { method: "DELETE" }) as never,
      params(),
    );
    expect(response.status).toBe(204);
  });

  it("rejects a malformed person id", async () => {
    const response = await DELETE(
      new Request("http://localhost/x", { method: "DELETE" }) as never,
      params(TEAM, "nope"),
    );
    expect(response.status).toBe(400);
  });
});
