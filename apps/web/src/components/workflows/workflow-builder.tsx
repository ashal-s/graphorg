"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PeoplePicker,
  type WorkflowPersonOption,
} from "@/components/workflows/people-picker";
import {
  StepListEditor,
  type WorkflowStepDraft,
} from "@/components/workflows/step-list-editor";

type TriggerType =
  | "manual"
  | "entity_created"
  | "entity_updated"
  | "scheduled";
type WorkflowStatus = "draft" | "active" | "archived";

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

function stepsFromDetail(steps: WorkflowDetail["steps"]): WorkflowStepDraft[] {
  return [...steps]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((step) => ({
      key: step.id,
      kind: step.kind,
      type: step.type,
      details:
        typeof step.config.details === "string" ? step.config.details : "",
    }));
}

export function WorkflowBuilder({
  mode,
  workflow,
  people,
}: {
  mode: "create" | "edit";
  workflow?: WorkflowDetail;
  people: WorkflowPersonOption[];
}) {
  const router = useRouter();

  const [name, setName] = useState(workflow?.name ?? "");
  const [description, setDescription] = useState(workflow?.description ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    workflow?.triggerType ?? "manual",
  );
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

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }
    if (steps.some((step) => step.type.trim().length === 0)) {
      setError("Every step needs a type.");
      return;
    }

    const triggerConfig: Record<string, unknown> =
      triggerType === "entity_created" || triggerType === "entity_updated"
        ? { entityType }
        : triggerType === "scheduled"
          ? { cron: cron.trim() }
          : {};

    const payload = {
      name: name.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      triggerType,
      triggerConfig,
      status,
      steps: steps.map((step, index) => ({
        stepOrder: index,
        kind: step.kind,
        type: step.type.trim(),
        config:
          step.details.trim().length > 0
            ? { details: step.details.trim() }
            : {},
      })),
      people: [
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
    router.push(`/workflows/${body.workflow.id}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!workflow) return;
    if (
      !window.confirm(`Delete "${workflow.name}"? This can't be undone.`)
    ) {
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>What this workflow is and why it exists.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workflow-name">Name</Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. New service onboarding"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workflow-description">Description</Label>
            <Textarea
              id="workflow-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this workflow for?"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workflow-status">Status</Label>
            <Select
              id="workflow-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as WorkflowStatus)
              }
              className="max-w-48"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trigger</CardTitle>
          <CardDescription>What starts this workflow.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workflow-trigger">Trigger</Label>
            <Select
              id="workflow-trigger"
              value={triggerType}
              onChange={(event) =>
                setTriggerType(event.target.value as TriggerType)
              }
              className="max-w-72"
            >
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          {(triggerType === "entity_created" ||
            triggerType === "entity_updated") && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workflow-entity-type">Entity type</Label>
              <Select
                id="workflow-entity-type"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
                className="max-w-72"
              >
                {ENTITY_TYPES.map((entity) => (
                  <option key={entity.value} value={entity.value}>
                    {entity.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {triggerType === "scheduled" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workflow-cron">Schedule (cron expression)</Label>
              <Input
                id="workflow-cron"
                value={cron}
                onChange={(event) => setCron(event.target.value)}
                placeholder="0 9 * * 1"
                className="max-w-72"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
          <CardDescription>
            The ordered conditions and actions that make up this workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StepListEditor steps={steps} onChange={setSteps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
          <CardDescription>
            Who&apos;s accountable for this workflow and who carries it out.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label>Owner</Label>
            <PeoplePicker
              label="Owner"
              people={people}
              selectedIds={ownerIds}
              onChange={setOwnerIds}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Workers</Label>
            <PeoplePicker
              label="Workers"
              people={people}
              selectedIds={workerIds}
              onChange={setWorkerIds}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || deleting}>
            {saving ? "Saving…" : mode === "create" ? "Create workflow" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            render={<Link href={mode === "create" ? "/workflows" : `/workflows/${workflow?.id}`} />}
          >
            Cancel
          </Button>
        </div>
        {mode === "edit" && (
          <Button
            type="button"
            variant="destructive"
            disabled={saving || deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting…" : "Delete workflow"}
          </Button>
        )}
      </div>
    </form>
  );
}
