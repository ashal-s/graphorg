import { render, screen } from "@testing-library/react";

import { PermissionDenied } from "@/components/states/permission-denied";

describe("PermissionDenied", () => {
  it("renders the default access-denied message and a link home", () => {
    render(<PermissionDenied />);

    expect(screen.getByText("Access denied")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /return home/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders a custom message when given", () => {
    render(
      <PermissionDenied message="Ask an admin for access to this workspace." />,
    );

    expect(
      screen.getByText("Ask an admin for access to this workspace."),
    ).toBeInTheDocument();
  });
});
