import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TeamsDirectory } from "@/components/directory/teams-directory";

const member = (
  id: string,
  name: string,
  teamRole: "lead" | "member" = "member",
) => ({ id, name, photoSrc: null, teamRole });

const teams = [
  {
    id: "t1",
    slug: "t1-slug",
    name: "Payments",
    description: "Checkout and billing",
    departments: [
      { id: "d1", name: "Engineering" },
      { id: "d2", name: "Finance" },
    ],
    members: [
      member("p1", "Priya Shah", "lead"),
      member("p2", "Alex Kim"),
      member("p3", "Sam Rivera"),
    ],
  },
  {
    id: "t2",
    slug: "t2-slug",
    name: "Growth",
    description: "Acquisition",
    departments: [],
    members: [member("p4", "Riley Chen")],
  },
  {
    id: "t3",
    slug: "platform",
    name: "Platform",
    description: null,
    departments: [],
    members: [],
  },
];

const names = () =>
  screen
    .getAllByRole("link")
    .map((link) => link.querySelector('[data-slot="name"]')?.textContent);

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

  it("also searches by department name", async () => {
    const user = userEvent.setup();
    render(<TeamsDirectory teams={teams} canEdit />);

    await user.type(screen.getByLabelText("Search teams"), "financ");
    expect(names()).toEqual(["Payments"]);
  });

  it("shows the member count and handles no matches", async () => {
    const user = userEvent.setup();
    render(<TeamsDirectory teams={teams} canEdit />);
    expect(screen.getByText("3 people")).toBeInTheDocument();
    expect(screen.getByText("1 person")).toBeInTheDocument();
    // Just the names, no "Led by" / "Department" captions.
    expect(screen.getByText("Priya Shah")).toBeInTheDocument();
    expect(screen.getByText("Engineering and Finance")).toBeInTheDocument();
    expect(screen.queryByText(/led by/i)).not.toBeInTheDocument();
    expect(screen.getByText("No members yet")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search teams"), "zzz");
    expect(screen.getByText("No teams match your search")).toBeInTheDocument();
  });

  it("links each team to its slug, not its id", () => {
    render(<TeamsDirectory teams={teams} canEdit />);
    const link = screen.getByText("Payments").closest("a");
    expect(link).toHaveAttribute("href", "/t1-slug");
  });
});
