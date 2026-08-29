/**
 * @jest-environment node
 */
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePageParams,
  toPage,
} from "@/lib/api/pagination";

/**
 * Pure-function tests for the cursor pagination every WEB-136 list endpoint
 * (teams, people, tools, technologies) shares. No database: the keyset
 * predicate itself (`afterCursorPredicate`) is exercised against a live
 * Postgres instance manually (see the WEB-136 Linear comment), same
 * boundary as tests/unit/db/schema.test.ts.
 */
describe("parsePageParams", () => {
  it("defaults to DEFAULT_PAGE_SIZE with no query params", () => {
    const result = parsePageParams(new URLSearchParams());
    expect(result).toEqual({ limit: DEFAULT_PAGE_SIZE });
  });

  it("accepts a valid limit", () => {
    const result = parsePageParams(new URLSearchParams("limit=10"));
    expect(result).toEqual({ limit: 10 });
  });

  it.each(["0", "-1", "1.5", "abc", String(MAX_PAGE_SIZE + 1)])(
    "rejects an invalid limit (%s) as a 400 response, not a thrown error",
    async (limit) => {
      const result = parsePageParams(new URLSearchParams(`limit=${limit}`));
      expect(result).not.toHaveProperty("limit");
      // @ts-expect-error -- narrowed at runtime, not by the compiler
      expect(result.status).toBe(400);
    },
  );

  it("decodes a cursor round-tripped through toPage", () => {
    const page = toPage(
      [
        { id: "1", name: "a" },
        { id: "2", name: "b" },
      ],
      1,
    );
    expect(page.nextCursor).not.toBeNull();

    const result = parsePageParams(
      new URLSearchParams(`cursor=${page.nextCursor}`),
    );
    expect(result).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      after: { name: "a", id: "1" },
    });
  });

  it("rejects a malformed cursor as a 400 response", async () => {
    const result = parsePageParams(
      new URLSearchParams("cursor=not-base64-json"),
    );
    expect(result).not.toHaveProperty("after");
    // @ts-expect-error -- narrowed at runtime, not by the compiler
    expect(result.status).toBe(400);
  });
});

describe("toPage", () => {
  it("returns every row and no cursor when there's no next page", () => {
    const rows = [{ id: "1", name: "a" }];
    const page = toPage(rows, 25);
    expect(page).toEqual({ items: rows, nextCursor: null });
  });

  it("drops the lookahead row and returns a cursor when there's a next page", () => {
    const rows = [
      { id: "1", name: "a" },
      { id: "2", name: "b" },
    ];
    const page = toPage(rows, 1);
    expect(page.items).toEqual([{ id: "1", name: "a" }]);
    expect(page.nextCursor).not.toBeNull();
  });
});
