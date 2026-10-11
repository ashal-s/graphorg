import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TeamsDirectory } from "@/components/directory/teams-directory";

const teams = [
  {
    id: "t1",
    name: "Payments",
    description: "Checkout and billing",
    memberCount: 3,
  },
  { id: "t2", name: "Growth", description: "Acquisition", memberCount: 1 },
  { id: "t3", name: "Platform", description: null, memberCount: 0 },
];

const names = () =>
  screen
    .getAllByRole("link")
    .map((link) => link.querySelector("p")?.textContent);

describe("TeamsDirectory", () => {
  it("filters on every character typed", async () => {
    const user = userEvent.setup();
    render(<TeamsDirectory teams={teams} canEdit />);
    const box = screen.getByLabelText("Search teams");

    await user.type(box, "p");
    expect(names()).toEqual(["Payments", "Platform"]);

    await user.type(box, "ay");
    expect(names()).toEqual(["Payments"]);
  });

  it("also searches the description", async () => {
    const user = userEvent.setup();
    render(<TeamsDirectory teams={teams} canEdit />);

    await user.type(screen.getByLabelText("Search teams"), "acqui");
    expect(names()).toEqual(["Growth"]);
  });

  it("shows the member count and handles no matches", async () => {
    const user = userEvent.setup();
    render(<TeamsDirectory teams={teams} canEdit />);
    expect(screen.getByText("3 people")).toBeInTheDocument();
    expect(screen.getByText("1 person")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search teams"), "zzz");
    expect(screen.getByText("No teams match your search")).toBeInTheDocument();
  });
});
