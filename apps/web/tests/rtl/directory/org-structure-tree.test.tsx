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
    expect(screen.getByText("Hana Ito")).toBeInTheDocument();
    const team = screen.getByRole("link", { name: "Payments" });
    expect(team).toHaveAttribute("href", "/payments");
    expect(screen.getByRole("link", { name: /Ana Cruz/ })).toBeInTheDocument();
    expect(screen.getByText("Lead")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cy Direct/ })).toBeInTheDocument();
  });

  it("lists teams and people that have no department or team", () => {
    render(<OrgStructureTree structure={structure} />);

    expect(screen.getByText("Teams without a department")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ops" })).toBeInTheDocument();
    const group = screen
      .getByText("People without a team or department")
      .closest("section")!;
    expect(
      within(group).getByRole("link", { name: /Zoe Alone/ }),
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
