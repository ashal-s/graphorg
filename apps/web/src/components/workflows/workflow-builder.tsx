"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Filter,
  GitBranch,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Users,
  Zap,
  ArrowDown,
  ArrowUp,
  Trash2,
  Clock,
  Hand,
  Pencil,
  Sparkles,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AiChatButton } from "@/components/shared/ai-chat-button";
import { CopyContextButton } from "@/components/shared/copy-context-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PeoplePicker,
  type WorkflowPersonOption,
} from "@/components/workflows/people-picker";
import {
  TYPE_SUGGESTIONS,
  addStep,
  moveStep,
  removeStep,
  updateStep,
  type WorkflowStepDraft,
} from "@/components/workflows/step-list-editor";
import { messageFromApiError } from "@/lib/api/client-error";
import { cn } from "@/lib/utils";
import {
  WORKFLOW_STATUS_OPTIONS,
  WORKFLOW_TRIGGER_LABELS,
  type WorkflowStatus,
  type WorkflowTriggerType,
} from "@/lib/workflows/labels";

type Selection =
  | { kind: "trigger" }
  | { kind: "step"; index: number }
  | { kind: "people" }
  | { kind: "details" }
  | { kind: "insert"; after: "trigger" | number };

export interface WorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  status: WorkflowStatus;
  steps: {
    id: string;
    stepOrder: number;
    kind: "condition" | "action";
    type: string;
    config: Record<string, unknown>;
  }[];
  people: {
    role: "owner" | "creator" | "worker";
    person: WorkflowPersonOption;
  }[];
}

const TRIGGER_OPTIONS: {
  value: WorkflowTriggerType;
  label: string;
  description: string;
  category: string;
  icon: typeof Hand;
}[] = [
  {
    value: "manual",
    label: WORKFLOW_TRIGGER_LABELS.manual,
    description: "Someone starts this process by hand when they need it.",
    category: "Process",
    icon: Hand,
  },
  {
    value: "scheduled",
    label: WORKFLOW_TRIGGER_LABELS.scheduled,
    description: "Documented to run on a cron schedule (not executed yet).",
    category: "Process",
    icon: Clock,
  },
  {
    value: "entity_created",
    label: WORKFLOW_TRIGGER_LABELS.entity_created,
    description: "When a catalog entity is created.",
    category: "Catalog",
    icon: Sparkles,
  },
  {
    value: "entity_updated",
    label: WORKFLOW_TRIGGER_LABELS.entity_updated,
    description: "When a catalog entity is updated.",
    category: "Catalog",
    icon: Pencil,
  },
];

const ENTITY_TYPES = [
  { value: "service", label: "Service" },
  { value: "team", label: "Team" },
  { value: "person", label: "Person" },
  { value: "document", label: "Document" },
];

const STATUS_OPTIONS = WORKFLOW_STATUS_OPTIONS;

const TYPE_LABELS: Record<"condition" | "action", Record<string, string>> = {
  condition: {
    field_equals: "Field equals",
    field_not_equals: "Field does not equal",
    status_is: "Status is",
    entity_type_is: "Entity type is",
  },
  action: {
    notify: "Notify",
    assign_owner: "Assign owner",
    create_task: "Create task",
    update_field: "Update field",
  },
};

function stepTypeOptions(
  kind: "condition" | "action",
  currentType: string,
): { value: string; label: string }[] {
  const suggestions = TYPE_SUGGESTIONS[kind].map((value) => ({
    value,
    label: TYPE_LABELS[kind][value] ?? value,
  }));
  const trimmed = currentType.trim();
  if (
    trimmed.length > 0 &&
    !suggestions.some((option) => option.value === trimmed)
  ) {
    return [{ value: trimmed, label: trimmed }, ...suggestions];
  }
  return suggestions;
}

const STEP_KIND_OPTIONS: {
  kind: "condition" | "action";
  label: string;
  description: string;
}[] = [
  {
    kind: "condition",
    label: "Condition",
    description: "Only continue when a rule matches.",
  },
  {
    kind: "action",
    label: "Action",
    description: "What should happen when the flow reaches this step.",
  },
];

function stepsFromDetail(steps: WorkflowDetail["steps"]): WorkflowStepDraft[] {
  return [...steps]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((step) => ({
      key: step.id,
      // Preserved as-is unless the user explicitly reorders (moveStep
      // swaps this between two slots on a move): step_order is intentionally
      // non-unique and can be tied or non-contiguous (see src/db/README.md),
      // so re-deriving it from array position on every save would silently
      // renumber a deliberately tied or gapped sequence into 0..n-1.
      stepOrder: step.stepOrder,
      kind: step.kind,
      type: step.type,
      // Round-trips the step's full config, not just a field or two this UI
      // understands, so saving an unrelated change (renaming the workflow,
      // say) never silently drops structured data another tool (or the seed
      // script) put in config.
      configText: JSON.stringify(step.config ?? {}, null, 2),
    }));
}

function FlowNode({
  selected,
  onClick,
  icon,
  iconClassName,
  title,
  subtitle,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-[320px] items-start gap-3 rounded-lg border bg-card px-3.5 py-3 text-left shadow-sm transition-colors",
        selected
          ? "border-primary ring-1 ring-primary/30"
          : "border-border hover:border-foreground/25",
        disabled && "cursor-default opacity-80",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
          iconClassName ?? "bg-emerald-600 text-white",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function FlowConnector({
  onAdd,
  disabled,
}: {
  onAdd?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative flex h-10 w-[320px] flex-col items-center">
      <div className="h-full w-px bg-border" />
      {onAdd && !disabled ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add step"
          className="absolute top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function WorkflowBuilder({
  mode,
  workflow,
  people,
  readOnly = false,
  aiChatEnabled = true,
}: {
  mode: "create" | "edit";
  workflow?: WorkflowDetail;
  people: WorkflowPersonOption[];
  /** Viewers can see a workflow's detail page but can't write to it: the
   * write API routes require the editor role, so a viewer submitting this
   * form would always get a 403 anyway. Rendering the whole form disabled
   * (rather than blocking the page) still lets a viewer read every field. */
  readOnly?: boolean;
  /** LaunchDarkly `ai-chat-enabled`; defaults on without LD. */
  aiChatEnabled?: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState(workflow?.name ?? "");
  const [description, setDescription] = useState(workflow?.description ?? "");
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>(
    workflow?.triggerType ?? "manual",
  );
  const [triggerChosen, setTriggerChosen] = useState(mode === "edit");
  const [entityType, setEntityType] = useState(
    typeof workflow?.triggerConfig.entityType === "string"
      ? workflow.triggerConfig.entityType
      : "service",
  );
  const [cron, setCron] = useState(
    typeof workflow?.triggerConfig.cron === "string"
      ? workflow.triggerConfig.cron
      : "",
  );
  // The entityType/cron fields above are the only pieces of triggerConfig
  // this UI knows how to edit, but the column is deliberately freeform
  // jsonb: a workflow created via the API (or by another tool) can carry
  // other fields, like a schedule's timezone or an entity trigger's filter.
  // Kept fixed at the value loaded on mount and merged back in on submit,
  // so saving an unrelated edit never silently drops those extra fields.
  const [originalTriggerConfig] = useState(workflow?.triggerConfig ?? {});
  const [status, setStatus] = useState<WorkflowStatus>(
    workflow?.status ?? "draft",
  );
  const [steps, setSteps] = useState<WorkflowStepDraft[]>(
    stepsFromDetail(workflow?.steps ?? []),
  );
  const [ownerIds, setOwnerIds] = useState<string[]>(
    (workflow?.people ?? [])
      .filter((assignment) => assignment.role === "owner")
      .map((assignment) => assignment.person.id),
  );
  const [workerIds, setWorkerIds] = useState<string[]>(
    (workflow?.people ?? [])
      .filter((assignment) => assignment.role === "worker")
      .map((assignment) => assignment.person.id),
  );
  // The builder only exposes owner/worker pickers (creator isn't something
  // anyone reassigns), but people is a full-replacement list on save: if
  // creator assignments weren't carried through unchanged here, saving any
  // other edit would silently wipe out who created the workflow.
  const [creators] = useState(
    (workflow?.people ?? []).filter(
      (assignment) => assignment.role === "creator",
    ),
  );

  const [selection, setSelection] = useState<Selection>({ kind: "trigger" });
  const [triggerQuery, setTriggerQuery] = useState("");
  const [zoom, setZoom] = useState(100);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = !readOnly && name.trim().length > 0 && !saving && !deleting;

  async function persist(nextStatus: WorkflowStatus = status) {
    setError(null);

    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }
    if (steps.some((step) => step.type.trim().length === 0)) {
      setError("Every step needs a type.");
      return;
    }

    const parsedSteps: {
      stepOrder: number;
      kind: "condition" | "action";
      type: string;
      config: Record<string, unknown>;
    }[] = [];
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index]!;
      const text = step.configText.trim();
      let config: Record<string, unknown> = {};
      if (text.length > 0) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          setError(`Step ${index + 1}'s config must be valid JSON.`);
          return;
        }
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          setError(`Step ${index + 1}'s config must be a JSON object.`);
          return;
        }
        config = parsed as Record<string, unknown>;
      }
      parsedSteps.push({
        stepOrder: step.stepOrder,
        kind: step.kind,
        type: step.type.trim(),
        config,
      });
    }

    const triggerConfigOverlay: Record<string, unknown> =
      triggerType === "entity_created" || triggerType === "entity_updated"
        ? { entityType }
        : triggerType === "scheduled"
          ? { cron: cron.trim() }
          : {};
    const triggerConfig = { ...originalTriggerConfig, ...triggerConfigOverlay };

    const payload = {
      name: name.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      triggerType,
      triggerConfig,
      status: nextStatus,
      steps: parsedSteps,
      people: [
        ...creators.map((assignment) => ({
          personId: assignment.person.id,
          role: "creator" as const,
        })),
        ...ownerIds.map((personId) => ({ personId, role: "owner" as const })),
        ...workerIds.map((personId) => ({
          personId,
          role: "worker" as const,
        })),
      ],
    };

    setSaving(true);
    const response = await fetch(
      mode === "create" ? "/api/workflows" : `/api/workflows/${workflow?.id}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(messageFromApiError(body));
      setSaving(false);
      return;
    }

    const body = (await response.json()) as { workflow: WorkflowDetail };
    setStatus(nextStatus);
    router.push(`/workflows/${body.workflow.id}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!workflow) return;
    if (!window.confirm(`Delete "${workflow.name}"? This can't be undone.`)) {
      return;
    }

    setDeleting(true);
    const response = await fetch(`/api/workflows/${workflow.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Failed to delete this workflow. Please try again.");
      setDeleting(false);
      return;
    }

    router.push("/workflows");
    router.refresh();
  }

  function handleAddStep(kind: "condition" | "action") {
    const insertAt =
      selection.kind === "insert"
        ? selection.after === "trigger"
          ? 0
          : selection.after + 1
        : undefined;
    const next = addStep(steps, kind, insertAt);
    setSteps(next);
    const newIndex =
      insertAt === undefined
        ? next.length - 1
        : Math.min(insertAt, next.length - 1);
    setSelection({ kind: "step", index: newIndex });
  }

  const filteredTriggers = TRIGGER_OPTIONS.filter((option) => {
    const q = triggerQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      option.label.toLowerCase().includes(q) ||
      option.description.toLowerCase().includes(q) ||
      option.category.toLowerCase().includes(q)
    );
  });

  const triggersByCategory = filteredTriggers.reduce<
    Record<string, typeof TRIGGER_OPTIONS>
  >((acc, option) => {
    (acc[option.category] ??= []).push(option);
    return acc;
  }, {});

  const selectedStep =
    selection.kind === "step" ? steps[selection.index] : undefined;

  const peopleSummary =
    ownerIds.length + workerIds.length === 0
      ? "Who's accountable and who carries this out."
      : `${ownerIds.length} owner${ownerIds.length === 1 ? "" : "s"}, ${workerIds.length} worker${workerIds.length === 1 ? "" : "s"}`;

  const panelTitle =
    selection.kind === "trigger"
      ? triggerChosen
        ? "Trigger"
        : "Add a trigger"
      : selection.kind === "insert"
        ? "Add a component"
        : selection.kind === "step"
          ? selectedStep?.kind === "condition"
            ? "Condition"
            : "Action"
          : selection.kind === "people"
            ? "People"
            : "Details";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        // The primary button is "Save and enable", so it always enables:
        // an archived workflow comes back as active, matching its label.
        void persist("active");
      }}
      className="-m-4 flex h-[calc(100svh-3.5rem)] flex-col overflow-hidden bg-background text-foreground md:-m-6"
    >
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href="/workflows" />}
            aria-label="Back to workflows"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Zap className="size-3.5" aria-hidden="true" />
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Untitled flow"
            disabled={readOnly}
            aria-label="Workflow name"
            className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-70"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {mode === "edit" && workflow?.id && (
            <>
              <AiChatButton
                scope={{ kind: "workflow", id: workflow.id }}
                enabled={aiChatEnabled}
              />
              <CopyContextButton
                scope={{ kind: "workflow", id: workflow.id }}
              />
            </>
          )}
          {!readOnly && (
            <Button type="submit" disabled={!canSave} className="h-8 px-3">
              {saving ? "Saving…" : "Save and enable"}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="More actions"
                />
              }
            >
              <MoreHorizontal aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setSelection({ kind: "details" })}
              >
                Edit details
              </DropdownMenuItem>
              {!readOnly && (
                <DropdownMenuItem
                  disabled={saving || deleting || name.trim().length === 0}
                  onClick={() => void persist("draft")}
                >
                  Save as draft
                </DropdownMenuItem>
              )}
              {!readOnly && status === "archived" && (
                <DropdownMenuItem
                  disabled={saving || deleting || name.trim().length === 0}
                  onClick={() => void persist("archived")}
                >
                  Save and keep archived
                </DropdownMenuItem>
              )}
              {mode === "edit" && !readOnly && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={saving || deleting}
                    onClick={() => void handleDelete()}
                  >
                    {deleting ? "Deleting…" : "Delete workflow"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {(readOnly || error) && (
        <div className="shrink-0 space-y-2 border-b border-border px-4 py-2">
          {readOnly && (
            <Alert>
              <AlertTitle>View-only</AlertTitle>
              <AlertDescription>
                You have viewer access, so this workflow can be viewed but not
                changed.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t save</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Canvas */}
        <div className="relative min-w-0 flex-1 overflow-auto bg-background">
          <div
            className="absolute inset-0 bg-background bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-size-[20px_20px]"
            aria-hidden="true"
          />
          <div
            className="relative flex min-h-full origin-top-left flex-col items-start px-10 py-8 pb-20 transition-transform"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <FlowNode
              selected={selection.kind === "trigger"}
              onClick={() => setSelection({ kind: "trigger" })}
              icon={
                <Play className="size-3.5 fill-current" aria-hidden="true" />
              }
              iconClassName="bg-emerald-600 text-white"
              title={
                triggerChosen
                  ? WORKFLOW_TRIGGER_LABELS[triggerType]
                  : "Add a trigger"
              }
              subtitle={
                triggerChosen
                  ? triggerType === "scheduled" && cron
                    ? `Cron: ${cron}`
                    : triggerType === "entity_created" ||
                        triggerType === "entity_updated"
                      ? `Entity type: ${entityType}`
                      : "An event that triggers the flow to run."
                  : "An event that triggers the flow to run."
              }
            />

            <FlowConnector
              onAdd={
                readOnly
                  ? undefined
                  : () => setSelection({ kind: "insert", after: "trigger" })
              }
              disabled={readOnly}
            />

            {steps.map((step, index) => (
              <div key={step.key} className="flex flex-col items-start">
                <FlowNode
                  selected={
                    selection.kind === "step" && selection.index === index
                  }
                  onClick={() => setSelection({ kind: "step", index })}
                  icon={
                    step.kind === "condition" ? (
                      <Filter className="size-3.5" aria-hidden="true" />
                    ) : (
                      <GitBranch className="size-3.5" aria-hidden="true" />
                    )
                  }
                  iconClassName={
                    step.kind === "condition"
                      ? "bg-amber-600 text-white"
                      : "bg-sky-600 text-white"
                  }
                  title={
                    step.type.trim().length > 0
                      ? (TYPE_LABELS[step.kind][step.type] ?? step.type)
                      : step.kind === "condition"
                        ? "Add a condition"
                        : "Add an action"
                  }
                  subtitle={
                    step.kind === "condition"
                      ? "Only continue when this rule matches."
                      : "Do something when the flow reaches this step."
                  }
                />
                <FlowConnector
                  onAdd={
                    readOnly
                      ? undefined
                      : () => setSelection({ kind: "insert", after: index })
                  }
                  disabled={readOnly}
                />
              </div>
            ))}

            <FlowNode
              selected={selection.kind === "people"}
              onClick={() => setSelection({ kind: "people" })}
              icon={<Users className="size-3.5" aria-hidden="true" />}
              iconClassName="bg-violet-600 text-white"
              title="People"
              subtitle={peopleSummary}
            />
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs text-muted-foreground shadow-overlay">
            <button
              type="button"
              aria-label="Zoom out"
              className="flex size-6 items-center justify-center rounded-full hover:bg-muted"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
            >
              −
            </button>
            <span className="min-w-10 text-center tabular-nums">{zoom}%</span>
            <button
              type="button"
              aria-label="Zoom in"
              className="flex size-6 items-center justify-center rounded-full hover:bg-muted"
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
            >
              +
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="flex w-90 shrink-0 flex-col border-l border-border bg-background">
          <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
            <h2 className="text-sm font-semibold text-foreground">
              {panelTitle}
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {selection.kind === "trigger" && !triggerChosen && (
              <div className="flex flex-col gap-3 p-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={triggerQuery}
                    onChange={(event) => setTriggerQuery(event.target.value)}
                    placeholder="Search triggers"
                    disabled={readOnly}
                    className="h-9 pl-8"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  {Object.entries(triggersByCategory).map(
                    ([category, options]) => (
                      <div key={category}>
                        <div className="mb-1.5 flex items-center gap-2 px-1">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                            {category}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {options.length}
                          </span>
                        </div>
                        <ul className="flex flex-col">
                          {options.map((option) => {
                            const Icon = option.icon;
                            return (
                              <li key={option.value}>
                                <button
                                  type="button"
                                  disabled={readOnly}
                                  onClick={() => {
                                    setTriggerType(option.value);
                                    setTriggerChosen(true);
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-muted disabled:opacity-60"
                                >
                                  <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-primary">
                                    <Icon
                                      className="size-3.5"
                                      aria-hidden="true"
                                    />
                                  </span>
                                  {option.label}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {selection.kind === "trigger" && triggerChosen && (
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground">Trigger</Label>
                  <Select
                    value={triggerType}
                    onValueChange={(value) => {
                      if (value) setTriggerType(value as WorkflowTriggerType);
                    }}
                    disabled={readOnly}
                    items={Object.entries(WORKFLOW_TRIGGER_LABELS).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  >
                    <SelectTrigger
                      id="workflow-trigger"
                      className="w-full"
                      aria-label="Trigger"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WORKFLOW_TRIGGER_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {(triggerType === "entity_created" ||
                  triggerType === "entity_updated") && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-muted-foreground">Entity type</Label>
                    <Select
                      value={entityType}
                      onValueChange={(value) => {
                        if (value) setEntityType(value);
                      }}
                      disabled={readOnly}
                      items={ENTITY_TYPES}
                    >
                      <SelectTrigger
                        id="workflow-entity-type"
                        className="w-full"
                        aria-label="Entity type"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map((entity) => (
                          <SelectItem key={entity.value} value={entity.value}>
                            {entity.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {triggerType === "scheduled" && (
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="workflow-cron"
                      className="text-muted-foreground"
                    >
                      Schedule (cron expression)
                    </Label>
                    <Input
                      id="workflow-cron"
                      value={cron}
                      onChange={(event) => setCron(event.target.value)}
                      placeholder="0 9 * * 1"
                      disabled={readOnly}
                    />
                  </div>
                )}
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => {
                      setTriggerChosen(false);
                      setTriggerQuery("");
                    }}
                  >
                    Change trigger
                  </Button>
                )}
              </div>
            )}

            {selection.kind === "insert" && (
              <div className="flex flex-col p-2">
                {STEP_KIND_OPTIONS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleAddStep(option.kind)}
                    className="flex items-start gap-2.5 rounded-md px-2 py-2.5 text-left hover:bg-muted disabled:opacity-60"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded",
                        option.kind === "condition"
                          ? "bg-amber-600/20 text-amber-400"
                          : "bg-sky-600/20 text-sky-400",
                      )}
                    >
                      {option.kind === "condition" ? (
                        <Filter className="size-3.5" aria-hidden="true" />
                      ) : (
                        <GitBranch className="size-3.5" aria-hidden="true" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selection.kind === "step" && selectedStep && (
              <div className="flex flex-col gap-4 p-4">
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={selection.index === 0}
                      onClick={() => {
                        setSteps(moveStep(steps, selection.index, -1));
                        setSelection({
                          kind: "step",
                          index: selection.index - 1,
                        });
                      }}
                      aria-label="Move step up"
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={selection.index === steps.length - 1}
                      onClick={() => {
                        setSteps(moveStep(steps, selection.index, 1));
                        setSelection({
                          kind: "step",
                          index: selection.index + 1,
                        });
                      }}
                      aria-label="Move step down"
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setSteps(removeStep(steps, selection.index));
                        setSelection({ kind: "trigger" });
                      }}
                      aria-label="Remove step"
                      className="ml-auto text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground">Type</Label>
                  <Select
                    value={
                      selectedStep.type.trim().length > 0
                        ? selectedStep.type
                        : null
                    }
                    onValueChange={(value) => {
                      if (value) {
                        setSteps(
                          updateStep(steps, selection.index, { type: value }),
                        );
                      }
                    }}
                    disabled={readOnly}
                    items={stepTypeOptions(
                      selectedStep.kind,
                      selectedStep.type,
                    )}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label={`${selectedStep.kind} type`}
                    >
                      <SelectValue
                        placeholder={
                          selectedStep.kind === "condition"
                            ? "Choose a condition"
                            : "Choose an action"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {stepTypeOptions(
                        selectedStep.kind,
                        selectedStep.type,
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground">Config (JSON)</Label>
                  <Textarea
                    placeholder="{}"
                    value={selectedStep.configText}
                    onChange={(event) =>
                      setSteps(
                        updateStep(steps, selection.index, {
                          configText: event.target.value,
                        }),
                      )
                    }
                    disabled={readOnly}
                    className="min-h-28 font-mono text-xs"
                  />
                </div>
              </div>
            )}

            {selection.kind === "people" && (
              <div className="flex flex-col gap-5 p-4">
                {creators.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Created by{" "}
                    {creators
                      .map((assignment) => assignment.person.name)
                      .join(", ")}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground">Owner</Label>
                  <PeoplePicker
                    label="Owner"
                    people={people}
                    selectedIds={ownerIds}
                    onChange={setOwnerIds}
                    readOnly={readOnly}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground">Workers</Label>
                  <PeoplePicker
                    label="Workers"
                    people={people}
                    selectedIds={workerIds}
                    onChange={setWorkerIds}
                    readOnly={readOnly}
                  />
                </div>
              </div>
            )}

            {selection.kind === "details" && (
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="workflow-description"
                    className="text-muted-foreground"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="workflow-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What is this workflow for?"
                    disabled={readOnly}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      if (value) setStatus(value as WorkflowStatus);
                    }}
                    disabled={readOnly}
                    items={STATUS_OPTIONS}
                  >
                    <SelectTrigger
                      id="workflow-status"
                      className="w-full max-w-48"
                      aria-label="Status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </form>
  );
}
