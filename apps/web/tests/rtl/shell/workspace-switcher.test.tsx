import { render, screen } from "@testing-library/react";

import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher";

describe("WorkspaceSwitcher", () => {
  it("shows the default active workspace on the trigger", () => {
    render(<WorkspaceSwitcher />);

    expect(
      screen.getByRole("button", { name: /switch workspace/i }),
    ).toHaveTextContent("Webifex");
  });
});
