/**
 * @jest-environment node
 */
import { teamMembers } from "@/db/schema";
import { DELETE } from "@/app/api/teams/[id]/route";

const TEAM = "11111111-1111-4111-8111-111111111111";

// Everything the transaction did, in order.
const events: string[] = [];
const statements: string[] = [];
// The people on the team being deleted (deliberately unsorted).
let members: Array<{ personId: string }> = [];

jest.mock("../../../src/db", () => {
  // Built on first use: `teamMembers` and the mocks aren't initialised when
  // this factory is registered.
  const build = () => {
    const tx = {
      select: () => ({
        from: () => ({ where: async () => members }),
      }),
      delete: (table: unknown) => ({
        where: () => {
          const name =
            table === teamMembers ? "delete team_members" : "delete team";
          events.push(name);
          const result = Promise.resolve(undefined) as Promise<unknown> & {
            returning?: () => Promise<unknown>;
          };
          result.returning = async () => members;
          return result;
        },
      }),
      execute: async (query: unknown) => {
        const text = JSON.stringify(query);
        statements.push(text);
        const lock = /pg_advisory_xact_lock/.exec(text)
          ? /primary:[\w-]+:([\w-]+)/.exec(text)
          : null;
        if (lock) events.push(`lock ${lock[1]}`);
        else if (/as other/.test(text)) {
          const owner = /"(p-[a-z])"/.exec(text);
          events.push(`settle ${owner?.[1] ?? "?"}`);
        }
        return [];
      },
    };
    return {
      query: { teams: { findFirst: async () => ({ id: TEAM }) } },
      transaction: async (run: (t: typeof tx) => unknown) => run(tx),
    };
  };
  return { getDb: build };
});

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const session = (role: "viewer" | "editor") => ({
  userId: "u",
  organizationId: "org-a",
  organizationName: "A",
  organizationSlug: "a",
  role,
  name: "T",
  email: "t@example.com",
});

const params = (id = TEAM) => ({ params: Promise.resolve({ id }) });
const del = (id = TEAM) =>
  DELETE(
    new Request("http://localhost/x", { method: "DELETE" }) as never,
    params(id),
  );

describe("DELETE /api/teams/[id]", () => {
  beforeEach(() => {
    events.length = 0;
    statements.length = 0;
    members = [{ personId: "p-b" }, { personId: "p-a" }];
    getSessionMock.mockReset().mockResolvedValue(session("editor"));
  });

  it("rejects the signed-out and viewers", async () => {
    getSessionMock.mockResolvedValue(null);
    expect((await del()).status).toBe(401);
    getSessionMock.mockResolvedValue(session("viewer"));
    expect((await del()).status).toBe(403);
  });

  it("locks the members, then deletes, then settles each one's primary team", async () => {
    const response = await del();

    expect(response.status).toBe(204);
    const firstDelete = events.indexOf("delete team_members");
    const lockEvents = events.slice(0, firstDelete);
    // Sorted, and all before anything is deleted.
    expect(lockEvents).toEqual(["lock p-a", "lock p-b"]);
    expect(events.indexOf("delete team")).toBeGreaterThan(firstDelete);

    const afterDelete = events.slice(events.indexOf("delete team") + 1);
    const settled = afterDelete.filter((e) => e.startsWith("settle"));
    expect(settled).toEqual(["settle p-a", "settle p-b"]);
  });

  it("deletes an empty team without settling anyone", async () => {
    members = [];

    const response = await del();

    expect(response.status).toBe(204);
    expect(events).toEqual(["delete team_members", "delete team"]);
  });
});
