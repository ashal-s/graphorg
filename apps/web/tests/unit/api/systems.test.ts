/**
 * @jest-environment node
 */
import { systems } from "@/db/schema";
import { GET, POST } from "@/app/api/systems/route";

// jest.mock's specifier is a plain string argument, not an import statement,
// so Next's SWC path-alias rewrite never touches it — it must be relative.
const findManyMock = jest.fn();
const returningMock = jest.fn();
const valuesMock = jest.fn(() => ({ returning: returningMock }));
jest.mock("../../../src/db", () => ({
  getDb: () => ({
    query: { systems: { findMany: findManyMock } },
    insert: () => ({ values: valuesMock }),
  }),
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

const session = (organizationId: string, role: "viewer" | "editor" = "editor") => ({
  userId: "user-1",
  organizationId,
  organizationName: organizationId,
  organizationSlug: organizationId,
  role,
  name: "Test",
  email: "test@example.com",
});

function request(body: unknown) {
  return new Request("http://localhost/api/systems", {
    method: "POST",
    body: JSON.stringify(body),
  }) as never;
}

/**
 * Same shape of coverage as tests/unit/api/teams.test.ts: rejects
 * unauthenticated access before touching the database, and always scopes by
 * the caller's own organization_id. GET/POST for systems are the exemplar
 * for the WEB-132 catalog routes (repositories, documents, services follow
 * the identical pattern); a live-DB integration suite is WEB-135's job.
 */
describe("GET /api/systems", () => {
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
    expect(eqSpy).toHaveBeenCalledWith(systems.organizationId, "org-a");
  });
});

describe("POST /api/systems", () => {
  beforeEach(() => {
    valuesMock.mockClear();
    returningMock.mockReset().mockResolvedValue([{ id: "system-1", name: "Checkout" }]);
    getSessionMock.mockReset();
    eqSpy.mockClear();
  });

  it("rejects unauthenticated requests without touching the database", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await POST(request({ name: "Checkout" }));

    expect(response.status).toBe(401);
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it("rejects a viewer (below the editor role required to write)", async () => {
    getSessionMock.mockResolvedValue(session("org-a", "viewer"));

    const response = await POST(request({ name: "Checkout" }));

    expect(response.status).toBe(403);
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it("rejects a body missing the required name", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await POST(request({}));

    expect(response.status).toBe(400);
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it("inserts scoped to the caller's own organization_id", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await POST(request({ name: "Checkout" }));

    expect(response.status).toBe(201);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Checkout", organizationId: "org-a" }),
    );
  });
});
