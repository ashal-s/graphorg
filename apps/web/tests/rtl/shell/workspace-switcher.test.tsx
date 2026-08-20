import { render, screen } from "@testing-library/react";

import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher";

describe("WorkspaceSwitcher", () => {
  it("shows the signed-in user's workspace name", () => {
    render(<WorkspaceSwitcher workspaceName="Acme Corp" />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });
});
