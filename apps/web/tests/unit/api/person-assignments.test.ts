/**
 * @jest-environment node
 */
import {
  DELETE as deleteWorkflow,
  PUT as putWorkflow,
} from "@/app/api/people/[id]/workflows/[workflowId]/route";
import {
  DELETE as deleteService,
  PUT as putService,
} from "@/app/api/people/[id]/services/[serviceId]/route";

// jest.mock specifiers are plain strings, so they must be relative.
const findFirstMock = jest.fn();
const insertValuesMock = jest.fn();
const deleteWhereMock = jest.fn();
jest.mock("../../../src/db", () => {
  const tx = {
    delete: () => ({ where: deleteWhereMock }),
    insert: () => ({ values: insertValuesMock }),
  };
  return {
    getDb: () => ({
      query: {
        people: { findFirst: findFirstMock },
        workflows: { findFirst: findFirstMock },
        services: { findFirst: findFirstMock },
      },
      transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
      insert: () => ({
        values: (v: unknown) => ({
          onConflictDoNothing: () => insertValuesMock(v),
        }),
      }),
      delete: () => ({ where: deleteWhereMock }),
    }),
  };
});

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const PERSON = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const session = (role: "viewer" | "editor") => ({
  userId: "u",
  organizationId: "org-a",
  organizationName: "A",
  organizationSlug: "a",
  role,
  name: "T",
  email: "t@example.com",
});
const wfParams = (workflowId = OTHER, id = PERSON) => ({
  params: Promise.resolve({ id, workflowId }),
});
const svcParams = (serviceId = OTHER, id = PERSON) => ({
  params: Promise.resolve({ id, serviceId }),
});
const put = (body?: unknown) =>
  new Request("http://localhost/x", {
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never;
const del = () =>
  new Request("http://localhost/x", { method: "DELETE" }) as never;

beforeEach(() => {
  findFirstMock.mockReset().mockResolvedValue({ id: "found" });
  insertValuesMock.mockReset().mockResolvedValue(undefined);
  deleteWhereMock.mockReset().mockResolvedValue(undefined);
  getSessionMock.mockReset().mockResolvedValue(session("editor"));
});

describe("PUT /api/people/[id]/workflows/[workflowId]", () => {
  it("forbids viewers", async () => {
    getSessionMock.mockResolvedValue(session("viewer"));
    const response = await putWorkflow(put({ roles: ["owner"] }), wfParams());
    expect(response.status).toBe(403);
  });

  it("requires at least one valid role", async () => {
    expect((await putWorkflow(put({ roles: [] }), wfParams())).status).toBe(
      400,
    );
    expect(
      (await putWorkflow(put({ roles: ["boss"] }), wfParams())).status,
    ).toBe(400);
  });

  it("404s when the workflow isn't in the caller's organization", async () => {
    findFirstMock
      .mockResolvedValueOnce({ id: PERSON })
      .mockResolvedValueOnce(undefined);
    const response = await putWorkflow(put({ roles: ["owner"] }), wfParams());
    expect(response.status).toBe(404);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("replaces the person's roles, once each", async () => {
    const response = await putWorkflow(
      put({ roles: ["owner", "worker", "owner"] }),
      wfParams(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ roles: ["owner", "worker"] });
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith([
      { workflowId: OTHER, personId: PERSON, role: "owner" },
      { workflowId: OTHER, personId: PERSON, role: "worker" },
    ]);
  });
});

describe("DELETE /api/people/[id]/workflows/[workflowId]", () => {
  it("removes every role", async () => {
    const response = await deleteWorkflow(del(), wfParams());
    expect(response.status).toBe(204);
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed id", async () => {
    const response = await deleteWorkflow(del(), wfParams("nope"));
    expect(response.status).toBe(400);
  });
});

describe("/api/people/[id]/services/[serviceId]", () => {
  it("assigns the person", async () => {
    const response = await putService(put(), svcParams());
    expect(response.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith({
      serviceId: OTHER,
      personId: PERSON,
    });
  });

  it("forbids viewers", async () => {
    getSessionMock.mockResolvedValue(session("viewer"));
    expect((await putService(put(), svcParams())).status).toBe(403);
    expect((await deleteService(del(), svcParams())).status).toBe(403);
  });

  it("404s for a service outside the organization", async () => {
    findFirstMock
      .mockResolvedValueOnce({ id: PERSON })
      .mockResolvedValueOnce(undefined);
    expect((await putService(put(), svcParams())).status).toBe(404);
  });

  it("unassigns the person", async () => {
    const response = await deleteService(del(), svcParams());
    expect(response.status).toBe(204);
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
  });
});
