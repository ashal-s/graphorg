/**
 * @jest-environment node
 */
import {
  MAX_LOGIN_PASSWORD_CHECKS,
  resolveLoginWorkspaces,
} from "../../../../src/lib/auth/resolve-login";

const compare = jest.fn();
const limit = jest.fn();
const orderBy = jest.fn();
const where = jest.fn();
const innerJoin = jest.fn();
const from = jest.fn();
const select = jest.fn();

jest.mock("bcryptjs", () => ({
  compare: (...args: unknown[]) => compare(...args),
}));

jest.mock("../../../../src/db", () => ({
  getDb: () => ({
    select: (...args: unknown[]) => select(...args),
  }),
}));

describe("resolveLoginWorkspaces", () => {
  beforeEach(() => {
    compare.mockReset();
    select.mockReset();
    from.mockReset();
    innerJoin.mockReset();
    where.mockReset();
    orderBy.mockReset();
    limit.mockReset();

    select.mockReturnValue({ from });
    from.mockReturnValue({ innerJoin });
    innerJoin.mockReturnValue({ where });
    where.mockReturnValue({ orderBy });
    orderBy.mockReturnValue({ limit });
  });

  it("caps the candidate query and only bcrypts that many rows", async () => {
    const rows = Array.from({ length: MAX_LOGIN_PASSWORD_CHECKS }, (_, i) => ({
      passwordHash: `hash-${i}`,
      slug: `org-${i}`,
      name: `Org ${i}`,
    }));
    limit.mockResolvedValue(rows);
    compare.mockResolvedValue(false);

    await resolveLoginWorkspaces("a@example.com", "password-123");

    expect(limit).toHaveBeenCalledWith(MAX_LOGIN_PASSWORD_CHECKS);
    expect(compare).toHaveBeenCalledTimes(MAX_LOGIN_PASSWORD_CHECKS);
  });

  it("returns only the workspaces whose password matches", async () => {
    limit.mockResolvedValue([
      { passwordHash: "a", slug: "acme", name: "Acme" },
      { passwordHash: "b", slug: "globex", name: "Globex" },
    ]);
    compare.mockImplementation(async (_password: string, hash: string) => {
      return hash === "b";
    });

    await expect(
      resolveLoginWorkspaces("a@example.com", "password-123"),
    ).resolves.toEqual([{ slug: "globex", name: "Globex" }]);
  });
});
