import { render, screen, within } from "@testing-library/react";

import { OrgStructureTree } from "@/components/directory/org-structure-tree";
import { PageTabs } from "@/components/shared/page-tabs";
import type { OrgStructure } from "@/lib/directory/org-structure";

const person = (id: string, name: string, teamRole?: "lead" | "member") => ({
  id,
  slug: id,
  name,
  title: null,
  photoUrl: null,
  teamRole,
});

const structure: OrgStructure = {
  departments: [
    {
      id: "eng",
      name: "Engineering",
      parentId: null,
      heads: [{ id: "h", slug: "hana", name: "Hana Ito" }],
      teams: [],
      people: [],
      children: [
        {
          id: "plat",
          name: "Platform",
          parentId: "eng",
          heads: [],
          teams: [
            {
              id: "t1",
              slug: "payments",
              name: "Payments",
              members: [
                person("a", "Ana Cruz", "lead"),
                person("b", "Ben Ole", "member"),
              ],
            },
          ],
          people: [person("c", "Cy Direct")],
          children: [],
        },
      ],
    },
  ],
  teamsWithoutDepartment: [{ id: "t2", slug: "ops", name: "Ops", members: [] }],
  peopleWithoutPlace: [person("z", "Zoe Alone")],
};

describe("OrgStructureTree", () => {
  it("shows departments, their teams, and the people on each team", () => {
    render(<OrgStructureTree structure={structure} />);

    expect(screen.getByRole("link", { name: /Engineering/ })).toHaveAttribute(
      "href",
      "/directory/departments/eng",
    );
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute(
      "href",
      "/payments",
    );
    expect(screen.getByRole("link", { name: /Ana Cruz/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cy Direct/ })).toBeInTheDocument();
  });

  it("puts a team's people inside the team's block", () => {
    render(<OrgStructureTree structure={structure} />);

    const block = screen
      .getByRole("link", { name: "Payments" })
      .closest("div")!;
    expect(
      within(block).getByRole("link", { name: /Ana Cruz/ }),
    ).toBeInTheDocument();
    expect(
      within(block).getByRole("link", { name: /Ben Ole/ }),
    ).toBeInTheDocument();
    // Not a separate branch under the team.
    expect(block.closest("li")!.querySelector(":scope > ul")).toBeNull();
  });

  it("shows no head names, headcounts or Lead label, only a subtle lead mark", () => {
    render(<OrgStructureTree structure={structure} />);

    expect(screen.queryByText("Hana Ito")).not.toBeInTheDocument();
    expect(screen.queryByText("Lead")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ people?/)).not.toBeInTheDocument();
    // Only the lead is marked.
    expect(screen.getAllByRole("img", { name: "Team lead" })).toHaveLength(1);
    const ana = screen.getByRole("link", { name: /Ana Cruz/ });
    expect(
      within(ana).getByRole("img", { name: "Team lead" }),
    ).toBeInTheDocument();
  });

  it("draws it as a connected chart, like the people chart", () => {
    const { container } = render(<OrgStructureTree structure={structure} />);
    expect(container.querySelectorAll("ul.org-tree").length).toBeGreaterThan(0);
  });

  it("hangs teams and people with no place off their own boxes", () => {
    render(<OrgStructureTree structure={structure} />);

    const noDepartment = screen.getByText("No department").closest("li")!;
    expect(
      within(noDepartment).getByRole("link", { name: /Ops/ }),
    ).toBeInTheDocument();
    const noPlace = screen.getByText("No team or department").closest("li")!;
    expect(
      within(noPlace).getByRole("link", { name: /Zoe Alone/ }),
    ).toBeInTheDocument();
  });
});

describe("PageTabs", () => {
  it("marks the active tab and links each one", () => {
    render(
      <PageTabs
        label="Views"
        activeId="people"
        tabs={[
          { id: "structure", label: "Structure", href: "/org-chart" },
          { id: "people", label: "People", href: "/org-chart?tab=people" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "People" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Structure" })).toHaveAttribute(
      "href",
      "/org-chart",
    );
  });
});
