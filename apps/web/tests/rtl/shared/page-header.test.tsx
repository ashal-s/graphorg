import { render, screen } from "@testing-library/react";

import { PageHeader } from "@/components/shared/page-header";

describe("PageHeader", () => {
  it("renders the title, description and actions", () => {
    render(
      <PageHeader
        title="Systems"
        description="The systems your organisation runs."
        actions={<button>New system</button>}
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
    render(<PageHeader title="Settings" />);

    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });
});
