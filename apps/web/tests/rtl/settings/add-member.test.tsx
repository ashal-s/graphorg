import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UserManagement } from "@/components/settings/user-management";

const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
}));

const members = [
  {
    id: "u-1",
    name: "Priya Shah",
    email: "priya@acme.example",
    role: "owner" as const,
  },
];
const candidates = [
  {
    id: "p-dana",
    name: "Dana Whitfield",
    email: "dana@acme.example",
    title: "SRE",
  },
  {
    id: "p-casey",
    name: "Casey Okafor",
    email: "casey@acme.example",
    title: null,
  },
];

function renderIt(withCandidates = candidates) {
  return render(
    <UserManagement
      members={members}
      candidates={withCandidates}
      currentUserId="u-1"
      actorRole="owner"
    />,
  );
}

const sentBody = () =>
  JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);

describe("Add member", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "new" } }),
    });
  });

  it("starts on the directory when there are people to pick", async () => {
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole("button", { name: /add member/i }));

    expect(
      screen.getByRole("tab", { name: "From the directory" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Person")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("adds a person picked from the directory, without typing their details", async () => {
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole("button", { name: /add member/i }));

    await user.type(screen.getByLabelText("Person"), "dan");
    await user.click(
      await screen.findByRole("option", { name: /Dana Whitfield/ }),
    );
    await user.type(screen.getByLabelText("Initial password"), "password1");
    await user.click(screen.getByRole("button", { name: "Add member" }));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("/api/users");
    expect(sentBody()).toEqual({
      personId: "p-dana",
      password: "password1",
      role: "viewer",
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("asks for a person before adding from the directory", async () => {
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole("button", { name: /add member/i }));
    await user.type(screen.getByLabelText("Initial password"), "password1");
    await user.click(screen.getByRole("button", { name: "Add member" }));

    expect(
      await screen.findByText("Pick a person from the directory."),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("adds someone new by hand, optionally also to the directory", async () => {
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole("button", { name: /add member/i }));
    await user.click(screen.getByRole("tab", { name: "Someone new" }));

    await user.type(screen.getByLabelText("Name"), "Jordan Contractor");
    await user.type(screen.getByLabelText("Email"), "jordan@other.io");
    await user.type(screen.getByLabelText("Initial password"), "password1");
    await user.click(
      screen.getByLabelText("Also add them to the people directory"),
    );
    await user.click(screen.getByRole("button", { name: "Add member" }));

    expect(sentBody()).toEqual({
      name: "Jordan Contractor",
      email: "jordan@other.io",
      password: "password1",
      role: "viewer",
      addToDirectory: true,
    });
  });

  it("goes straight to manual entry when everyone already has access", async () => {
    const user = userEvent.setup();
    renderIt([]);
    await user.click(screen.getByRole("button", { name: /add member/i }));

    expect(screen.getByRole("tab", { name: "Someone new" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});
