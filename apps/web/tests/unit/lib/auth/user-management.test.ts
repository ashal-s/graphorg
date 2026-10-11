import { assignableRoles, canManageRole } from "@/lib/auth/user-management";

describe("assignableRoles", () => {
  it("lets an owner grant every role", () => {
    expect(assignableRoles("owner")).toEqual([
      "owner",
      "admin",
      "editor",
      "viewer",
    ]);
  });

  it("lets an admin grant only roles below admin", () => {
    expect(assignableRoles("admin")).toEqual(["editor", "viewer"]);
  });

  it("lets editors and viewers grant nothing", () => {
    expect(assignableRoles("editor")).toEqual([]);
    expect(assignableRoles("viewer")).toEqual([]);
  });
});

describe("canManageRole", () => {
  it("lets an owner manage anyone", () => {
    for (const target of ["owner", "admin", "editor", "viewer"] as const) {
      expect(canManageRole("owner", target)).toBe(true);
    }
  });

  it("stops an admin managing admins or owners", () => {
    expect(canManageRole("admin", "owner")).toBe(false);
    expect(canManageRole("admin", "admin")).toBe(false);
    expect(canManageRole("admin", "editor")).toBe(true);
    expect(canManageRole("admin", "viewer")).toBe(true);
  });

  it("stops editors and viewers managing anyone", () => {
    expect(canManageRole("editor", "viewer")).toBe(false);
    expect(canManageRole("viewer", "viewer")).toBe(false);
  });
});
