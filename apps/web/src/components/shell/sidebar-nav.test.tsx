import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  usePathname: () => "/directory",
}));

import { SidebarNav } from "./sidebar-nav";

describe("SidebarNav", () => {
  it("renders a link for every nav item", () => {
    render(<SidebarNav />);

    expect(
      screen.getByRole("link", { name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /directory/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /catalog/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("marks the current route as active", () => {
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: /directory/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: /dashboard/i }),
    ).not.toHaveAttribute("aria-current");
  });

  it("calls onNavigate when a link is clicked", async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    render(<SidebarNav onNavigate={onNavigate} />);

    await user.click(screen.getByRole("link", { name: /dashboard/i }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
