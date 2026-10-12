import { render, screen } from "@testing-library/react";

import { PageHeader } from "@/components/shared/page-header";

// The copy button's server action pulls in the database and auth; the
// header only needs it to exist.
jest.mock("../../../src/lib/page-context/actions", () => ({
  getPageContext: jest.fn(),
}));

describe("PageHeader", () => {
  it("renders the title, description and actions", () => {
    render(
      <PageHeader
        title="Systems"
        description="The systems your organisation runs."
        actions={<button>New system</button>}
        context={null}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Systems" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The systems your organisation runs."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new system/i }),
    ).toBeInTheDocument();
  });

  it("omits the description when none is given", () => {
    render(<PageHeader title="Settings" context={null} />);

    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("shows the copy button when the page has context to copy", () => {
    render(<PageHeader title="Teams" context={{ kind: "teams" }} />);

    expect(
      screen.getByRole("button", { name: /copy page context/i }),
    ).toBeInTheDocument();
  });

  it("has no copy button when the page opts out", () => {
    render(<PageHeader title="New team" context={null} />);

    expect(
      screen.queryByRole("button", { name: /copy page context/i }),
    ).not.toBeInTheDocument();
  });
});
