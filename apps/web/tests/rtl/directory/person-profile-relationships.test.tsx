import { render, screen } from "@testing-library/react";

import { PersonProfileRelationships } from "@/components/directory/person-profile-relationships";
import type { AssembledPersonProfile } from "@/lib/directory/person-profile";

const seededProfile: AssembledPersonProfile = {
  team: { id: "team-payments", name: "Payments" },
  manager: { id: "person-priya", name: "Priya Shah" },
  directReports: [{ id: "person-taylor", name: "Taylor Brooks" }],
  workflows: [
    {
      id: "wf-runbooks",
      name: "Escalate stale runbooks",
      status: "draft",
      roles: ["owner", "creator"],
    },
  ],
  services: [
    { id: "svc-checkout-api", name: "checkout-api", description: null },
    { id: "svc-checkout-web", name: "checkout-web", description: null },
  ],
  technologies: [
    { id: "tech-go", name: "Go" },
    { id: "tech-ts", name: "TypeScript" },
  ],
  tools: [{ id: "tool-github", name: "GitHub", category: "source_control" }],
  repositories: [
    {
      id: "repo-checkout-api",
      name: "checkout-api",
      url: "https://github.com/acme/checkout-api",
    },
  ],
  documents: [
    {
      id: "doc-adr",
      title: "Checkout API Architecture",
      type: "adr",
      url: "https://docs.acme.example/adr/checkout-api",
    },
  ],
};

describe("PersonProfileRelationships", () => {
  it("links a seeded person's team, workflows, stack, ownership, and documents", () => {
    render(<PersonProfileRelationships profile={seededProfile} />);

    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute(
      "href",
      "/directory/teams/team-payments",
    );
    expect(screen.getByRole("link", { name: "Priya Shah" })).toHaveAttribute(
      "href",
      "/directory/people/person-priya",
    );
    expect(screen.getByRole("link", { name: "Taylor Brooks" })).toHaveAttribute(
      "href",
      "/directory/people/person-taylor",
    );

    const workflowLink = screen.getByRole("link", {
      name: /Escalate stale runbooks/,
    });
    expect(workflowLink).toHaveAttribute("href", "/workflows/wf-runbooks");
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Creator")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "checkout-web" })).toHaveAttribute(
      "href",
      "/catalog/services/svc-checkout-web",
    );
    const checkoutApiHrefs = screen
      .getAllByRole("link", { name: "checkout-api" })
      .map((link) => link.getAttribute("href"));
    expect(checkoutApiHrefs).toEqual(
      expect.arrayContaining([
        "/catalog/services/svc-checkout-api",
        "/catalog/repositories/repo-checkout-api",
      ]),
    );

    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute(
      "href",
      "/catalog/technologies/tech-go",
    );
    expect(screen.getByRole("link", { name: "TypeScript" })).toHaveAttribute(
      "href",
      "/catalog/technologies/tech-ts",
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "/catalog/tools/tool-github",
    );

    expect(
      screen.getByRole("link", { name: "Checkout API Architecture" }),
    ).toHaveAttribute("href", "/catalog/documents/doc-adr");
  });

  it("renders empty-state copy when a person has no linked records", () => {
    render(
      <PersonProfileRelationships
        profile={{
          team: null,
          manager: null,
          directReports: [],
          workflows: [],
          services: [],
          technologies: [],
          tools: [],
          repositories: [],
          documents: [],
        }}
      />,
    );

    expect(screen.getByText("Not on a team.")).toBeInTheDocument();
    expect(screen.getByText("No manager set.")).toBeInTheDocument();
    expect(
      screen.getByText("Nobody reports to this person."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This person doesn't own or isn't assigned to any workflows.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This person's team doesn't own any services."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This person's team doesn't own any repositories."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No technologies are recorded on this person's services.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No tools are recorded in this organisation."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This person's team doesn't manage any documents."),
    ).toBeInTheDocument();
  });
});
