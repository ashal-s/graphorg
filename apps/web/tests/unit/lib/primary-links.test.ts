/**
 * @jest-environment node
 */
import {
  lockPrimaries,
  PrimaryNotLinkedError,
  replaceDepartmentMembers,
  replaceLinks,
  settlePrimary,
} from "@/lib/api/primary-links";

// A transaction that records the SQL it runs and answers selects with `rows`.
function fakeTx(rows: Array<{ other: string; is_primary: boolean }> = []) {
  const statements: string[] = [];
  const tx = {
    execute: jest.fn(async (query: { queryChunks?: unknown[] }) => {
      const text = JSON.stringify(query);
      statements.push(text);
      return /select .*as other/.test(text) ? rows : [];
    }),
  };
  return { tx: tx as never, statements, execute: tx.execute };
}

describe("replaceLinks", () => {
  it("rejects a primary when the new set is empty", async () => {
    const { tx, execute } = fakeTx();
    await expect(
      replaceLinks(tx, "team-departments", "team-1", [], "dept-1"),
    ).rejects.toBeInstanceOf(PrimaryNotLinkedError);
    // Nothing was changed on the way to refusing.
    expect(execute).not.toHaveBeenCalled();
  });

  it("is fine with an empty set and no primary", async () => {
    const { tx } = fakeTx();
    await expect(
      replaceLinks(tx, "team-departments", "team-1", [], null),
    ).resolves.toBeUndefined();
  });
});

describe("settlePrimary", () => {
  it("rejects a requested primary when there are no links at all", async () => {
    const { tx } = fakeTx([]);
    await expect(
      settlePrimary(tx, "person-teams", "person-1", "team-1"),
    ).rejects.toBeInstanceOf(PrimaryNotLinkedError);
  });

  it("rejects a primary that isn't one of the links", async () => {
    const { tx } = fakeTx([{ other: "team-a", is_primary: true }]);
    await expect(
      settlePrimary(tx, "person-teams", "person-1", "team-b"),
    ).rejects.toBeInstanceOf(PrimaryNotLinkedError);
  });

  it("takes a per-owner lock before reading the links", async () => {
    const { tx, statements } = fakeTx([{ other: "team-a", is_primary: true }]);
    await settlePrimary(tx, "person-teams", "person-1");

    expect(statements[0]).toMatch(/pg_advisory_xact_lock/);
    expect(statements[0]).toContain("primary:person-teams:person-1");
    expect(statements[1]).toMatch(/select/);
  });

  it("does nothing when there are no links and no requested primary", async () => {
    const { tx } = fakeTx([]);
    await expect(
      settlePrimary(tx, "person-teams", "person-1"),
    ).resolves.toBeUndefined();
  });
});

const isLock = (statement: string) => /pg_advisory_xact_lock/.test(statement);
const isDelete = (statement: string) => /delete from/.test(statement);

describe("lock ordering", () => {
  it("lockPrimaries takes each owner's lock once, in sorted order", async () => {
    const { tx, statements } = fakeTx();

    await lockPrimaries(tx, "person-teams", ["p-c", "p-a", "p-b", "p-a"]);

    expect(statements).toHaveLength(3);
    expect(statements[0]).toContain("primary:person-teams:p-a");
    expect(statements[1]).toContain("primary:person-teams:p-b");
    expect(statements[2]).toContain("primary:person-teams:p-c");
  });

  it("replaceLinks locks the owner before its first delete", async () => {
    const { tx, statements } = fakeTx();

    await replaceLinks(tx, "person-departments", "person-1", ["dept-a"]);

    const firstDelete = statements.findIndex(isDelete);
    const firstLock = statements.findIndex(isLock);
    expect(firstLock).toBeGreaterThanOrEqual(0);
    expect(firstLock).toBeLessThan(firstDelete);
  });

  it("replaceDepartmentMembers locks everyone affected, sorted, before changing links", async () => {
    const statements: string[] = [];
    const tx = {
      execute: jest.fn(async (query: unknown) => {
        const text = JSON.stringify(query);
        statements.push(text);
        // The department's current people, read before anything changes.
        if (/as owner/.test(text)) return [{ owner: "p-z" }, { owner: "p-m" }];
        return [];
      }),
    };

    await replaceDepartmentMembers(
      tx as never,
      "person-departments",
      "dept-1",
      ["p-a", "p-m"],
    );

    const firstDelete = statements.findIndex(isDelete);
    const locks = statements
      .slice(0, firstDelete)
      .filter(isLock)
      .map(
        (statement) => /primary:person-departments:(p-\w)/.exec(statement)?.[1],
      );
    expect(locks).toEqual(["p-a", "p-m", "p-z"]);
  });
});
