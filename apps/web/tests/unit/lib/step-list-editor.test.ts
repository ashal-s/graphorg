/**
 * @jest-environment node
 */
import {
  addStep,
  moveStep,
  type WorkflowStepDraft,
} from "@/components/workflows/step-list-editor";

const step = (key: string, stepOrder: number): WorkflowStepDraft => ({
  key,
  stepOrder,
  kind: "action",
  type: key,
  configText: "{}",
});

/** What a save followed by a reload shows: steps sorted by `stepOrder`. */
function reloaded(steps: WorkflowStepDraft[]) {
  return [...steps]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((s) => s.type);
}

describe("addStep", () => {
  const list = [step("a", 0), step("b", 1), step("c", 2)];

  it("appends with the next order when no position is given", () => {
    const next = addStep(list, "action");
    expect(next).toHaveLength(4);
    expect(next[3]!.stepOrder).toBe(3);
    expect(reloaded(next).slice(0, 3)).toEqual(["a", "b", "c"]);
  });

  it("keeps an inserted step where it was dropped after saving", () => {
    const next = addStep(list, "condition", 1);
    next[1] = { ...next[1]!, type: "NEW" };

    // Displayed order is a, NEW, b, c ...
    expect(next.map((s) => s.type)).toEqual(["a", "NEW", "b", "c"]);
    // ...and sorting by the saved order gives the same sequence.
    expect(reloaded(next)).toEqual(["a", "NEW", "b", "c"]);
  });

  it("can insert at the very top", () => {
    const next = addStep(list, "condition", 0);
    next[0] = { ...next[0]!, type: "NEW" };
    expect(reloaded(next)).toEqual(["NEW", "a", "b", "c"]);
  });

  it("makes room when the steps below sit right up against it", () => {
    const tight = [step("a", 5), step("b", 6)];
    const next = addStep(tight, "action", 1);
    next[1] = { ...next[1]!, type: "NEW" };
    expect(reloaded(next)).toEqual(["a", "NEW", "b"]);
  });

  it("uses an existing gap without disturbing later steps", () => {
    const gappy = [step("a", 0), step("b", 10), step("c", 20)];
    const next = addStep(gappy, "action", 1);
    next[1] = { ...next[1]!, type: "NEW" };
    expect(reloaded(next)).toEqual(["a", "NEW", "b", "c"]);
    // The later steps weren't renumbered: gaps are valid input.
    expect(next.find((s) => s.type === "b")!.stepOrder).toBe(10);
    expect(next.find((s) => s.type === "c")!.stepOrder).toBe(20);
  });

  it("keeps ties among the steps below together", () => {
    const tied = [step("a", 0), step("b", 1), step("c", 1), step("d", 2)];
    const next = addStep(tied, "action", 1);
    next[1] = { ...next[1]!, type: "NEW" };

    const b = next.find((s) => s.type === "b")!.stepOrder;
    const c = next.find((s) => s.type === "c")!.stepOrder;
    expect(b).toBe(c);
    expect(reloaded(next)[0]).toBe("a");
    expect(reloaded(next)[1]).toBe("NEW");
    expect(next.find((s) => s.type === "d")!.stepOrder).toBeGreaterThan(b);
  });

  it("inserts after a tie without jumping ahead of the tied steps", () => {
    const tied = [step("a", 3), step("b", 3), step("c", 4)];
    const next = addStep(tied, "action", 2);
    next[2] = { ...next[2]!, type: "NEW" };
    const order = (type: string) =>
      next.find((s) => s.type === type)!.stepOrder;

    expect(order("NEW")).toBeGreaterThan(order("a"));
    expect(order("NEW")).toBeGreaterThan(order("b"));
    expect(order("c")).toBeGreaterThan(order("NEW"));
  });

  it("works on an empty list and treats a too-large index as an append", () => {
    expect(addStep([], "action")).toHaveLength(1);
    expect(addStep([], "action")[0]!.stepOrder).toBe(0);
    const next = addStep(list, "action", 99);
    expect(next[3]!.stepOrder).toBe(3);
  });

  it("still composes with moveStep", () => {
    const next = addStep(list, "action", 1);
    next[1] = { ...next[1]!, type: "NEW" };
    const moved = moveStep(next, 1, 1);
    expect(reloaded(moved)).toEqual(["a", "b", "NEW", "c"]);
  });
});
