import {
  buildDepartmentTree,
  departmentAncestorIds,
  departmentSubtreeIds,
  flattenDepartmentTree,
} from "@/lib/directory/departments";

const dept = (id: string, parentId: string | null = null) => ({
  id,
  name: id,
  parentId,
});

describe("buildDepartmentTree", () => {
  it("nests departments under their parent, sorted by name", () => {
    const roots = buildDepartmentTree([
      dept("engineering"),
      dept("sales"),
      dept("platform", "engineering"),
      dept("data", "engineering"),
    ]);

    expect(roots.map((r) => r.id)).toEqual(["engineering", "sales"]);
    expect(roots[0]!.children.map((c) => c.id)).toEqual(["data", "platform"]);
  });

  it("treats a department whose parent is missing as top-level", () => {
    const roots = buildDepartmentTree([dept("orphan", "gone")]);
    expect(roots.map((r) => r.id)).toEqual(["orphan"]);
  });

  it("surfaces departments that only sit in a cycle instead of dropping them", () => {
    const roots = buildDepartmentTree([dept("a", "b"), dept("b", "a")]);
    const all = flattenDepartmentTree(roots).map((e) => e.node.id);
    expect(all.sort()).toEqual(["a", "b"]);
  });
});

describe("flattenDepartmentTree", () => {
  it("lists each department before its children, with depth", () => {
    const roots = buildDepartmentTree([
      dept("a"),
      dept("a1", "a"),
      dept("a1x", "a1"),
      dept("b"),
    ]);
    expect(
      flattenDepartmentTree(roots).map((e) => [e.node.id, e.depth]),
    ).toEqual([
      ["a", 0],
      ["a1", 1],
      ["a1x", 2],
      ["b", 0],
    ]);
  });
});

describe("departmentSubtreeIds", () => {
  it("includes the department and all of its descendants", () => {
    const all = [dept("a"), dept("a1", "a"), dept("a1x", "a1"), dept("b")];
    expect([...departmentSubtreeIds(all, "a")].sort()).toEqual([
      "a",
      "a1",
      "a1x",
    ]);
  });
});

describe("departmentAncestorIds", () => {
  it("lists every department above, nearest first, and not itself", () => {
    const all = [dept("a"), dept("a1", "a"), dept("a1x", "a1"), dept("b")];
    expect([...departmentAncestorIds(all, "a1x")]).toEqual(["a1", "a"]);
    expect(departmentAncestorIds(all, "a").size).toBe(0);
  });

  it("stops on a cycle already in the data", () => {
    const all = [dept("a", "b"), dept("b", "a")];
    expect([...departmentAncestorIds(all, "a")]).toEqual(["b"]);
  });
});
