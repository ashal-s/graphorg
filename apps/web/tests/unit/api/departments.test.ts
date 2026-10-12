/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/departments/route";
import { PATCH } from "@/app/api/departments/[id]/route";

// jest.mock specifiers are plain strings, so they must be relative.
const findFirstMock = jest.fn();
jest.mock("../../../src/db", () => ({
  getDb: () => ({
    query: { departments: { findFirst: findFirstMock } },
    // Reads for parent/head/team/person checks: nothing in this tenant.
    select: () => ({ from: () => ({ where: async () => [] }) }),
  }),
}));

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const session = (role: "viewer" | "editor") => ({
  userId: "user-1",
  organizationId: "org-a",
  organizationName: "A",
  organizationSlug: "a",
  role,
  name: "Test",
  email: "test@example.com",
});

const ID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function post(body: unknown) {
  return new NextRequest("http://localhost/api/departments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function patch(body: unknown, id = ID) {
  return PATCH(
    new NextRequest(`http://localhost/api/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/departments", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    findFirstMock.mockReset();
  });

  it("rejects the signed-out", async () => {
    getSessionMock.mockResolvedValue(null);
    expect((await POST(post({ name: "Eng" }))).status).toBe(401);
  });

  it("rejects viewers", async () => {
    getSessionMock.mockResolvedValue(session("viewer"));
    expect((await POST(post({ name: "Eng" }))).status).toBe(403);
  });

  it("rejects a body without a name", async () => {
    getSessionMock.mockResolvedValue(session("editor"));
    expect((await POST(post({ description: "x" }))).status).toBe(400);
  });

  it("rejects a malformed parent id", async () => {
    getSessionMock.mockResolvedValue(session("editor"));
    const response = await POST(post({ name: "Eng", parentId: "nope" }));
    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/departments/[id]", () => {
  beforeEach(() => {
    getSessionMock.mockReset().mockResolvedValue(session("editor"));
    findFirstMock.mockReset();
  });

  it("404s a department outside the caller's organization", async () => {
    findFirstMock.mockResolvedValue(undefined);
    expect((await patch({ name: "New" })).status).toBe(404);
  });

  it("rejects making a department its own parent", async () => {
    findFirstMock.mockResolvedValue({ id: ID, teams: [], people: [] });
    const response = await patch({ parentId: ID });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/inside itself/);
  });

  it("rejects a parent that is not in this organization", async () => {
    findFirstMock.mockResolvedValue({ id: ID, teams: [], people: [] });
    const response = await patch({ parentId: OTHER });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/parentId/);
  });

  it("rejects an empty patch", async () => {
    findFirstMock.mockResolvedValue({ id: ID, teams: [], people: [] });
    expect((await patch({})).status).toBe(400);
  });
});
