import { render, screen } from "@testing-library/react";

import { EmptyState } from "@/components/states/empty-state";

describe("EmptyState", () => {
  it("renders the title, description and action", () => {
    render(
      <EmptyState
        title="No context yet"
        description="Add your first entry to get started."
        action={<button>Add entry</button>}
      />,
    );

    expect(screen.getByText("No context yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first entry to get started."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add entry/i }),
    ).toBeInTheDocument();
  });

  it("omits the description when none is given", () => {
    render(<EmptyState title="Nothing here" />);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
