export interface OrgChartPerson {
  id: string;
  name: string;
  title: string | null;
  photoUrl?: string | null;
  managerId: string | null;
  /** Not shown on the chart; kept optional for callers that have it. */
  teamName?: string | null;
}

export interface OrgChartNode extends OrgChartPerson {
  reports: OrgChartNode[];
}

/**
 * Turns the flat people list into a forest by `managerId`. Anyone with no
 * manager, or whose manager isn't in the list, becomes a root. Siblings are
 * sorted by name. Defensive against cycles (the API prevents them, but a
 * chart should never loop forever): anyone only reachable through a cycle
 * is promoted to a root.
 */
export function buildOrgChart(people: OrgChartPerson[]): OrgChartNode[] {
  const byId = new Map<string, OrgChartNode>(
    people.map((person) => [person.id, { ...person, reports: [] }]),
  );

  const roots: OrgChartNode[] = [];
  for (const node of byId.values()) {
    const manager = node.managerId ? byId.get(node.managerId) : undefined;
    if (manager && manager.id !== node.id) manager.reports.push(node);
    else roots.push(node);
  }

  // Anyone not reachable from a root sits in a cycle; surface one per cycle.
  const reachable = new Set<string>();
  const visit = (node: OrgChartNode) => {
    if (reachable.has(node.id)) return;
    reachable.add(node.id);
    node.reports.forEach(visit);
  };
  roots.forEach(visit);
  for (const node of byId.values()) {
    if (reachable.has(node.id)) continue;
    // Break the cycle at this node so it renders as a root.
    const manager = node.managerId ? byId.get(node.managerId) : undefined;
    if (manager) {
      manager.reports = manager.reports.filter((child) => child.id !== node.id);
    }
    roots.push(node);
    visit(node);
  }

  const sortTree = (nodes: OrgChartNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((node) => sortTree(node.reports));
  };
  sortTree(roots);
  return roots;
}

export function countOrgChart(roots: OrgChartNode[]): number {
  return roots.reduce((sum, node) => sum + 1 + countOrgChart(node.reports), 0);
}

/**
 * The tree as a flat list ranked by seniority: everyone at the top level
 * first, then everyone one level down, and so on. Within a level, people
 * stay grouped under their manager in the tree's alphabetical order.
 */
export function flattenOrgChart(
  roots: OrgChartNode[],
): Array<{ node: OrgChartNode; depth: number }> {
  const levels: OrgChartNode[][] = [];
  let level = roots;
  while (level.length > 0) {
    levels.push(level);
    level = level.flatMap((node) => node.reports);
  }
  return levels.flatMap((nodes, depth) =>
    nodes.map((node) => ({ node, depth })),
  );
}
