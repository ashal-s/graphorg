/**
 * @jest-environment node
 */
import {
  wouldCreateParentCycle,
  type ParentMap,
} from "@/lib/api/service-hierarchy";

// platform <- api <- worker, and an unrelated "billing".
const parents: ParentMap = new Map([
  ["api", "platform"],
  ["worker", "api"],
]);

describe("wouldCreateParentCycle", () => {
  it("allows a service under an unrelated service", () => {
    expect(wouldCreateParentCycle(parents, "billing", "platform")).toBe(false);
  });

  it("allows moving a service up to its grandparent", () => {
    expect(wouldCreateParentCycle(parents, "worker", "platform")).toBe(false);
  });

  it("rejects making a service its own parent", () => {
    expect(wouldCreateParentCycle(parents, "api", "api")).toBe(true);
  });

  it("rejects putting a service under its own child", () => {
    expect(wouldCreateParentCycle(parents, "platform", "api")).toBe(true);
  });

  it("rejects putting a service under a deeper descendant", () => {
    expect(wouldCreateParentCycle(parents, "platform", "worker")).toBe(true);
  });

  it("terminates when the data already contains a loop", () => {
    const looped: ParentMap = new Map([
      ["a", "b"],
      ["b", "a"],
    ]);
    expect(wouldCreateParentCycle(looped, "c", "a")).toBe(false);
  });
});
