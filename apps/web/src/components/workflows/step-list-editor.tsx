"use client";

export interface WorkflowStepDraft {
  /** Client-only React key; never sent to the API. */
  key: string;
  /**
   * step_order is intentionally non-unique in this schema (ties and gaps
   * are valid, documented input, not legacy noise), so it's preserved as
   * loaded rather than re-derived from array position on every save. Only
   * `moveStep` (swapping it between the two moved slots) and `addStep`
   * (making room for a step inserted part-way down) change it.
   */
  stepOrder: number;
  kind: "condition" | "action";
  type: string;
  /**
   * Raw JSON text for the step's `config` object, edited as-is rather than
   * through a fixed set of fields: `config`'s shape varies by `type` (a
   * condition might need `field`/`days`, an action might need
   * `channel`/`message`), and a UI that only understood one shape would
   * silently drop whatever else was already there on every save.
   */
  configText: string;
}

export const TYPE_SUGGESTIONS: Record<"condition" | "action", string[]> = {
  condition: [
    "field_equals",
    "field_not_equals",
    "status_is",
    "entity_type_is",
  ],
  action: ["notify", "assign_owner", "create_task", "update_field"],
};

export function updateStep(
  steps: WorkflowStepDraft[],
  index: number,
  patch: Partial<WorkflowStepDraft>,
): WorkflowStepDraft[] {
  return steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
}

export function removeStep(
  steps: WorkflowStepDraft[],
  index: number,
): WorkflowStepDraft[] {
  return steps.filter((_, i) => i !== index);
}

export function moveStep(
  steps: WorkflowStepDraft[],
  index: number,
  direction: -1 | 1,
): WorkflowStepDraft[] {
  const target = index + direction;
  if (target < 0 || target >= steps.length) return steps;
  const a = steps[index]!;
  const b = steps[target]!;
  // Swaps content between the two positions while each position keeps its
  // own stepOrder: this is the one edit allowed to change stepOrder, and
  // only for the two steps actually being moved, not a renumbering of the
  // whole list. For two tied steps (equal stepOrder), this still moves
  // them locally but is a no-op on save, since there's no order between
  // ties to persist in the first place.
  const next = [...steps];
  next[index] = { ...b, stepOrder: a.stepOrder, key: a.key };
  next[target] = { ...a, stepOrder: b.stepOrder, key: b.key };
  return next;
}

/**
 * Adds a step, at the end or part-way down the list.
 *
 * The saved order is the numeric `stepOrder`, not the array position, so an
 * inserted step needs an order that sorts it where it was dropped. It takes
 * the slot right after the step above it (or the first slot, at the top),
 * and the steps below it are all shifted by the same amount, so their gaps
 * and ties stay exactly as they were.
 */
export function addStep(
  steps: WorkflowStepDraft[],
  kind: "condition" | "action",
  atIndex?: number,
): WorkflowStepDraft[] {
  const blank = { kind, type: "", configText: "{}" } as const;

  if (atIndex === undefined || atIndex >= steps.length) {
    const maxOrder = steps.reduce(
      (max, step) => Math.max(max, step.stepOrder),
      -1,
    );
    return [
      ...steps,
      { key: crypto.randomUUID(), stepOrder: maxOrder + 1, ...blank },
    ];
  }

  const index = Math.max(0, atIndex);
  const below = steps[index]!;
  const stepOrder =
    index === 0 ? below.stepOrder : steps[index - 1]!.stepOrder + 1;
  // How far the steps below must move to sort after the new one.
  const shift = Math.max(0, stepOrder + 1 - below.stepOrder);

  return [
    ...steps.slice(0, index),
    { key: crypto.randomUUID(), stepOrder, ...blank },
    ...steps
      .slice(index)
      .map((step) => ({ ...step, stepOrder: step.stepOrder + shift })),
  ];
}
