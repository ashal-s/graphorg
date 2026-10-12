export interface DepartmentBase {
  id: string;
  name: string;
  parentId: string | null;
}

export type DepartmentNode<T extends DepartmentBase> = T & {
  children: DepartmentNode<T>[];
};

/**
 * Turns the flat department list into a forest by `parentId`. A department
 * with no parent, or whose parent isn't in the list, is a top-level one.
 * Siblings are sorted by name. Defensive against cycles (the API prevents
 * them): a department only reachable through a cycle is promoted to the top.
 */
export function buildDepartmentTree<T extends DepartmentBase>(
  departments: T[],
): DepartmentNode<T>[] {
  const byId = new Map<string, DepartmentNode<T>>(
    departments.map((department) => [
      department.id,
      { ...department, children: [] },
    ]),
  );

  const roots: DepartmentNode<T>[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }

  const reachable = new Set<string>();
  const visit = (node: DepartmentNode<T>) => {
    if (reachable.has(node.id)) return;
    reachable.add(node.id);
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  for (const node of byId.values()) {
    if (reachable.has(node.id)) continue;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) {
      parent.children = parent.children.filter((child) => child.id !== node.id);
    }
    roots.push(node);
    visit(node);
  }

  const sortTree = (nodes: DepartmentNode<T>[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((node) => sortTree(node.children));
  };
  sortTree(roots);
  return roots;
}

/** The tree in reading order (each department before its sub-departments), with depth. */
export function flattenDepartmentTree<T extends DepartmentBase>(
  roots: DepartmentNode<T>[],
): Array<{ node: DepartmentNode<T>; depth: number }> {
  const out: Array<{ node: DepartmentNode<T>; depth: number }> = [];
  const walk = (nodes: DepartmentNode<T>[], depth: number) => {
    for (const node of nodes) {
      out.push({ node, depth });
      walk(node.children, depth + 1);
    }
  };
  walk(roots, 0);
  return out;
}

/** Ids of a department and everything beneath it. */
export function departmentSubtreeIds<T extends DepartmentBase>(
  departments: T[],
  rootId: string,
): Set<string> {
  const ids = new Set<string>([rootId]);
  for (let grew = true; grew;) {
    grew = false;
    for (const department of departments) {
      if (
        department.parentId &&
        ids.has(department.parentId) &&
        !ids.has(department.id)
      ) {
        ids.add(department.id);
        grew = true;
      }
    }
  }
  return ids;
}
