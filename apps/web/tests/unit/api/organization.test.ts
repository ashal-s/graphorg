/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { organizations } from "@/db/schema";
import { GET, PATCH } from "@/app/api/organization/route";

// jest.mock's specifier is a plain string argument, not an import statement,
// so Next's SWC path-alias rewrite never touches it — it must be relative.
const findFirstMock = jest.fn();
const returningMock = jest.fn();
const setMock = jest.fn(() => ({
  where: () => ({ returning: returningMock }),
}));
jest.mock("../../../src/db", () => ({
  getDb: () => ({
    query: { organizations: { findFirst: findFirstMock } },
    update: () => ({ set: setMock }),
  }),
}));

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const actualDrizzleOrm = jest.requireActual("drizzle-orm");
const eqSpy = jest.fn(actualDrizzleOrm.eq);
jest.mock("drizzle-orm", () => ({
  ...jest.requireActual("drizzle-orm"),
  eq: (...args: unknown[]) => eqSpy(...args),
}));

const session = (
  organizationId: string,
  role: "editor" | "admin" = "admin",
) => ({
  userId: "user-1",
  organizationId,
  organizationName: organizationId,
  organizationSlug: organizationId,
  role,
  name: "Test",
  email: "test@example.com",
});

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/organization", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * `/api/organization` is singular (not `/api/organizations`): a caller only
 * ever has one organization, so GET/PATCH always act on the signed-in
 * session's own organizationId, never one taken from the request. PATCH is
 * gated to `admin`+, one step above the `editor` threshold every other
 * WEB-132/136 write uses, since renaming the workspace also changes the
 * slug every member signs in with.
 */
describe("GET /api/organization", () => {
  beforeEach(() => {
    findFirstMock.mockReset().mockResolvedValue({ id: "org-a", name: "Acme" });
    getSessionMock.mockReset();
    eqSpy.mockClear();
  });

  it("rejects unauthenticated requests without querying the database", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the caller's own organization_id", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(eqSpy).toHaveBeenCalledWith(organizations.id, "org-a");
  });
});

describe("PATCH /api/organization", () => {
  beforeEach(() => {
    setMock.mockClear();
    returningMock
      .mockReset()
      .mockResolvedValue([{ id: "org-a", name: "New Name" }]);
    getSessionMock.mockReset();
  });

  it("rejects an editor (below the admin role required to rename the workspace)", async () => {
    getSessionMock.mockResolvedValue(session("org-a", "editor"));

    const response = await PATCH(patchRequest({ name: "New Name" }));

    expect(response.status).toBe(403);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("rejects an empty patch body", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await PATCH(patchRequest({}));

    expect(response.status).toBe(400);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("allows an admin to rename the workspace", async () => {
    getSessionMock.mockResolvedValue(session("org-a", "admin"));

    const response = await PATCH(patchRequest({ name: "New Name" }));

    expect(response.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Name" }),
    );
  });
});
