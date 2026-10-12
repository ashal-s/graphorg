/**
 * @jest-environment node
 */
import {
  DELETE,
  PUT,
} from "@/app/api/departments/[id]/members/[personId]/route";

// jest.mock specifiers are plain strings, so they must be relative.
const findFirstMock = jest.fn();
const returningMock = jest.fn();
jest.mock("../../../src/db", () => ({
  getDb: () => ({
    query: {
      departments: { findFirst: findFirstMock },
      people: { findFirst: findFirstMock },
    },
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: returningMock }),
      }),
    }),
    delete: () => ({ where: jest.fn() }),
    // Settling the person's primary department: no links, nothing to do.
    execute: async () => [],
  }),
}));

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const DEPARTMENT = "11111111-1111-4111-8111-111111111111";
const PERSON = "22222222-2222-4222-8222-222222222222";

const session = (role: "viewer" | "editor") => ({
  userId: "u",
  organizationId: "org-a",
  organizationName: "A",
  organizationSlug: "a",
  role,
  name: "T",
  email: "t@example.com",
});

const params = (id = DEPARTMENT, personId = PERSON) => ({
  params: Promise.resolve({ id, personId }),
});

function put(body: unknown, id = DEPARTMENT, personId = PERSON) {
  return PUT(
    new Request("http://localhost/x", {
      method: "PUT",
      body: JSON.stringify(body),
    }) as never,
    params(id, personId),
  );
}

describe("department members", () => {
  beforeEach(() => {
    findFirstMock.mockReset().mockResolvedValue({ id: "found" });
    returningMock
      .mockReset()
      .mockResolvedValue([{ departmentId: DEPARTMENT, role: "lead" }]);
    getSessionMock.mockReset().mockResolvedValue(session("editor"));
  });

  it("rejects the signed-out and viewers", async () => {
    getSessionMock.mockResolvedValue(null);
    expect((await put({ role: "lead" })).status).toBe(401);
    getSessionMock.mockResolvedValue(session("viewer"));
    expect((await put({ role: "lead" })).status).toBe(403);
  });

  it("rejects a level that isn't lead, member or trainee", async () => {
    expect((await put({ role: "boss" })).status).toBe(400);
    expect((await put({})).status).toBe(400);
  });

  it("rejects malformed ids", async () => {
    expect((await put({ role: "lead" }, "nope")).status).toBe(400);
  });

  it("404s a department or person outside the organization", async () => {
    findFirstMock
      .mockReset()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "p" });
    expect((await put({ role: "lead" })).status).toBe(404);
  });

  it("adds a person at a level", async () => {
    const response = await put({ role: "lead" });
    expect(response.status).toBe(200);
    expect((await response.json()).membership.role).toBe("lead");
  });

  it("removes a person", async () => {
    const response = await DELETE(
      new Request("http://localhost/x", { method: "DELETE" }) as never,
      params(),
    );
    expect(response.status).toBe(204);
  });
});
