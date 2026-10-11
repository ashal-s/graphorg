import type { Resource } from "@/components/shared/resource-stats";
import type { Terminology } from "@/lib/terminology";
import { lowerLabel } from "@/lib/terminology";

import {
  WORKFLOW_ROLE_LABELS,
  type AssembledPersonProfile,
} from "./person-profile";

/**
 * A person's relationships as clickable stats: each one is a count that,
 * when selected, lists the records behind it with a link to each.
 */
export function buildPersonResources(
  profile: AssembledPersonProfile,
  terminology: Terminology,
): Resource[] {
  const servicePlural = lowerLabel(terminology.services.plural);
  const toolPlural = lowerLabel(terminology.tools.plural);

  return [
    {
      key: "teams",
      label: "Teams",
      singular: "team",
      emptyText: "Not on any team.",
      items: profile.teams.map((team) => ({
        id: team.id,
        name: team.name,
        href: `/directory/teams/${team.id}`,
      })),
    },
    {
      key: "workflows",
      label: "Workflows",
      singular: "workflow",
      emptyText: "Not involved in any workflows.",
      items: profile.workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        href: `/workflows/${workflow.id}`,
        badges: workflow.roles.map((role) => WORKFLOW_ROLE_LABELS[role]),
      })),
    },
    {
      key: "services",
      label: terminology.services.plural,
      singular: lowerLabel(terminology.services.singular),
      emptyText: `Their teams don't own any ${servicePlural}.`,
      items: profile.services.map((service) => ({
        id: service.id,
        name: service.name,
        href: `/catalog/services/${service.id}`,
      })),
    },
    {
      key: "tools",
      label: terminology.tools.plural,
      singular: lowerLabel(terminology.tools.singular),
      emptyText: `No ${toolPlural} are recorded on their ${servicePlural}.`,
      items: profile.tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        href: `/catalog/tools/${tool.id}`,
      })),
    },
    {
      key: "documents",
      label: "Documents",
      singular: "document",
      emptyText: "Their teams don't manage any documents.",
      items: profile.documents.map((document) => ({
        id: document.id,
        name: document.title,
        href: `/catalog/documents/${document.id}`,
        badges: [document.type],
      })),
    },
    {
      key: "reports",
      label: "Direct reports",
      singular: "report",
      emptyText: "Nobody reports to this person.",
      items: profile.directReports.map((person) => ({
        id: person.id,
        name: person.name,
        href: `/directory/people/${person.id}`,
      })),
    },
  ];
}
