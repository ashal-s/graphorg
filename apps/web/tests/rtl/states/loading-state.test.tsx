import { render, screen } from "@testing-library/react";

import { LoadingState } from "@/components/states/loading-state";

describe("LoadingState", () => {
  it("announces a loading status", () => {
    render(<LoadingState />);

    expect(
      screen.getByRole("status", { name: /loading/i }),
    ).toBeInTheDocument();
  });

  it("renders the requested number of skeleton rows", () => {
    const { container } = render(<LoadingState rows={5} />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
      5,
    );
  });
});
