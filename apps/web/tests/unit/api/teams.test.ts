/**
 * @jest-environment node
 */
import { teams } from "@/db/schema";
import { GET } from "@/app/api/teams/route";

// jest.mock's specifier is a plain string argument, not an import statement,
// so Next's SWC path-alias rewrite never touches it — it must be relative.
const findManyMock = jest.fn();
jest.mock("../../../src/db", () => ({
  getDb: () => ({ query: { teams: { findMany: findManyMock } } }),
}));

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

// Spy on drizzle-orm's `eq` (keeping its real implementation) so the test can
// assert *which* column/value the route actually scoped its query by,
// without a live database.
const actualDrizzleOrm = jest.requireActual("drizzle-orm");
const eqSpy = jest.fn(actualDrizzleOrm.eq);
jest.mock("drizzle-orm", () => ({
  ...jest.requireActual("drizzle-orm"),
  eq: (...args: unknown[]) => eqSpy(...args),
}));

const session = (organizationId: string) => ({
  userId: "user-1",
  organizationId,
  organizationName: organizationId,
  organizationSlug: organizationId,
  role: "viewer" as const,
  name: "Test",
  email: "test@example.com",
});

/**
 * Structural checks on the route handler's authorization logic, mocking the
 * db and session (no live database — same boundary as
 * tests/unit/db/schema.test.ts, live-DB integration testing is WEB-135's
 * job). This is what "automated tests cover cross-tenant access attempts"
 * means for this ticket: the handler rejects signed-out requests before
 * touching the database, and always scopes its query by the caller's *own*
 * organization_id, never a hardcoded or unrelated one.
 */
describe("GET /api/teams", () => {
  beforeEach(() => {
    findManyMock.mockReset().mockResolvedValue([]);
    getSessionMock.mockReset();
    eqSpy.mockClear();
  });

  it("rejects unauthenticated requests without querying the database", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("scopes the query by the caller's own organization_id", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(eqSpy).toHaveBeenCalledWith(teams.organizationId, "org-a");
  });

  it("scopes a different caller by their own organization_id, not another's", async () => {
    getSessionMock.mockResolvedValue(session("org-b"));

    await GET();

    expect(eqSpy).toHaveBeenCalledWith(teams.organizationId, "org-b");
    expect(eqSpy).not.toHaveBeenCalledWith(teams.organizationId, "org-a");
  });
});
