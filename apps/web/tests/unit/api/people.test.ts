/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { GET } from "@/app/api/people/route";

// jest.mock's specifier is a plain string argument, not an import statement,
// so Next's SWC path-alias rewrite never touches it — it must be relative.
const findManyMock = jest.fn();
jest.mock("../../../src/db", () => ({
  getDb: () => ({
    query: { people: { findMany: findManyMock } },
    // The teamId filter is a subquery over team_members.
    select: () => ({ from: () => ({ where: () => "team-members-subquery" }) }),
  }),
}));

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const session = () => ({
  userId: "user-1",
  organizationId: "org-a",
  organizationName: "org-a",
  organizationSlug: "org-a",
  role: "editor" as const,
  name: "Test",
  email: "test@example.com",
});

function getRequest(query = "") {
  return new NextRequest(`http://localhost/api/people${query}`);
}

/**
 * `teamId`/`managerId` filters are taken straight off the query string and
 * compared against `uuid` columns (via a `team_members` subquery). A
 * non-UUID value must be rejected with 400 before it ever reaches the
 * database, not passed through to fail as an uncaught Postgres cast error.
 */
describe("GET /api/people", () => {
  beforeEach(() => {
    findManyMock.mockReset().mockResolvedValue([]);
    getSessionMock.mockReset().mockResolvedValue(session());
  });

  it("rejects a non-UUID teamId without querying the database", async () => {
    const response = await GET(getRequest("?teamId=not-a-uuid"));

    expect(response.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID managerId without querying the database", async () => {
    const response = await GET(getRequest("?managerId=not-a-uuid"));

    expect(response.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("accepts a well-formed teamId", async () => {
    const response = await GET(
      getRequest("?teamId=11111111-1111-4111-8111-111111111111"),
    );

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalled();
  });
});
