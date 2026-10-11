import type {
  Resource,
  ResourceAssign,
} from "@/components/shared/resource-stats";
import type { Terminology } from "@/lib/terminology";
import { lowerLabel } from "@/lib/terminology";

import {
  WORKFLOW_ROLE_LABELS,
  WORKFLOW_ROLE_ORDER,
  type AssembledPersonProfile,
} from "./person-profile";

type Option = { id: string; name: string };

/**
 * What the viewer may change from the person's page, and what they could
 * pick from. Leave out for a read-only page.
 */
export interface PersonResourceEditing {
  personId: string;
  /** Teams, workflows and services (editor and up). */
  canAssign: boolean;
  /** Direct reports change someone else's manager (admin and up). */
  canAssignReports: boolean;
  teams: Option[];
  workflows: Option[];
  services: Option[];
  /** Everyone else in the directory. */
  people: Option[];
}

function notIn(options: Option[], current: { id: string }[]) {
  const taken = new Set(current.map((record) => record.id));
  return options
    .filter((option) => !taken.has(option.id))
    .map((option) => ({ id: option.id, label: option.name }));
}

/**
 * A person's relationships as clickable stats: each one is a count that,
 * when selected, lists the records behind it with a link to each.
 */
export function buildPersonResources(
  profile: AssembledPersonProfile,
  terminology: Terminology,
  editing?: PersonResourceEditing,
): Resource[] {
  const servicePlural = lowerLabel(terminology.services.plural);
  const toolPlural = lowerLabel(terminology.tools.plural);

  const personId = editing?.personId ?? "";
  const canAssign = Boolean(editing?.canAssign);

  const teamAssign: ResourceAssign | undefined =
    editing && canAssign
      ? {
          label: "Add to a team",
          title: "Add to a team",
          description: "They keep any teams they are already on.",
          options: notIn(editing.teams, profile.teams),
          url: `/api/teams/{id}/members/${personId}`,
          method: "PUT",
          searchPlaceholder: "Search teams",
          level: {
            label: "Level",
            key: "teamRole",
            defaultValue: "member",
            options: [
              { value: "lead", label: "Lead" },
              { value: "member", label: "Member" },
              { value: "trainee", label: "Trainee" },
            ],
          },
        }
      : undefined;

  const workflowAssign: ResourceAssign | undefined =
    editing && canAssign
      ? {
          label: "Add to a workflow",
          title: "Add to a workflow",
          options: notIn(editing.workflows, profile.workflows),
          url: `/api/people/${personId}/workflows/{id}`,
          method: "PUT",
          searchPlaceholder: "Search workflows",
          level: {
            label: "Role",
            key: "roles",
            asArray: true,
            defaultValue: "worker",
            options: WORKFLOW_ROLE_ORDER.map((role) => ({
              value: role,
              label: WORKFLOW_ROLE_LABELS[role],
            })),
          },
        }
      : undefined;

  const serviceAssign: ResourceAssign | undefined =
    editing && canAssign
      ? {
          label: `Assign to a ${lowerLabel(terminology.services.singular)}`,
          title: `Assign to a ${lowerLabel(terminology.services.singular)}`,
          description: `Their teams' ${servicePlural} are already included.`,
          options: notIn(editing.services, profile.services),
          url: `/api/people/${personId}/services/{id}`,
          method: "PUT",
          searchPlaceholder: `Search ${servicePlural}`,
        }
      : undefined;

  const reportAssign: ResourceAssign | undefined =
    editing && editing.canAssignReports
      ? {
          label: "Add a direct report",
          title: "Add a direct report",
          description: "Their manager becomes this person.",
          options: notIn(editing.people, profile.directReports),
          url: "/api/people/{id}",
          method: "PATCH",
          body: { managerId: personId },
          searchPlaceholder: "Search people",
        }
      : undefined;

  return [
    {
      key: "teams",
      label: "Teams",
      singular: "team",
      emptyText: "Not on any team.",
      assign: teamAssign,
      items: profile.teams.map((team) => ({
        id: team.id,
        name: team.name,
        href: `/directory/teams/${team.id}`,
        remove: canAssign
          ? {
              url: `/api/teams/${team.id}/members/${personId}`,
              method: "DELETE" as const,
            }
          : undefined,
      })),
    },
    {
      key: "workflows",
      label: "Workflows",
      singular: "workflow",
      emptyText: "Not involved in any workflows.",
      assign: workflowAssign,
      items: profile.workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        href: `/workflows/${workflow.id}`,
        remove: canAssign
          ? {
              url: `/api/people/${personId}/workflows/${workflow.id}`,
              method: "DELETE" as const,
            }
          : undefined,
        badges: workflow.roles.map((role) => WORKFLOW_ROLE_LABELS[role]),
      })),
    },
    {
      key: "services",
      label: terminology.services.plural,
      singular: lowerLabel(terminology.services.singular),
      emptyText: `Not on any ${servicePlural}.`,
      assign: serviceAssign,
      items: profile.services.map((service) => ({
        id: service.id,
        name: service.name,
        href: `/catalog/services/${service.id}`,
        // Only direct assignments can be removed here; the rest come from
        // a team the person is on.
        remove:
          canAssign && service.direct
            ? {
                url: `/api/people/${personId}/services/${service.id}`,
                method: "DELETE" as const,
              }
            : undefined,
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
        href: `/documents/${document.id}`,
        badges: [document.type],
      })),
    },
    {
      key: "reports",
      label: "Direct reports",
      singular: "report",
      emptyText: "Nobody reports to this person.",
      assign: reportAssign,
      items: profile.directReports.map((person) => ({
        id: person.id,
        name: person.name,
        href: `/directory/people/${person.id}`,
        remove: editing?.canAssignReports
          ? {
              url: `/api/people/${person.id}`,
              method: "PATCH" as const,
              body: { managerId: null },
            }
          : undefined,
      })),
    },
  ];
}
