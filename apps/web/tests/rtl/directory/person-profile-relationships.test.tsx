import { render, screen } from "@testing-library/react";

import { PersonProfileRelationships } from "@/components/directory/person-profile-relationships";
import type { AssembledPersonProfile } from "@/lib/directory/person-profile";

const seededProfile: AssembledPersonProfile = {
  teams: [
    { id: "team-payments", name: "Payments" },
    { id: "team-sre", name: "Site Reliability" },
  ],
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
  tools: [
    { id: "tool-github", name: "GitHub", category: "source_control" },
    { id: "tool-jira", name: "Jira", category: "issue_tracking" },
  ],
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
  it("links a seeded person's team, workflows, tools, ownership, and documents", () => {
    render(<PersonProfileRelationships profile={seededProfile} />);

    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute(
      "href",
      "/directory/teams/team-payments",
    );
    expect(
      screen.getByRole("link", { name: "Site Reliability" }),
    ).toHaveAttribute("href", "/directory/teams/team-sre");
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

    expect(screen.getByRole("link", { name: "Jira" })).toHaveAttribute(
      "href",
      "/catalog/tools/tool-jira",
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
          teams: [],
          manager: null,
          directReports: [],
          workflows: [],
          services: [],
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
      screen.getByText("No tools are recorded on this person's services."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This person's team doesn't manage any documents."),
    ).toBeInTheDocument();
  });
});
