/**
 * @jest-environment node
 */
import {
  PrimaryNotLinkedError,
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
