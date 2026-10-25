import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockPathname = "/directory";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { AppSidebar } from "@/components/shell/app-sidebar";
import { HighlightSection } from "@/components/shell/highlight-section";
import { SidebarNav } from "@/components/shell/sidebar-nav";

describe("SidebarNav", () => {
  beforeEach(() => {
    mockPathname = "/directory";
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it("keeps collapsed labels in the accessibility tree", () => {
    const { rerender } = render(<SidebarNav />);
    expect(screen.getByText("Directory").className).not.toContain("sr-only");

    rerender(<SidebarNav collapsed />);
    expect(screen.getByText("Directory").className).toContain("sr-only");
    expect(screen.getByRole("link", { name: "Directory" })).toBeInTheDocument();
  });

  it("pins the sidebar open without hover", async () => {
    const user = userEvent.setup();
    render(<AppSidebar />);

    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();

    await user.click(expand);

    const collapse = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    expect(window.localStorage.getItem("graphorg.sidebar.expanded")).toBe(
      "true",
    );
    expect(screen.getByText("Directory").className).not.toContain("sr-only");
  });

  it("keeps the sidebar usable when localStorage is blocked", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    const user = userEvent.setup();
    render(<AppSidebar />);

    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expand).toHaveAttribute("aria-expanded", "false");

    await user.click(expand);

    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Directory").className).not.toContain("sr-only");
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
