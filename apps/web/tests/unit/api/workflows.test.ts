/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { workflows } from "@/db/schema";
import { GET, POST } from "@/app/api/workflows/route";

// jest.mock's specifier is a plain string argument, not an import statement,
// so Next's SWC path-alias rewrite never touches it — it must be relative.
const findManyMock = jest.fn();
const findFirstMock = jest.fn();
const returningMock = jest.fn();
const valuesMock = jest.fn(() => ({ returning: returningMock }));
const insertMock = jest.fn(() => ({ values: valuesMock }));
const transactionMock = jest.fn(
  (callback: (tx: { insert: typeof insertMock }) => Promise<unknown>) =>
    callback({ insert: insertMock }),
);
// Backs findMissingInOrg's `select(...).from(...).where(...)` used to
// validate people[].personId references — resolves to "every id exists" by
// default so tests that don't care about this path don't have to mock it.
const selectWhereMock = jest.fn().mockResolvedValue([]);
const selectFromMock = jest.fn(() => ({ where: selectWhereMock }));
const selectMock = jest.fn(() => ({ from: selectFromMock }));
jest.mock("../../../src/db", () => ({
  getDb: () => ({
    query: {
      workflows: { findMany: findManyMock, findFirst: findFirstMock },
    },
    transaction: transactionMock,
    select: selectMock,
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

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/workflows", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const fakeWorkflowRow = {
  id: "workflow-1",
  name: "Onboarding",
  description: null,
  triggerType: "manual",
  triggerConfig: {},
  status: "draft",
  steps: [],
  people: [],
};

describe("GET /api/workflows", () => {
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
    expect(eqSpy).toHaveBeenCalledWith(workflows.organizationId, "org-a");
  });

  it("scopes a different caller by their own organization_id, not another's", async () => {
    getSessionMock.mockResolvedValue(session("org-b"));

    await GET();

    expect(eqSpy).toHaveBeenCalledWith(workflows.organizationId, "org-b");
    expect(eqSpy).not.toHaveBeenCalledWith(workflows.organizationId, "org-a");
  });
});

describe("POST /api/workflows", () => {
  beforeEach(() => {
    insertMock.mockClear();
    valuesMock.mockClear();
    returningMock.mockReset().mockResolvedValue([{ id: "workflow-1" }]);
    findFirstMock.mockReset().mockResolvedValue(fakeWorkflowRow);
    selectWhereMock.mockReset().mockResolvedValue([]);
    getSessionMock.mockReset();
  });

  it("rejects unauthenticated requests without touching the database", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await POST(
      postRequest({ name: "Onboarding", triggerType: "manual" }),
    );

    expect(response.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects a viewer (below the editor role required to write)", async () => {
    getSessionMock.mockResolvedValue(session("org-a", "viewer"));

    const response = await POST(
      postRequest({ name: "Onboarding", triggerType: "manual" }),
    );

    expect(response.status).toBe(403);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects a body missing the required triggerType", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await POST(postRequest({ name: "Onboarding" }));

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts the workflow scoped to the caller's own organization_id", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await POST(
      postRequest({ name: "Onboarding", triggerType: "manual" }),
    );

    expect(response.status).toBe(201);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Onboarding", organizationId: "org-a" }),
    );
  });

  it("inserts steps and people alongside the workflow in the same transaction", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    // The referenced person exists in this org, so ref validation passes.
    selectWhereMock.mockResolvedValue([
      { id: "11111111-1111-4111-8111-111111111111" },
    ]);

    const response = await POST(
      postRequest({
        name: "Onboarding",
        triggerType: "manual",
        steps: [{ stepOrder: 0, kind: "action", type: "notify" }],
        people: [
          {
            personId: "11111111-1111-4111-8111-111111111111",
            role: "owner",
          },
        ],
      }),
    );

    expect(response.status).toBe(201);
    // Called once for workflows, once for workflow_steps, once for workflow_people.
    expect(insertMock).toHaveBeenCalledTimes(3);
  });

  it("rejects a personId that isn't in the caller's own organization", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    selectWhereMock.mockResolvedValue([]);

    const response = await POST(
      postRequest({
        name: "Onboarding",
        triggerType: "manual",
        people: [
          {
            personId: "11111111-1111-4111-8111-111111111111",
            role: "owner",
          },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
