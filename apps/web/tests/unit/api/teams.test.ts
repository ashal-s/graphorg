/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { teams } from "@/db/schema";
import { GET, POST } from "@/app/api/teams/route";

// jest.mock's specifier is a plain string argument, not an import statement,
// so Next's SWC path-alias rewrite never touches it — it must be relative.
const findManyMock = jest.fn();
const returningMock = jest.fn();
const valuesMock = jest.fn(() => ({ returning: returningMock }));
jest.mock("../../../src/db", () => {
  // Built on first use: the mocks below aren't initialised when this runs.
  const build = () => {
    const db: Record<string, unknown> = {
      query: {
        teams: { findMany: findManyMock, findFirst: async () => undefined },
        // Looked up (and found free) when picking the new team's slug.
        people: { findFirst: async () => undefined },
      },
      insert: () => ({ values: valuesMock }),
      // Raw SQL for department links: no rows, nothing to settle.
      execute: async () => [],
      transaction: async (run: (tx: unknown) => unknown) => run(db),
    };
    return db;
  };
  return { getDb: build };
});

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

const session = (
  organizationId: string,
  role: "viewer" | "editor" = "editor",
) => ({
  userId: "user-1",
  organizationId,
  organizationName: organizationId,
  organizationSlug: organizationId,
  role,
  name: "Test",
  email: "test@example.com",
});

function getRequest(query = "") {
  return new NextRequest(`http://localhost/api/teams${query}`);
}

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/teams", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Same shape of coverage as tests/unit/api/services.test.ts: rejects
 * unauthenticated access before touching the database, and always scopes by
 * the caller's own organization_id. A live-DB integration suite (real
 * pagination behavior against real rows) is WEB-135's job.
 */
describe("GET /api/teams", () => {
  beforeEach(() => {
    findManyMock.mockReset().mockResolvedValue([]);
    getSessionMock.mockReset();
    eqSpy.mockClear();
  });

  it("rejects unauthenticated requests without querying the database", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("scopes the query by the caller's own organization_id", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    expect(eqSpy).toHaveBeenCalledWith(teams.organizationId, "org-a");
  });

  it("scopes a different caller by their own organization_id, not another's", async () => {
    getSessionMock.mockResolvedValue(session("org-b"));

    await GET(getRequest());

    expect(eqSpy).toHaveBeenCalledWith(teams.organizationId, "org-b");
    expect(eqSpy).not.toHaveBeenCalledWith(teams.organizationId, "org-a");
  });

  it("rejects a limit outside 1-100 without querying the database", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await GET(getRequest("?limit=0"));

    expect(response.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns a page shape with items and nextCursor", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    findManyMock.mockResolvedValue([{ id: "1", name: "Payments" }]);

    const response = await GET(getRequest());
    const body = await response.json();

    expect(body).toEqual({
      items: [{ id: "1", name: "Payments" }],
      nextCursor: null,
    });
  });
});

describe("POST /api/teams", () => {
  beforeEach(() => {
    valuesMock.mockClear();
    returningMock
      .mockReset()
      .mockResolvedValue([{ id: "team-1", name: "Payments" }]);
    getSessionMock.mockReset();
  });

  it("rejects unauthenticated requests without touching the database", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await POST(postRequest({ name: "Payments" }));

    expect(response.status).toBe(401);
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it("rejects a viewer (below the editor role required to write)", async () => {
    getSessionMock.mockResolvedValue(session("org-a", "viewer"));

    const response = await POST(postRequest({ name: "Payments" }));

    expect(response.status).toBe(403);
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it("inserts scoped to the caller's own organization_id", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await POST(postRequest({ name: "Payments" }));

    expect(response.status).toBe(201);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Payments", organizationId: "org-a" }),
    );
  });
});

describe("POST /api/teams slug", () => {
  it("gives the new team a slug made from its name", async () => {
    getSessionMock.mockResolvedValue({
      userId: "u",
      organizationId: "org-a",
      organizationName: "A",
      organizationSlug: "a",
      role: "editor",
      name: "T",
      email: "t@example.com",
    });
    returningMock.mockResolvedValue([{ id: "t1" }]);

    await POST(
      new Request("http://localhost/api/teams", {
        method: "POST",
        body: JSON.stringify({ name: "Data & Analytics" }),
      }) as never,
    );

    const values = (valuesMock.mock.calls.at(-1) as unknown[])[0] as Record<
      string,
      unknown
    >;
    expect(values.slug).toBe("data-analytics");
  });
});
