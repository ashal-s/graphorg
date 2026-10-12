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

    expect(screen.getByRole("link", { name: "Engineering" })).toHaveAttribute(
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

  it("puts a department's teams and direct people inside its block", () => {
    const { container } = render(<OrgStructureTree structure={structure} />);

    const blocks = container.querySelectorAll('[data-slot="department-block"]');
    expect(blocks).toHaveLength(2);
    const platform = [...blocks].find((b) =>
      within(b as HTMLElement).queryByRole("link", { name: "Platform" }),
    ) as HTMLElement;
    expect(
      within(platform).getByRole("link", { name: "Payments" }),
    ).toBeInTheDocument();
    expect(
      within(platform).getByRole("link", { name: /Cy Direct/ }),
    ).toBeInTheDocument();
    // Sub-departments are further blocks below, not inside the parent block.
    const engineering = [...blocks].find((b) =>
      within(b as HTMLElement).queryByRole("link", { name: "Engineering" }),
    ) as HTMLElement;
    expect(
      within(engineering).queryByRole("link", { name: "Platform" }),
    ).toBeNull();
    // Nothing inside a block is a list item the chart's lines hang on.
    for (const block of blocks) {
      expect(block.querySelector("ul, li")).toBeNull();
    }
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
    // Not a separate branch under the team, and not list items the chart's
    // connector lines would be drawn on.
    expect(block.closest("li")!.querySelector(":scope > ul")).toBeNull();
    expect(block.querySelector("ul, li")).toBeNull();
  });

  it("shows no head names, headcounts or Lead label; leads are just bolder", () => {
    render(<OrgStructureTree structure={structure} />);

    expect(screen.queryByText("Hana Ito")).not.toBeInTheDocument();
    expect(screen.queryByText("Lead")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ people?/)).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Team lead" })).toBeNull();

    const lead = screen.getByText("Ana Cruz", { exact: false });
    expect(lead).toHaveClass("font-bold");
    // Still announced to assistive tech.
    expect(within(lead).getByText("(team lead)")).toBeInTheDocument();
    expect(screen.getByText("Ben Ole")).toHaveClass("font-normal");
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
