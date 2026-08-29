import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/db";
import { serviceDependencies, services } from "@/db/schema";

/** `serviceId -> [dependsOnServiceId, ...]` for one organization's dependency graph. */
export type DependencyGraph = Map<string, string[]>;

/**
 * Every `service_dependencies` edge belonging to `organizationId`, excluding
 * `excludeServiceId`'s own outgoing edges (the ones a PATCH is about to
 * replace, so they shouldn't count toward whether the *new* edges form a
 * cycle).
 */
export async function loadDependencyGraph(
  organizationId: string,
  excludeServiceId?: string,
): Promise<DependencyGraph> {
  const rows = await getDb()
    .select({
      serviceId: serviceDependencies.serviceId,
      dependsOnServiceId: serviceDependencies.dependsOnServiceId,
    })
    .from(serviceDependencies)
    .innerJoin(services, eq(serviceDependencies.serviceId, services.id))
    .where(
      and(
        eq(services.organizationId, organizationId),
        excludeServiceId
          ? ne(serviceDependencies.serviceId, excludeServiceId)
          : undefined,
      ),
    );

  const graph: DependencyGraph = new Map();
  for (const row of rows) {
    const edges = graph.get(row.serviceId) ?? [];
    edges.push(row.dependsOnServiceId);
    graph.set(row.serviceId, edges);
  }
  return graph;
}

/** Whether `to` is reachable from `from` by following dependency edges. */
export function canReach(
  graph: DependencyGraph,
  from: string,
  to: string,
): boolean {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === to) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of graph.get(current) ?? []) stack.push(next);
  }
  return false;
}

/**
 * The subset of `dependsOnServiceIds` that would create a cycle if added as
 * `serviceId`'s outgoing dependency edges: a target that can already
 * (transitively) reach `serviceId` would close a loop back to it. `graph`
 * must have been loaded with `excludeServiceId: serviceId` so it reflects
 * the edges *other* services declare, not the ones being replaced.
 */
export function findCyclicDependencies(
  graph: DependencyGraph,
  serviceId: string,
  dependsOnServiceIds: string[],
): string[] {
  return dependsOnServiceIds.filter((targetId) =>
    canReach(graph, targetId, serviceId),
  );
}
