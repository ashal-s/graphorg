import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockPathname = "/directory";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { HighlightSection } from "@/components/shell/highlight-section";
import { SidebarNav } from "@/components/shell/sidebar-nav";

describe("SidebarNav", () => {
  beforeEach(() => {
    mockPathname = "/directory";
  });

  it("renders a link for every nav item", () => {
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: /overview/i })).toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: /overview/i })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("calls onNavigate when a link is clicked", async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    render(<SidebarNav onNavigate={onNavigate} />);

    await user.click(screen.getByRole("link", { name: /overview/i }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("keeps a section selected on its sub-pages", () => {
    mockPathname = "/directory/teams/123";
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: /directory/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("only selects the overview on the root path", () => {
    mockPathname = "/catalog/services";
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: /overview/i })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: /catalog/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("doesn't confuse sections that share a prefix", () => {
    mockPathname = "/org-chart";
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: /org chart/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: /directory/i }),
    ).not.toHaveAttribute("aria-current");
  });

  it("hides labels until hover only when collapsible", () => {
    const { rerender } = render(<SidebarNav />);
    expect(screen.getByText("Directory").className).not.toContain("opacity-0");

    rerender(<SidebarNav collapsible />);
    expect(screen.getByText("Directory").className).toContain("opacity-0");
  });

  it("highlights the section a page asks for when its URL doesn't say", () => {
    mockPathname = "/jordan-lee";
    render(
      <>
        <HighlightSection href="/directory" />
        <SidebarNav />
      </>,
    );

    expect(screen.getByRole("link", { name: /directory/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /overview/i })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
