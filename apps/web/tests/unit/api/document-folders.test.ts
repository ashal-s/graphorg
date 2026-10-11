/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { PATCH, DELETE } from "@/app/api/document-folders/[id]/route";

const findFirstMock = jest.fn();
const findManyMock = jest.fn();
const setMock = jest.fn();
const whereMock = jest.fn();
jest.mock("../../../src/db", () => {
  const tx = {
    update: () => ({
      set: (v: unknown) => {
        setMock(v);
        return { where: whereMock };
      },
    }),
    delete: () => ({ where: whereMock }),
  };
  return {
    getDb: () => ({
      query: {
        documentFolders: { findFirst: findFirstMock, findMany: findManyMock },
      },
      select: () => ({ from: () => ({ where: async () => [{ id: "x" }] }) }),
      update: () => ({
        set: (v: unknown) => {
          setMock(v);
          return { where: () => ({ returning: async () => [{ id: "a" }] }) };
        },
      }),
      transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    }),
  };
});
jest.mock("../../../src/lib/api/org-refs", () => ({
  findMissingInOrg: async () => [],
}));

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const patch = (body: unknown) =>
  new NextRequest("http://localhost/x", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  findFirstMock.mockReset();
  findManyMock.mockReset();
  setMock.mockReset();
  whereMock.mockReset().mockResolvedValue(undefined);
  getSessionMock.mockReset().mockResolvedValue({
    userId: "u",
    organizationId: "org-a",
    organizationName: "A",
    organizationSlug: "a",
    role: "editor",
    name: "T",
    email: "t@example.com",
  });
});

describe("PATCH /api/document-folders/[id]", () => {
  it("renames a folder", async () => {
    findFirstMock.mockResolvedValue({ id: A, parentId: null });
    const response = await PATCH(patch({ name: "Renamed" }), params(A));
    expect(response.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith({ name: "Renamed" });
  });

  it("refuses to put a folder inside itself", async () => {
    findFirstMock.mockResolvedValue({ id: A, parentId: null });
    const response = await PATCH(patch({ parentId: A }), params(A));
    expect(response.status).toBe(400);
  });

  it("refuses to move a folder into one of its own subfolders", async () => {
    findFirstMock.mockResolvedValue({ id: A, parentId: null });
    // A <- B <- C : moving A under C would loop.
    findManyMock.mockResolvedValue([
      { id: A, parentId: null },
      { id: B, parentId: A },
      { id: C, parentId: B },
    ]);
    const response = await PATCH(patch({ parentId: C }), params(A));
    expect(response.status).toBe(400);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("allows moving a folder to an unrelated one", async () => {
    findFirstMock.mockResolvedValue({ id: C, parentId: B });
    findManyMock.mockResolvedValue([
      { id: A, parentId: null },
      { id: B, parentId: A },
      { id: C, parentId: B },
    ]);
    const response = await PATCH(patch({ parentId: A }), params(C));
    expect(response.status).toBe(200);
  });

  it("forbids viewers", async () => {
    getSessionMock.mockResolvedValue({
      userId: "u",
      organizationId: "org-a",
      organizationName: "A",
      organizationSlug: "a",
      role: "viewer",
      name: "T",
      email: "t@example.com",
    });
    const response = await PATCH(patch({ name: "x" }), params(A));
    expect(response.status).toBe(403);
  });
});

describe("DELETE /api/document-folders/[id]", () => {
  it("moves contents up to the parent before deleting", async () => {
    findFirstMock.mockResolvedValue({ id: B, parentId: A });
    const response = await DELETE(
      new NextRequest("http://localhost/x", { method: "DELETE" }),
      params(B),
    );

    expect(response.status).toBe(204);
    // Subfolders and documents both re-parented to A.
    expect(setMock).toHaveBeenCalledWith({ parentId: A });
    expect(setMock).toHaveBeenCalledWith({ folderId: A });
  });

  it("404s for a folder in another organization", async () => {
    findFirstMock.mockResolvedValue(undefined);
    const response = await DELETE(
      new NextRequest("http://localhost/x", { method: "DELETE" }),
      params(B),
    );
    expect(response.status).toBe(404);
  });
});
