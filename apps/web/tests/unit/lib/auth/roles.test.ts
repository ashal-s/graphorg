import { hasRole } from "@/lib/auth/roles";

describe("hasRole", () => {
  it("grants access when the actual role outranks the minimum", () => {
    expect(hasRole("owner", "viewer")).toBe(true);
    expect(hasRole("admin", "editor")).toBe(true);
  });

  it("grants access when the actual role exactly matches the minimum", () => {
    expect(hasRole("editor", "editor")).toBe(true);
  });

  it("denies access when the actual role is below the minimum", () => {
    expect(hasRole("viewer", "editor")).toBe(false);
    expect(hasRole("editor", "owner")).toBe(false);
  });

  it("ranks every role relative to owner, highest to lowest", () => {
    expect(hasRole("owner", "owner")).toBe(true);
    expect(hasRole("admin", "owner")).toBe(false);
    expect(hasRole("editor", "owner")).toBe(false);
    expect(hasRole("viewer", "owner")).toBe(false);
  });
});
