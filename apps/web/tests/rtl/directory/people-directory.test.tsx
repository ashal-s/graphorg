import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PeopleDirectory } from "@/components/directory/people-directory";

const teams = [
  { id: "t-pay", name: "Payments" },
  { id: "t-sre", name: "Reliability" },
];

const people = [
  {
    id: "ceo",
    slug: "ceo-slug",
    name: "Priya Shah",
    email: "priya@acme.com",
    title: "CEO",
    managerId: null,
    teams: [],
  },
  {
    id: "alex",
    slug: "alex-slug",
    name: "Alex Kim",
    email: "alex@acme.com",
    title: "Engineering Manager",
    managerId: "ceo",
    teams: [{ id: "t-pay", name: "Payments" }],
  },
  {
    id: "dana",
    slug: "dana-slug",
    name: "Dana Whitfield",
    email: "dana@acme.com",
    title: "SRE",
    managerId: "alex",
    teams: [{ id: "t-sre", name: "Reliability" }],
  },
  {
    id: "casey",
    slug: "casey-slug",
    name: "Casey Okafor",
    email: "casey@acme.com",
    title: "Engineer",
    managerId: "ceo",
    teams: [{ id: "t-pay", name: "Payments" }],
  },
];

const names = () =>
  screen
    .getAllByRole("link")
    .map((link) => link.querySelector('[data-slot="name"]')?.textContent)
    .filter(Boolean);

function renderDirectory() {
  return render(
    <PeopleDirectory
      people={people}
      teams={teams}
      canEdit
      emptyAction={<button>Add</button>}
    />,
  );
}

describe("PeopleDirectory", () => {
  it("lists people ranked by org level", () => {
    renderDirectory();
    expect(names()).toEqual([
      "Priya Shah",
      "Alex Kim",
      "Casey Okafor",
      "Dana Whitfield",
    ]);
  });

  it("filters on every character typed, without a submit", async () => {
    const user = userEvent.setup();
    renderDirectory();
    const box = screen.getByLabelText("Search people");

    // "k" appears in "Alex Kim" and "Casey Okafor" only.
    await user.type(box, "k");
    expect(names()).toEqual(["Alex Kim", "Casey Okafor"]);

    await user.clear(box);
    await user.type(box, "ca");
    expect(names()).toEqual(["Casey Okafor"]);

    await user.clear(box);
    expect(names()).toHaveLength(4);
  });

  it("matches email and position too", async () => {
    const user = userEvent.setup();
    renderDirectory();
    const box = screen.getByLabelText("Search people");

    await user.type(box, "casey@");
    expect(names()).toEqual(["Casey Okafor"]);

    await user.clear(box);
    await user.type(box, "sre");
    expect(names()).toEqual(["Dana Whitfield"]);
  });

  it("filters by team, combined with the search", async () => {
    const user = userEvent.setup();
    renderDirectory();

    await user.selectOptions(screen.getByLabelText("Filter by team"), "t-pay");
    expect(names()).toEqual(["Alex Kim", "Casey Okafor"]);

    await user.type(screen.getByLabelText("Search people"), "cas");
    expect(names()).toEqual(["Casey Okafor"]);
  });

  it("links each person to their slug, not their id", () => {
    renderDirectory();
    const link = screen.getByText("Casey Okafor").closest("a");
    expect(link).toHaveAttribute("href", "/casey-slug");
  });

  it("shows teams on each row", () => {
    renderDirectory();
    const row = screen.getByRole("link", { name: /Dana Whitfield/ });
    expect(within(row).getByText("Reliability")).toBeInTheDocument();
  });

  it("explains an empty result and lets it be cleared", async () => {
    const user = userEvent.setup();
    renderDirectory();
    await user.type(screen.getByLabelText("Search people"), "zzz");

    expect(screen.getByText("No people match your search")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(names()).toHaveLength(4);
  });

  it("offers the add action only when the directory is empty", () => {
    render(
      <PeopleDirectory
        people={[]}
        teams={teams}
        canEdit
        emptyAction={<button>Add</button>}
      />,
    );
    expect(screen.getByText("No people yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
