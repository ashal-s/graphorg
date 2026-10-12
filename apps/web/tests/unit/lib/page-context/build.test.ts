import { CONTEXT_NOTE, wrapContext } from "@/lib/page-context/build";
import { contextScopeSchema } from "@/lib/page-context/types";

// The builders import the database; the pure envelope and schema don't need it.
jest.mock("../../../../src/db", () => ({ getDb: jest.fn() }));

describe("wrapContext", () => {
  it("puts where the data came from ahead of the data", () => {
    const wrapped = wrapContext(
      { page: "Teams", path: "/directory/teams", data: { count: 2 } },
      { organization: "Acme", generatedAt: new Date("2026-01-02T03:04:05Z") },
    );

    expect(wrapped).toEqual({
      _meta: {
        page: "Teams",
        path: "/directory/teams",
        organization: "Acme",
        generatedAt: "2026-01-02T03:04:05.000Z",
        note: CONTEXT_NOTE,
      },
      data: { count: 2 },
    });
    expect(Object.keys(wrapped)).toEqual(["_meta", "data"]);
  });
});

describe("contextScopeSchema", () => {
  const id = "3f1c2a52-8f55-4a52-9c4e-0e7f4d6b9a10";

  it("accepts scopes without and with an id", () => {
    expect(contextScopeSchema.safeParse({ kind: "teams" }).success).toBe(true);
    expect(contextScopeSchema.safeParse({ kind: "team", id }).success).toBe(
      true,
    );
    expect(
      contextScopeSchema.safeParse({ kind: "folder", id: null }).success,
    ).toBe(true);
  });

  it("rejects unknown kinds and malformed ids", () => {
    expect(contextScopeSchema.safeParse({ kind: "everything" }).success).toBe(
      false,
    );
    expect(
      contextScopeSchema.safeParse({ kind: "team", id: "not-a-uuid" }).success,
    ).toBe(false);
    expect(contextScopeSchema.safeParse({ kind: "team" }).success).toBe(false);
  });
});
