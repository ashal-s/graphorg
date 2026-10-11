export type WorkflowRole = "owner" | "creator" | "worker";

export const WORKFLOW_ROLE_ORDER: WorkflowRole[] = [
  "owner",
  "creator",
  "worker",
];

export const WORKFLOW_ROLE_LABELS: Record<WorkflowRole, string> = {
  owner: "Owner",
  creator: "Creator",
  worker: "Assigned",
};

export interface ProfileRecord {
  id: string;
  name: string;
}

export interface ProfileWorkflow extends ProfileRecord {
  roles: WorkflowRole[];
  status: string;
}

export interface ProfileService extends ProfileRecord {
  description: string | null;
  /** Assigned to this person directly, as opposed to only via a team. */
  direct: boolean;
}

export interface ProfileTool extends ProfileRecord {
  category: string;
}

export interface ProfileDocument {
  id: string;
  title: string;
  type: string;
  url: string | null;
}

export interface AssembledPersonProfile {
  teams: ProfileRecord[];
  manager: ProfileRecord | null;
  directReports: ProfileRecord[];
  workflows: ProfileWorkflow[];
  services: ProfileService[];
  tools: ProfileTool[];
  documents: ProfileDocument[];
}

export interface AssemblePersonProfileInput {
  teams: ProfileRecord[];
  manager: ProfileRecord | null;
  directReports: ProfileRecord[];
  workflowLinks: Array<{
    role: WorkflowRole;
    workflow: {
      id: string;
      name: string;
      status: string;
      organizationId?: string;
    } | null;
  }>;
  organizationId?: string;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    direct?: boolean;
    tools: Array<{ tool: ProfileTool | null }>;
  }>;
  documents: ProfileDocument[];
}

function byName<T extends { name: string }>(a: T, b: T) {
  return a.name.localeCompare(b.name);
}

function sortRoles(roles: WorkflowRole[]) {
  return [...roles].sort(
    (a, b) => WORKFLOW_ROLE_ORDER.indexOf(a) - WORKFLOW_ROLE_ORDER.indexOf(b),
  );
}

/**
 * Pure shaping of a person's profile relationships. Services and documents
 * are the ones their teams own plus any assigned to them directly (the
 * caller supplies both). Workflows come from `workflow_people`. Tools are
 * the unique set used across those services.
 */
export function assemblePersonProfile(
  input: AssemblePersonProfileInput,
): AssembledPersonProfile {
  const workflowsById = new Map<string, ProfileWorkflow>();
  for (const link of input.workflowLinks) {
    if (!link.workflow) continue;
    if (
      input.organizationId &&
      link.workflow.organizationId &&
      link.workflow.organizationId !== input.organizationId
    ) {
      continue;
    }
    const existing = workflowsById.get(link.workflow.id);
    if (existing) {
      if (!existing.roles.includes(link.role)) existing.roles.push(link.role);
    } else {
      workflowsById.set(link.workflow.id, {
        id: link.workflow.id,
        name: link.workflow.name,
        status: link.workflow.status,
        roles: [link.role],
      });
    }
  }

  const toolsById = new Map<string, ProfileTool>();

  const services: ProfileService[] = input.services
    .map((service) => {
      for (const link of service.tools) {
        if (link.tool) toolsById.set(link.tool.id, link.tool);
      }
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        direct: service.direct ?? false,
      };
    })
    .sort(byName);

  return {
    teams: [...input.teams].sort(byName),
    manager: input.manager,
    directReports: [...input.directReports].sort(byName),
    workflows: [...workflowsById.values()]
      .map((workflow) => ({
        ...workflow,
        roles: sortRoles(workflow.roles),
      }))
      .sort(byName),
    services,
    tools: [...toolsById.values()].sort(byName),
    documents: [...input.documents].sort((a, b) =>
      a.title.localeCompare(b.title),
    ),
  };
}
