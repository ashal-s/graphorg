import {
  canReach,
  findCyclicDependencies,
  type DependencyGraph,
} from "@/lib/api/service-dependency-graph";

/**
 * Pure-function tests for the cycle-detection logic the services PATCH route
 * uses to reject a `dependsOnServiceIds` update that would create a loop
 * (WEB-132's "service-layer rules that prevent ... circular relationships").
 * No database: `loadDependencyGraph`'s query is exercised manually against a
 * live Postgres instance, same boundary as tests/unit/db/schema.test.ts.
 */
describe("canReach", () => {
  it("finds a direct edge", () => {
    const graph: DependencyGraph = new Map([["a", ["b"]]]);
    expect(canReach(graph, "a", "b")).toBe(true);
  });

  it("finds a transitive path", () => {
    const graph: DependencyGraph = new Map([
      ["a", ["b"]],
      ["b", ["c"]],
    ]);
    expect(canReach(graph, "a", "c")).toBe(true);
  });

  it("returns false when there is no path", () => {
    const graph: DependencyGraph = new Map([["a", ["b"]]]);
    expect(canReach(graph, "a", "z")).toBe(false);
  });

  it("does not loop forever on a cycle already present in the graph", () => {
    const graph: DependencyGraph = new Map([
      ["a", ["b"]],
      ["b", ["a"]],
    ]);
    expect(canReach(graph, "a", "z")).toBe(false);
  });
});

describe("findCyclicDependencies", () => {
  it("flags a target that already depends on the service, directly", () => {
    // b already depends on a; making a depend on b would close a loop.
    const graph: DependencyGraph = new Map([["b", ["a"]]]);
    expect(findCyclicDependencies(graph, "a", ["b"])).toEqual(["b"]);
  });

  it("flags a target that already depends on the service, transitively", () => {
    // c -> b -> a: c transitively depends on a already.
    const graph: DependencyGraph = new Map([
      ["c", ["b"]],
      ["b", ["a"]],
    ]);
    expect(findCyclicDependencies(graph, "a", ["c"])).toEqual(["c"]);
  });

  it("allows a target with no path back to the service", () => {
    const graph: DependencyGraph = new Map([["x", ["y"]]]);
    expect(findCyclicDependencies(graph, "a", ["x"])).toEqual([]);
  });

  it("allows depending on multiple unrelated services", () => {
    const graph: DependencyGraph = new Map();
    expect(findCyclicDependencies(graph, "a", ["b", "c", "d"])).toEqual([]);
  });
});
