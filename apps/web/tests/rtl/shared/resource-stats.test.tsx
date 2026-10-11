import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  ResourceStats,
  type Resource,
} from "@/components/shared/resource-stats";

const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: refreshMock }),
}));

const resources: Resource[] = [
  {
    key: "teams",
    label: "Teams",
    singular: "team",
    emptyText: "Not on any team.",
    items: [
      {
        id: "team-1",
        name: "Payments",
        href: "/directory/teams/team-1",
        remove: { url: "/api/teams/team-1/members/me", method: "DELETE" },
      },
    ],
    assign: {
      label: "Add to a team",
      title: "Add to a team",
      options: [
        { id: "team-2", label: "Growth" },
        { id: "team-3", label: "Data" },
      ],
      url: "/api/teams/{id}/members/me",
      method: "PUT",
      level: {
        label: "Level",
        key: "teamRole",
        defaultValue: "member",
        options: [
          { value: "lead", label: "Lead" },
          { value: "member", label: "Member" },
        ],
      },
    },
  },
];

describe("ResourceStats assign and remove", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it("adds the picked records with the chosen level, then refreshes", async () => {
    const user = userEvent.setup();
    render(<ResourceStats resources={resources} />);

    await user.click(screen.getByRole("button", { name: /add to a team/i }));
    await user.type(screen.getByLabelText("Teams"), "gro");
    await user.click(await screen.findByRole("option", { name: "Growth" }));
    await user.selectOptions(screen.getByLabelText("Level"), "lead");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/teams/team-2/members/me");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ teamRole: "lead" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("keeps Save disabled until something is picked", async () => {
    const user = userEvent.setup();
    render(<ResourceStats resources={resources} />);
    await user.click(screen.getByRole("button", { name: /add to a team/i }));

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows the server's message when adding fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Forbidden" }),
    });
    const user = userEvent.setup();
    render(<ResourceStats resources={resources} />);
    await user.click(screen.getByRole("button", { name: /add to a team/i }));
    await user.type(screen.getByLabelText("Teams"), "dat");
    await user.click(await screen.findByRole("option", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
  });

  it("removes an item after confirming", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<ResourceStats resources={resources} />);

    await user.click(screen.getByRole("button", { name: "Remove Payments" }));

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/teams/team-1/members/me");
    expect(init.method).toBe("DELETE");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("does nothing when the removal isn't confirmed", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ResourceStats resources={resources} />);

    await user.click(screen.getByRole("button", { name: "Remove Payments" }));

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
