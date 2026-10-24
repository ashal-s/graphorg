import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  usePathname: () => "/directory",
}));

jest.mock("../../../src/components/shell/user-menu", () => ({
  UserMenu: () => null,
}));

jest.mock("../../../src/components/shell/workspace-breadcrumb", () => ({
  WorkspaceBreadcrumb: () => null,
}));

import { AppShell } from "@/components/shell/app-shell";
import type { Session } from "@/lib/auth/session";
import type { Workspace } from "@/lib/shell-workspaces";

const session: Session = {
  userId: "user_1",
  organizationId: "org_1",
  organizationName: "Northwind",
  organizationSlug: "northwind",
  role: "viewer",
  name: "Ada",
  email: "ada@example.com",
};

const workspace: Workspace = {
  name: "Northwind",
  slug: "northwind",
  logoUrl: null,
};

function shell(page: string) {
  return (
    <AppShell session={session} workspace={workspace} others={[]}>
      <p>{page}</p>
    </AppShell>
  );
}

describe("AppShell", () => {
  it("keeps the header node when the page content changes", () => {
    const { rerender } = render(shell("First page"));
    const header = document.getElementById("app-chrome");

    rerender(shell("Second page"));

    expect(document.getElementById("app-chrome")).toBe(header);
    const page = screen.getByText("Second page");
    expect(document.getElementById("app-content")).toContainElement(page);
    expect(header).not.toContainElement(page);
  });
});
