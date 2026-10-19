"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  effectivePrimary,
  PrimarySelect,
} from "@/components/directory/primary-select";
import {
  EntityFormShell,
  FormField,
} from "@/components/shared/entity-form-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableMultiSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { messageFromApiError } from "@/lib/api/client-error";

export interface TeamDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** The departments it is in, and which one is primary. */
  departmentIds?: string[];
  primaryDepartmentId?: string | null;
}

export function TeamForm({
  mode,
  team,
  departments = [],
  readOnly = false,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  team?: TeamDetail;
  /** Every department it could be in. */
  departments?: { id: string; name: string }[];
  readOnly?: boolean;
  /** When set, Cancel calls this instead of navigating away (inline editing). */
  onCancel?: () => void;
  /** When set, a successful save calls this instead of navigating to the team. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [departmentIds, setDepartmentIds] = useState(team?.departmentIds ?? []);
  const [primaryDepartmentId, setPrimaryDepartmentId] = useState(
    team?.primaryDepartmentId ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      // Only sent when there are departments to choose, so teams in a
      // workspace without any are saved exactly as before.
      ...(departments.length > 0
        ? {
            departmentIds,
            primaryDepartmentId: effectivePrimary(
              departmentIds,
              primaryDepartmentId,
            ),
          }
        : {}),
    };

    setSaving(true);
    const response = await fetch(
      mode === "create" ? "/api/teams" : `/api/teams/${team?.id}`,
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

    const body = (await response.json()) as { team: TeamDetail };
    if (onSaved) {
      onSaved();
    } else {
      router.push(`/${body.team.slug}`);
    }
    router.refresh();
  }

  return (
    <EntityFormShell
      onSubmit={handleSubmit}
      readOnly={readOnly}
      readOnlyMessage="You have viewer access, so this team can be viewed but not changed."
      error={error}
      actions={
        <>
          {!readOnly && (
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : mode === "create"
                  ? "Create team"
                  : "Save changes"}
            </Button>
          )}
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={
                    mode === "create" ? "/directory/teams" : `/${team?.slug}`
                  }
                />
              }
            >
              {readOnly ? "Back" : "Cancel"}
            </Button>
          )}
        </>
      }
    >
      <Card>
        {!onCancel && (
          <CardHeader>
            <CardTitle>Team details</CardTitle>
            <CardDescription>
              Who this team is and what it does.
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="flex flex-col gap-4">
          <FormField label="Name" htmlFor="team-name">
            <Input
              id="team-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Platform"
              required
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Description" htmlFor="team-description">
            <Textarea
              id="team-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this team own?"
              disabled={readOnly}
            />
          </FormField>
          {departments.length > 0 && (
            <>
              <FormField label="Departments" htmlFor="team-departments">
                <SearchableMultiSelect
                  id="team-departments"
                  options={departments.map((d) => ({
                    id: d.id,
                    label: d.name,
                  }))}
                  values={departmentIds}
                  onValuesChange={setDepartmentIds}
                  placeholder="Search departments"
                  emptyLabel="No departments match."
                  disabled={readOnly}
                />
              </FormField>
              <PrimarySelect
                id="team-primary-department"
                label="Primary department"
                options={departments}
                selectedIds={departmentIds}
                value={primaryDepartmentId}
                onChange={setPrimaryDepartmentId}
                disabled={readOnly}
              />
            </>
          )}
        </CardContent>
      </Card>
    </EntityFormShell>
  );
}
