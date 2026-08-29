/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { GET, PATCH, DELETE } from "@/app/api/workflows/[id]/route";

// jest.mock's specifier is a plain string argument, not an import statement,
// so Next's SWC path-alias rewrite never touches it — it must be relative.
const findFirstMock = jest.fn();
const updateWhereMock = jest.fn().mockResolvedValue(undefined);
const setMock = jest.fn(() => ({ where: updateWhereMock }));
const updateMock = jest.fn(() => ({ set: setMock }));
const insertMock = jest.fn(() => ({ values: jest.fn().mockResolvedValue(undefined) }));
const txDeleteWhereMock = jest.fn().mockResolvedValue(undefined);
const txDeleteMock = jest.fn(() => ({ where: txDeleteWhereMock }));
const transactionMock = jest.fn(
  (
    callback: (tx: {
      update: typeof updateMock;
      insert: typeof insertMock;
      delete: typeof txDeleteMock;
    }) => Promise<unknown>,
  ) => callback({ update: updateMock, insert: insertMock, delete: txDeleteMock }),
);
const dbDeleteWhereMock = jest.fn().mockResolvedValue(undefined);
const dbDeleteMock = jest.fn(() => ({ where: dbDeleteWhereMock }));
const selectWhereMock = jest.fn().mockResolvedValue([]);
const selectMock = jest.fn(() => ({ from: () => ({ where: selectWhereMock }) }));

jest.mock("../../../src/db", () => ({
  getDb: () => ({
    query: { workflows: { findFirst: findFirstMock } },
    transaction: transactionMock,
    delete: dbDeleteMock,
    select: selectMock,
  }),
}));

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
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

const VALID_ID = "11111111-1111-4111-8111-111111111111";

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/workflows/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

const fakeWorkflowRow = {
  id: VALID_ID,
  name: "Onboarding",
  description: null,
  triggerType: "manual",
  triggerConfig: {},
  status: "draft",
  steps: [],
  people: [],
};

beforeEach(() => {
  getSessionMock.mockReset();
  findFirstMock.mockReset();
  updateMock.mockClear();
  setMock.mockClear();
  insertMock.mockClear();
  txDeleteMock.mockClear();
  dbDeleteMock.mockClear();
  selectWhereMock.mockReset().mockResolvedValue([]);
});

describe("GET /api/workflows/[id]", () => {
  it("rejects unauthenticated requests without querying the database", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET(
      new NextRequest(`http://localhost/api/workflows/${VALID_ID}`),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(401);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID id without querying the database", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));

    const response = await GET(
      new NextRequest("http://localhost/api/workflows/not-a-uuid"),
      routeParams("not-a-uuid"),
    );

    expect(response.status).toBe(400);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns 404 when no workflow matches in the caller's own organization", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    findFirstMock.mockResolvedValue(undefined);

    const response = await GET(
      new NextRequest(`http://localhost/api/workflows/${VALID_ID}`),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(404);
  });

  it("returns the workflow when found", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    findFirstMock.mockResolvedValue(fakeWorkflowRow);

    const response = await GET(
      new NextRequest(`http://localhost/api/workflows/${VALID_ID}`),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.workflow.id).toBe(VALID_ID);
  });
});

describe("PATCH /api/workflows/[id]", () => {
  it("rejects unauthenticated requests without touching the database", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await PATCH(
      patchRequest(VALID_ID, { name: "Renamed" }),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(401);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects a viewer (below the editor role required to write)", async () => {
    getSessionMock.mockResolvedValue(session("org-a", "viewer"));

    const response = await PATCH(
      patchRequest(VALID_ID, { name: "Renamed" }),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 404 when no workflow matches in the caller's own organization", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    findFirstMock.mockResolvedValue(undefined);

    const response = await PATCH(
      patchRequest(VALID_ID, { name: "Renamed" }),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(404);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects an empty patch body", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    findFirstMock.mockResolvedValue({ id: VALID_ID });

    const response = await PATCH(patchRequest(VALID_ID, {}), routeParams(VALID_ID));

    expect(response.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("updates the workflow and re-fetches its detail", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    findFirstMock
      .mockResolvedValueOnce({ id: VALID_ID }) // existence check
      .mockResolvedValueOnce(fakeWorkflowRow); // detail re-fetch after update

    const response = await PATCH(
      patchRequest(VALID_ID, { name: "Renamed" }),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Renamed" }),
    );
  });

  it("replaces steps and people when provided", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    findFirstMock
      .mockResolvedValueOnce({ id: VALID_ID })
      .mockResolvedValueOnce(fakeWorkflowRow);
    selectWhereMock.mockResolvedValue([{ id: VALID_ID }]);

    const response = await PATCH(
      patchRequest(VALID_ID, {
        steps: [{ stepOrder: 0, kind: "condition", type: "status_is" }],
        people: [{ personId: VALID_ID, role: "worker" }],
      }),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(200);
    expect(txDeleteMock).toHaveBeenCalledTimes(2);
    expect(insertMock).toHaveBeenCalledTimes(2);
  });
});

describe("DELETE /api/workflows/[id]", () => {
  it("rejects unauthenticated requests without touching the database", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await DELETE(
      new NextRequest(`http://localhost/api/workflows/${VALID_ID}`, {
        method: "DELETE",
      }),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(401);
    expect(dbDeleteMock).not.toHaveBeenCalled();
  });

  it("rejects a viewer (below the editor role required to write)", async () => {
    getSessionMock.mockResolvedValue(session("org-a", "viewer"));

    const response = await DELETE(
      new NextRequest(`http://localhost/api/workflows/${VALID_ID}`, {
        method: "DELETE",
      }),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(403);
    expect(dbDeleteMock).not.toHaveBeenCalled();
  });

  it("returns 404 when no workflow matches in the caller's own organization", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    findFirstMock.mockResolvedValue(undefined);

    const response = await DELETE(
      new NextRequest(`http://localhost/api/workflows/${VALID_ID}`, {
        method: "DELETE",
      }),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(404);
    expect(dbDeleteMock).not.toHaveBeenCalled();
  });

  it("deletes the workflow (steps and people cascade)", async () => {
    getSessionMock.mockResolvedValue(session("org-a"));
    findFirstMock.mockResolvedValue({ id: VALID_ID });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/workflows/${VALID_ID}`, {
        method: "DELETE",
      }),
      routeParams(VALID_ID),
    );

    expect(response.status).toBe(204);
    expect(dbDeleteMock).toHaveBeenCalled();
  });
});
