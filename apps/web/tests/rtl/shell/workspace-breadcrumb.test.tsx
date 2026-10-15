import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WorkspaceBreadcrumb } from "@/components/shell/workspace-breadcrumb";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const switchWorkspaceMock = jest.fn();
jest.mock("../../../src/lib/auth/actions", () => ({
  switchWorkspace: (slug: string) => switchWorkspaceMock(slug),
}));

const current = { name: "Acme Corp", slug: "acme", logoUrl: null };
const others = [
  { name: "Globex", slug: "globex", logoUrl: "https://example.com/g.png" },
  { name: "Initech", slug: "initech", logoUrl: null },
];

describe("WorkspaceBreadcrumb", () => {
  beforeEach(() => {
    switchWorkspaceMock.mockReset();
    pushMock.mockReset();
  });

  it("reads as GraphOrg / workspace name, with the workspace's initials as its logo", () => {
    render(<WorkspaceBreadcrumb current={current} others={[]} />);

    expect(screen.getByText("GraphOrg")).toBeInTheDocument();
    expect(screen.getByText("/")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /workspace: acme corp/i }),
    ).toHaveTextContent("Acme Corp");
    // No logo set: initials stand in.
    expect(screen.getByText("AC")).toBeInTheDocument();
  });

  it("shows the workspace logo before the name when there is one", () => {
    render(
      <WorkspaceBreadcrumb
        current={{ ...current, logoUrl: "https://example.com/acme.png" }}
        others={[]}
      />,
    );

    expect(screen.getByAltText("Acme Corp logo")).toHaveAttribute(
      "src",
      "https://example.com/acme.png",
    );
  });

  it("opens a menu listing the current workspace and the others", async () => {
    const user = userEvent.setup();
    render(<WorkspaceBreadcrumb current={current} others={others} />);

    await user.click(screen.getByRole("button", { name: /switch workspace/i }));

    expect(
      await screen.findByRole("menuitem", { name: /Globex/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Initech/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Current workspace")).toBeInTheDocument();
  });

  it("switches to the chosen workspace", async () => {
    const user = userEvent.setup();
    render(<WorkspaceBreadcrumb current={current} others={others} />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await user.click(await screen.findByRole("menuitem", { name: /Globex/ }));

    expect(switchWorkspaceMock).toHaveBeenCalledWith("globex");
  });

  it("lists just the current workspace, with no extra message, when there is no other", async () => {
    const user = userEvent.setup();
    render(<WorkspaceBreadcrumb current={current} others={[]} />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));

    expect(
      await screen.findByRole("menuitem", { name: /Acme Corp/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/only in this workspace/i),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });

  it("offers new org after a section break", async () => {
    const user = userEvent.setup();
    render(<WorkspaceBreadcrumb current={current} others={[]} />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));

    await user.click(
      await screen.findByRole("menuitem", { name: /new org/i }),
    );

    expect(pushMock).toHaveBeenCalledWith("/signup");
  });

  it("opens the overview when the current workspace is chosen", async () => {
    const user = userEvent.setup();
    render(<WorkspaceBreadcrumb current={current} others={others} />);
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await user.click(
      await screen.findByRole("menuitem", { name: /Acme Corp/ }),
    );

    expect(pushMock).toHaveBeenCalledWith("/");
    expect(switchWorkspaceMock).not.toHaveBeenCalled();
  });
});
