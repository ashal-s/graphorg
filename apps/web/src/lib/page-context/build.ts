import {
  buildCatalog,
  buildService,
  buildServices,
  buildTool,
  buildTools,
} from "./builders/catalog";
import {
  buildDepartment,
  buildDepartments,
  buildDirectory,
  buildOrgChartContext,
  buildPeople,
  buildPerson,
  buildTeam,
  buildTeams,
} from "./builders/directory";
import { buildDocument, buildFolder } from "./builders/documents";
import {
  buildOrganizationSettings,
  buildOverview,
} from "./builders/organization";
import { buildWorkflow, buildWorkflows } from "./builders/workflows";
import type { ContextScope, PageContext } from "./types";

/**
 * Picks the builder for a scope. The switch is exhaustive on purpose: adding
 * a kind to `ContextScope` fails to compile until it has a builder here.
 * Returns null when the record is gone or isn't in this organization.
 */
export function buildPageContext(
  orgId: string,
  scope: ContextScope,
): Promise<PageContext | null> {
  switch (scope.kind) {
    case "overview":
      return buildOverview(orgId);
    case "directory":
      return buildDirectory(orgId);
    case "people":
      return buildPeople(orgId);
    case "teams":
      return buildTeams(orgId);
    case "departments":
      return buildDepartments(orgId);
    case "department":
      return buildDepartment(orgId, scope.id);
    case "person":
      return buildPerson(orgId, scope.id);
    case "team":
      return buildTeam(orgId, scope.id);
    case "org-chart":
      return buildOrgChartContext(orgId);
    case "catalog":
      return buildCatalog(orgId);
    case "services":
      return buildServices(orgId);
    case "tools":
      return buildTools(orgId);
    case "service":
      return buildService(orgId, scope.id);
    case "tool":
      return buildTool(orgId, scope.id);
    case "folder":
      return buildFolder(orgId, scope.id);
    case "document":
      return buildDocument(orgId, scope.id);
    case "workflows":
      return buildWorkflows(orgId);
    case "workflow":
      return buildWorkflow(orgId, scope.id);
    case "settings-organization":
      return buildOrganizationSettings(orgId);
  }
}

export const CONTEXT_NOTE =
  "Snapshot of one GraphOrg page, for review or advice. Related records are references only, not full detail: each has a `path` whose own page has a copy button for its full context.";

/** The copied document: where it came from, then the page's data. */
export function wrapContext(
  context: PageContext,
  meta: { organization: string; generatedAt: Date },
) {
  return {
    _meta: {
      page: context.page,
      path: context.path,
      organization: meta.organization,
      generatedAt: meta.generatedAt.toISOString(),
      note: CONTEXT_NOTE,
    },
    data: context.data,
  };
}
