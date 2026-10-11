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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import { cn } from "@/lib/utils";

type TriggerType = "manual" | "entity_created" | "entity_updated" | "scheduled";
type WorkflowStatus = "draft" | "active" | "archived";

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
  triggerType: TriggerType;
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
  value: TriggerType;
  label: string;
  description: string;
  category: string;
  icon: typeof Hand;
}[] = [
  {
    value: "manual",
    label: "Run manually",
    description: "Start this workflow yourself when you need it.",
    category: "Automation",
    icon: Hand,
  },
  {
    value: "scheduled",
    label: "Scheduled",
    description: "Run on a cron schedule.",
    category: "Automation",
    icon: Clock,
  },
  {
    value: "entity_created",
    label: "Entity created",
    description: "When a catalog entity is created.",
    category: "Catalog",
    icon: Sparkles,
  },
  {
    value: "entity_updated",
    label: "Entity updated",
    description: "When a catalog entity is updated.",
    category: "Catalog",
    icon: Pencil,
  },
];

const TRIGGER_LABELS: Record<TriggerType, string> = {
  manual: "Run manually",
  entity_created: "When an entity is created",
  entity_updated: "When an entity is updated",
  scheduled: "On a schedule",
};

const ENTITY_TYPES = [
  { value: "system", label: "System" },
  { value: "service", label: "Service" },
  { value: "repository", label: "Repository" },
  { value: "team", label: "Team" },
  { value: "person", label: "Person" },
  { value: "document", label: "Document" },
];

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
    description: "Do something when the flow reaches this step.",
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
        "flex w-[320px] items-start gap-3 rounded-lg border bg-[#2c2c2c] px-3.5 py-3 text-left shadow-sm transition-colors",
        selected
          ? "border-[#579dff]"
          : "border-[#444] hover:border-[#6b6b6b]",
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
        <span className="block text-sm font-semibold text-[#f4f5f7]">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-[#9fadbc]">
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
      <div className="h-full w-px bg-[#5e6c84]" />
      {onAdd && !disabled ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add step"
          className="absolute top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#5e6c84] bg-[#1d1d1d] text-[#c7d1db] transition-colors hover:border-[#579dff] hover:text-[#579dff]"
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
}: {
  mode: "create" | "edit";
  workflow?: WorkflowDetail;
  people: WorkflowPersonOption[];
  /** Viewers can see a workflow's detail page but can't write to it: the
   * write API routes require the editor role, so a viewer submitting this
   * form would always get a 403 anyway. Rendering the whole form disabled
   * (rather than blocking the page) still lets a viewer read every field. */
  readOnly?: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState(workflow?.name ?? "");
  const [description, setDescription] = useState(workflow?.description ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    workflow?.triggerType ?? "manual",
  );
  const [triggerChosen, setTriggerChosen] = useState(mode === "edit");
  const [entityType, setEntityType] = useState(
    typeof workflow?.triggerConfig.entityType === "string"
      ? workflow.triggerConfig.entityType
      : "system",
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
      setError(
        typeof body?.error === "string"
          ? body.error
          : "Something went wrong. Please try again.",
      );
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
      insertAt === undefined ? next.length - 1 : Math.min(insertAt, next.length - 1);
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
        void persist(status === "archived" ? "archived" : "active");
      }}
      className="-m-4 flex h-[calc(100svh-3.5rem)] flex-col overflow-hidden bg-[#1d1d1d] text-[#f4f5f7] md:-m-6"
    >
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#2c333a] bg-[#1d1d1d] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href="/workflows" />}
            className="text-[#c7d1db] hover:bg-[#2c2c2c] hover:text-white"
            aria-label="Back to workflows"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <span className="flex size-7 items-center justify-center rounded-md bg-[#579dff]/20 text-[#579dff]">
            <Zap className="size-3.5" aria-hidden="true" />
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Untitled flow"
            disabled={readOnly}
            aria-label="Workflow name"
            className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium text-[#f4f5f7] outline-none placeholder:text-[#738496] disabled:opacity-70"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!readOnly && (
            <Button
              type="submit"
              disabled={!canSave}
              className="h-8 bg-[#579dff] px-3 text-sm font-medium text-[#1d1d1d] hover:bg-[#85b8ff] disabled:bg-[#2c333a] disabled:text-[#738496]"
            >
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
                  className="text-[#c7d1db] hover:bg-[#2c2c2c] hover:text-white"
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
        <div className="shrink-0 space-y-2 border-b border-[#2c333a] px-4 py-2">
          {readOnly && (
            <Alert className="border-[#2c333a] bg-[#22272b] text-[#f4f5f7]">
              <AlertTitle>View-only</AlertTitle>
              <AlertDescription className="text-[#9fadbc]">
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
        <div className="relative min-w-0 flex-1 overflow-auto">
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "#1d1d1d",
              backgroundImage:
                "radial-gradient(circle, #3d3d3d 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
            aria-hidden="true"
          />
          <div
            className="relative flex min-h-full origin-top-left flex-col items-start px-10 py-8 pb-20 transition-transform"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <FlowNode
              selected={selection.kind === "trigger"}
              onClick={() => setSelection({ kind: "trigger" })}
              icon={<Play className="size-3.5 fill-current" aria-hidden="true" />}
              iconClassName="bg-emerald-600 text-white"
              title={
                triggerChosen
                  ? TRIGGER_LABELS[triggerType]
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
                      ? step.type
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
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#2c333a] bg-[#22272b] px-2 py-1 text-xs text-[#c7d1db] shadow-lg">
            <button
              type="button"
              aria-label="Zoom out"
              className="flex size-6 items-center justify-center rounded-full hover:bg-[#2c333a]"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
            >
              −
            </button>
            <span className="min-w-10 text-center tabular-nums">{zoom}%</span>
            <button
              type="button"
              aria-label="Zoom in"
              className="flex size-6 items-center justify-center rounded-full hover:bg-[#2c333a]"
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
            >
              +
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="flex w-[360px] shrink-0 flex-col border-l border-[#2c333a] bg-[#1d1d1d]">
          <div className="flex h-12 shrink-0 items-center border-b border-[#2c333a] px-4">
            <h2 className="text-sm font-semibold text-[#f4f5f7]">{panelTitle}</h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {selection.kind === "trigger" && !triggerChosen && (
              <div className="flex flex-col gap-3 p-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#738496]"
                    aria-hidden="true"
                  />
                  <Input
                    value={triggerQuery}
                    onChange={(event) => setTriggerQuery(event.target.value)}
                    placeholder="Search triggers"
                    disabled={readOnly}
                    className="h-9 border-[#2c333a] bg-[#22272b] pl-8 text-[#f4f5f7] placeholder:text-[#738496] focus-visible:border-[#579dff]"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  {Object.entries(triggersByCategory).map(
                    ([category, options]) => (
                      <div key={category}>
                        <div className="mb-1.5 flex items-center gap-2 px-1">
                          <span className="rounded bg-[#2c333a] px-1.5 py-0.5 text-[11px] font-medium text-[#f4f5f7]">
                            {category}
                          </span>
                          <span className="text-[11px] text-[#738496]">
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
                                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-[#f4f5f7] hover:bg-[#2c333a] disabled:opacity-60"
                                >
                                  <span className="flex size-6 shrink-0 items-center justify-center rounded bg-[#22272b] text-[#579dff]">
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
                  <Label
                    htmlFor="workflow-trigger"
                    className="text-[#c7d1db]"
                  >
                    Trigger
                  </Label>
                  <NativeSelect
                    id="workflow-trigger"
                    value={triggerType}
                    onChange={(event) =>
                      setTriggerType(event.target.value as TriggerType)
                    }
                    disabled={readOnly}
                    className="border-[#2c333a] bg-[#22272b] text-[#f4f5f7]"
                  >
                    {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                {(triggerType === "entity_created" ||
                  triggerType === "entity_updated") && (
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="workflow-entity-type"
                      className="text-[#c7d1db]"
                    >
                      Entity type
                    </Label>
                    <NativeSelect
                      id="workflow-entity-type"
                      value={entityType}
                      onChange={(event) => setEntityType(event.target.value)}
                      disabled={readOnly}
                      className="border-[#2c333a] bg-[#22272b] text-[#f4f5f7]"
                    >
                      {ENTITY_TYPES.map((entity) => (
                        <option key={entity.value} value={entity.value}>
                          {entity.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
                {triggerType === "scheduled" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="workflow-cron" className="text-[#c7d1db]">
                      Schedule (cron expression)
                    </Label>
                    <Input
                      id="workflow-cron"
                      value={cron}
                      onChange={(event) => setCron(event.target.value)}
                      placeholder="0 9 * * 1"
                      disabled={readOnly}
                      className="border-[#2c333a] bg-[#22272b] text-[#f4f5f7] placeholder:text-[#738496]"
                    />
                  </div>
                )}
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit border-[#2c333a] bg-transparent text-[#c7d1db] hover:bg-[#2c333a] hover:text-white"
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
                    className="flex items-start gap-2.5 rounded-md px-2 py-2.5 text-left hover:bg-[#2c333a] disabled:opacity-60"
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
                      <span className="block text-sm font-medium text-[#f4f5f7]">
                        {option.label}
                      </span>
                      <span className="block text-xs text-[#9fadbc]">
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
                      className="text-[#c7d1db] hover:bg-[#2c333a] hover:text-white"
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
                      className="text-[#c7d1db] hover:bg-[#2c333a] hover:text-white"
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
                      className="ml-auto text-[#c7d1db] hover:bg-[#2c333a] hover:text-red-400"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[#c7d1db]">Type</Label>
                  <Input
                    list={`${selectedStep.kind}-type-suggestions`}
                    placeholder={
                      selectedStep.kind === "condition"
                        ? "e.g. field_equals"
                        : "e.g. notify"
                    }
                    value={selectedStep.type}
                    onChange={(event) =>
                      setSteps(
                        updateStep(steps, selection.index, {
                          type: event.target.value,
                        }),
                      )
                    }
                    disabled={readOnly}
                    className="border-[#2c333a] bg-[#22272b] text-[#f4f5f7] placeholder:text-[#738496]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[#c7d1db]">Config (JSON)</Label>
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
                    className="min-h-28 border-[#2c333a] bg-[#22272b] font-mono text-xs text-[#f4f5f7] placeholder:text-[#738496]"
                  />
                </div>
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
              </div>
            )}

            {selection.kind === "people" && (
              <div className="flex flex-col gap-5 p-4">
                {creators.length > 0 && (
                  <p className="text-sm text-[#9fadbc]">
                    Created by{" "}
                    {creators
                      .map((assignment) => assignment.person.name)
                      .join(", ")}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[#c7d1db]">Owner</Label>
                  <PeoplePicker
                    label="Owner"
                    people={people}
                    selectedIds={ownerIds}
                    onChange={setOwnerIds}
                    readOnly={readOnly}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[#c7d1db]">Workers</Label>
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
                  <Label htmlFor="workflow-description" className="text-[#c7d1db]">
                    Description
                  </Label>
                  <Textarea
                    id="workflow-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What is this workflow for?"
                    disabled={readOnly}
                    className="border-[#2c333a] bg-[#22272b] text-[#f4f5f7] placeholder:text-[#738496]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="workflow-status" className="text-[#c7d1db]">
                    Status
                  </Label>
                  <NativeSelect
                    id="workflow-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as WorkflowStatus)
                    }
                    disabled={readOnly}
                    className="max-w-48 border-[#2c333a] bg-[#22272b] text-[#f4f5f7]"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </NativeSelect>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </form>
  );
}
