"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface WorkflowStepDraft {
  /** Client-only React key; never sent to the API. */
  key: string;
  kind: "condition" | "action";
  type: string;
  details: string;
}

const TYPE_SUGGESTIONS: Record<"condition" | "action", string[]> = {
  condition: [
    "field_equals",
    "field_not_equals",
    "status_is",
    "entity_type_is",
  ],
  action: ["notify", "assign_owner", "create_task", "update_field"],
};

/**
 * The ordered condition/action chain, editable entirely through the UI:
 * add, edit, remove, and reorder (up/down, not drag-and-drop, to avoid a new
 * dependency for what's a short, keyboard-accessible list).
 */
export function StepListEditor({
  steps,
  onChange,
}: {
  steps: WorkflowStepDraft[];
  onChange: (steps: WorkflowStepDraft[]) => void;
}) {
  function update(index: number, patch: Partial<WorkflowStepDraft>) {
    onChange(
      steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  function remove(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    onChange(next);
  }

  function add(kind: "condition" | "action") {
    onChange([
      ...steps,
      { key: crypto.randomUUID(), kind, type: "", details: "" },
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      {steps.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No steps yet. Add a condition to gate the workflow, or an action for
          it to take.
        </p>
      )}
      <ol className="flex flex-col gap-2">
        {steps.map((step, index) => (
          <li key={step.key}>
            <Card size="sm">
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={step.kind === "condition" ? "outline" : "secondary"}
                  >
                    {index + 1}.{" "}
                    {step.kind === "condition" ? "Condition" : "Action"}
                  </Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label="Move step up"
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === steps.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label="Move step down"
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      aria-label="Remove step"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                  <Input
                    list={`${step.kind}-type-suggestions`}
                    placeholder={
                      step.kind === "condition"
                        ? "e.g. field_equals"
                        : "e.g. notify"
                    }
                    value={step.type}
                    onChange={(event) =>
                      update(index, { type: event.target.value })
                    }
                    aria-label={`Step ${index + 1} type`}
                  />
                  <Input
                    placeholder="Details (optional)"
                    value={step.details}
                    onChange={(event) =>
                      update(index, { details: event.target.value })
                    }
                    aria-label={`Step ${index + 1} details`}
                  />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
      <datalist id="condition-type-suggestions">
        {TYPE_SUGGESTIONS.condition.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="action-type-suggestions">
        {TYPE_SUGGESTIONS.action.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => add("condition")}
        >
          Add condition
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => add("action")}
        >
          Add action
        </Button>
      </div>
    </div>
  );
}
