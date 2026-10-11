/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { DELETE, PATCH } from "@/app/api/users/[id]/route";
import { GET, POST } from "@/app/api/users/route";

const ID = "11111111-1111-4111-8111-111111111111";
const SELF = "22222222-2222-4222-8222-222222222222";

const findFirstMock = jest.fn();
const returningMock = jest.fn();
const insertValuesMock = jest.fn(() => ({ returning: returningMock }));
const setMock = jest.fn(() => ({
  where: () => ({ returning: returningMock }),
}));
const deleteWhereMock = jest.fn();
const personFindFirstMock = jest.fn();
const personInsertMock = jest.fn();
const personUpdateWhereMock = jest.fn();
jest.mock("../../../src/db", () => {
  // Inside a transaction: users insert/people lookups and writes.
  // Built lazily: the mocks below are initialised after this factory is hoisted.
  const makeTx = () => ({
    query: {
      people: { findFirst: personFindFirstMock },
      teams: { findFirst: async () => undefined },
    },
    insert: (table: { _: { name?: string } } | unknown) => ({
      values: (values: unknown) => {
        const name = (table as { [k: symbol]: unknown })[
          Symbol.for("drizzle:Name")
        ];
        if (name === "people") {
          personInsertMock(values);
          return Promise.resolve();
        }
        return (insertValuesMock as unknown as (v: unknown) => unknown)(values);
      },
    }),
    update: () => ({
      set: (values: unknown) => ({
        where: () => {
          personUpdateWhereMock(values);
          return Promise.resolve();
        },
      }),
    }),
  });
  return {
    getDb: () => ({
      query: {
        users: { findFirst: findFirstMock },
        people: { findFirst: personFindFirstMock },
      },
      select: () => ({
        from: () => ({ where: () => ({ orderBy: async () => [] }) }),
      }),
      insert: () => ({ values: insertValuesMock }),
      update: () => ({ set: setMock }),
      delete: () => ({ where: deleteWhereMock }),
      transaction: async (fn: (t: ReturnType<typeof makeTx>) => unknown) =>
        fn(makeTx()),
    }),
  };
});

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

type Role = "owner" | "admin" | "editor" | "viewer";

const session = (role: Role, userId = SELF) => ({
  userId,
  organizationId: "org-a",
  organizationName: "Org A",
  organizationSlug: "org-a",
  role,
  name: "Test",
  email: "test@example.com",
});

const req = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/users", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = { params: Promise.resolve({ id: ID }) };

beforeEach(() => {
  findFirstMock.mockReset();
  returningMock
    .mockReset()
    .mockResolvedValue([
      { id: ID, name: "N", email: "n@x.io", role: "viewer" },
    ]);
  insertValuesMock.mockClear();
  setMock.mockClear();
  deleteWhereMock.mockReset();
  personFindFirstMock.mockReset();
  personInsertMock.mockReset();
  personUpdateWhereMock.mockReset();
  getSessionMock.mockReset();
});

describe("GET /api/users", () => {
  it("rejects editors", async () => {
    getSessionMock.mockResolvedValue(session("editor"));
    expect((await GET()).status).toBe(403);
  });

  it("lets admins list members", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    expect((await GET()).status).toBe(200);
  });
});

describe("POST /api/users", () => {
  const body = {
    name: "New Person",
    email: "New@Example.com",
    password: "password1",
    role: "editor",
  };

  it("rejects editors", async () => {
    getSessionMock.mockResolvedValue(session("editor"));
    expect((await POST(req("POST", body))).status).toBe(403);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("stops an admin granting admin or owner", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    for (const role of ["admin", "owner"]) {
      const response = await POST(req("POST", { ...body, role }));
      expect(response.status).toBe(403);
    }
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("creates a member with a hashed password in the caller's org", async () => {
    getSessionMock.mockResolvedValue(session("admin"));

    const response = await POST(req("POST", body));

    expect(response.status).toBe(201);
    const values = (insertValuesMock.mock.calls[0] as unknown[])[0] as Record<
      string,
      unknown
    >;
    expect(values.organizationId).toBe("org-a");
    expect(values.email).toBe("new@example.com");
    expect(values.passwordHash).toEqual(expect.any(String));
    expect(values.passwordHash).not.toBe("password1");
    expect(values).not.toHaveProperty("password");
  });

  it("rejects a weak password", async () => {
    getSessionMock.mockResolvedValue(session("owner"));
    const response = await POST(req("POST", { ...body, password: "short" }));
    expect(response.status).toBe(400);
  });

  it("lets an owner grant owner", async () => {
    getSessionMock.mockResolvedValue(session("owner"));
    const response = await POST(req("POST", { ...body, role: "owner" }));
    expect(response.status).toBe(201);
  });

  describe("from the directory", () => {
    const PERSON = "33333333-3333-4333-8333-333333333333";
    const fromDirectory = {
      personId: PERSON,
      password: "password1",
      role: "viewer",
    };

    it("uses the person's own name and email and links the account", async () => {
      getSessionMock.mockResolvedValue(session("admin"));
      personFindFirstMock.mockResolvedValue({
        id: PERSON,
        name: "Dana Whitfield",
        email: "dana@acme.example",
        userId: null,
      });

      const response = await POST(req("POST", fromDirectory));

      expect(response.status).toBe(201);
      const values = (insertValuesMock.mock.calls[0] as unknown[])[0] as Record<
        string,
        unknown
      >;
      expect(values.name).toBe("Dana Whitfield");
      expect(values.email).toBe("dana@acme.example");
      expect(personUpdateWhereMock).toHaveBeenCalledWith({ userId: ID });
    });

    it("ignores a name or email sent alongside a person", async () => {
      getSessionMock.mockResolvedValue(session("admin"));
      personFindFirstMock.mockResolvedValue({
        id: PERSON,
        name: "Dana Whitfield",
        email: "dana@acme.example",
        userId: null,
      });

      await POST(
        req("POST", {
          ...fromDirectory,
          name: "Someone Else",
          email: "x@y.io",
        }),
      );

      const values = (insertValuesMock.mock.calls[0] as unknown[])[0] as Record<
        string,
        unknown
      >;
      expect(values.email).toBe("dana@acme.example");
    });

    it("rejects a person from another organization", async () => {
      getSessionMock.mockResolvedValue(session("admin"));
      personFindFirstMock.mockResolvedValue(undefined);

      const response = await POST(req("POST", fromDirectory));

      expect(response.status).toBe(400);
      expect(insertValuesMock).not.toHaveBeenCalled();
    });

    it("rejects someone who already has an account", async () => {
      getSessionMock.mockResolvedValue(session("admin"));
      personFindFirstMock.mockResolvedValue({
        id: PERSON,
        name: "Dana",
        email: "dana@acme.example",
        userId: "already",
      });

      const response = await POST(req("POST", fromDirectory));

      expect(response.status).toBe(409);
      expect(insertValuesMock).not.toHaveBeenCalled();
    });

    it("still enforces which roles can be granted", async () => {
      getSessionMock.mockResolvedValue(session("admin"));
      const response = await POST(
        req("POST", { ...fromDirectory, role: "admin" }),
      );
      expect(response.status).toBe(403);
    });
  });

  describe("someone new", () => {
    it("requires a name and an email when no person is chosen", async () => {
      getSessionMock.mockResolvedValue(session("admin"));
      const response = await POST(
        req("POST", { password: "password1", role: "viewer" }),
      );
      expect(response.status).toBe(400);
    });

    it("can also add them to the directory", async () => {
      getSessionMock.mockResolvedValue(session("admin"));
      personFindFirstMock.mockResolvedValue(undefined);

      const response = await POST(
        req("POST", { ...body, addToDirectory: true }),
      );

      expect(response.status).toBe(201);
      expect(personInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Person",
          email: "new@example.com",
          userId: ID,
          organizationId: "org-a",
        }),
      );
    });

    it("links to a matching directory entry instead of duplicating it", async () => {
      getSessionMock.mockResolvedValue(session("admin"));
      personFindFirstMock.mockResolvedValue({ id: "p-1", userId: null });

      await POST(req("POST", { ...body, addToDirectory: true }));

      expect(personInsertMock).not.toHaveBeenCalled();
      expect(personUpdateWhereMock).toHaveBeenCalledWith({ userId: ID });
    });

    it("leaves the directory alone by default", async () => {
      getSessionMock.mockResolvedValue(session("admin"));
      await POST(req("POST", body));
      expect(personInsertMock).not.toHaveBeenCalled();
      expect(personUpdateWhereMock).not.toHaveBeenCalled();
    });
  });
});

describe("PATCH /api/users/[id]", () => {
  it("rejects editors", async () => {
    getSessionMock.mockResolvedValue(session("editor"));
    expect((await PATCH(req("PATCH", { name: "X" }), params)).status).toBe(403);
  });

  it("404s for a user outside the caller's org", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    findFirstMock.mockResolvedValue(undefined);
    expect((await PATCH(req("PATCH", { name: "X" }), params)).status).toBe(404);
  });

  it("stops an admin editing another admin", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    findFirstMock.mockResolvedValue({ id: ID, role: "admin" });
    expect((await PATCH(req("PATCH", { name: "X" }), params)).status).toBe(403);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("stops an admin promoting someone to admin", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    findFirstMock.mockResolvedValue({ id: ID, role: "editor" });
    const response = await PATCH(req("PATCH", { role: "admin" }), params);
    expect(response.status).toBe(403);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("lets an admin change a viewer to editor", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    findFirstMock.mockResolvedValue({ id: ID, role: "viewer" });
    const response = await PATCH(req("PATCH", { role: "editor" }), params);
    expect(response.status).toBe(200);
  });

  it("stops anyone changing their own role", async () => {
    getSessionMock.mockResolvedValue(session("owner", ID));
    findFirstMock.mockResolvedValue({ id: ID, role: "owner" });
    const response = await PATCH(req("PATCH", { role: "viewer" }), params);
    expect(response.status).toBe(400);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("lets an admin edit their own name", async () => {
    getSessionMock.mockResolvedValue(session("admin", ID));
    findFirstMock.mockResolvedValue({ id: ID, role: "admin" });
    const response = await PATCH(req("PATCH", { name: "Me" }), params);
    expect(response.status).toBe(200);
  });

  it("hashes a reset password", async () => {
    getSessionMock.mockResolvedValue(session("owner"));
    findFirstMock.mockResolvedValue({ id: ID, role: "viewer" });
    const response = await PATCH(
      req("PATCH", { password: "newpass123" }),
      params,
    );
    expect(response.status).toBe(200);
    const values = (setMock.mock.calls[0] as unknown[])[0] as Record<
      string,
      unknown
    >;
    expect(values.passwordHash).toEqual(expect.any(String));
    expect(values).not.toHaveProperty("password");
  });
});

describe("DELETE /api/users/[id]", () => {
  it("rejects editors", async () => {
    getSessionMock.mockResolvedValue(session("editor"));
    expect((await DELETE(req("DELETE"), params)).status).toBe(403);
  });

  it("stops removing yourself", async () => {
    getSessionMock.mockResolvedValue(session("owner", ID));
    expect((await DELETE(req("DELETE"), params)).status).toBe(400);
    expect(deleteWhereMock).not.toHaveBeenCalled();
  });

  it("stops an admin removing an owner", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    findFirstMock.mockResolvedValue({ id: ID, role: "owner" });
    expect((await DELETE(req("DELETE"), params)).status).toBe(403);
    expect(deleteWhereMock).not.toHaveBeenCalled();
  });

  it("lets an admin remove a viewer", async () => {
    getSessionMock.mockResolvedValue(session("admin"));
    findFirstMock.mockResolvedValue({ id: ID, role: "viewer" });
    expect((await DELETE(req("DELETE"), params)).status).toBe(204);
    expect(deleteWhereMock).toHaveBeenCalled();
  });
});
