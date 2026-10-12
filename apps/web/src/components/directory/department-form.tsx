"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  SearchableMultiSelect,
  SearchableSelect,
} from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";

export interface DepartmentFormValues {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  headPersonId: string | null;
  teamIds: string[];
  personIds: string[];
}

interface Option {
  id: string;
  name: string;
}

/**
 * Create or edit a department: its name, where it sits, who heads it, and
 * the teams and people in it. A team or person can be in other departments
 * too; which one is their primary is chosen on their own page.
 */
export function DepartmentForm({
  mode,
  department,
  parents,
  people,
  teams,
  readOnly = false,
}: {
  mode: "create" | "edit";
  department?: DepartmentFormValues;
  /** Departments it could sit under (never itself or anything beneath it). */
  parents: Option[];
  people: Option[];
  teams: Option[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [parentId, setParentId] = useState(department?.parentId ?? "");
  const [headPersonId, setHeadPersonId] = useState(
    department?.headPersonId ?? "",
  );
  const [teamIds, setTeamIds] = useState(department?.teamIds ?? []);
  const [personIds, setPersonIds] = useState(department?.personIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    const response = await fetch(
      mode === "create"
        ? "/api/departments"
        : `/api/departments/${department?.id}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description:
            description.trim().length > 0 ? description.trim() : null,
          parentId: parentId || null,
          headPersonId: headPersonId || null,
          teamIds,
          personIds,
        }),
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

    const body = (await response.json()) as { department: { id: string } };
    if (mode === "create") {
      router.push(`/directory/departments/${body.department.id}`);
    }
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {readOnly && (
        <Alert>
          <AlertTitle>View-only</AlertTitle>
          <AlertDescription>
            You have viewer access, so this department can be viewed but not
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

      <Card>
        <CardHeader>
          <CardTitle>Department details</CardTitle>
          <CardDescription>
            What it is, where it sits and who runs it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="department-name">Name</Label>
            <Input
              id="department-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Engineering"
              required
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="department-description">Description</Label>
            <Textarea
              id="department-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this department responsible for?"
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="department-parent">Parent department</Label>
            <SearchableSelect
              id="department-parent"
              options={parents.map((p) => ({ id: p.id, label: p.name }))}
              value={parentId}
              onValueChange={setParentId}
              placeholder="None (top level)"
              emptyLabel="No departments match."
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="department-head">Department head</Label>
            <SearchableSelect
              id="department-head"
              options={people.map((p) => ({ id: p.id, label: p.name }))}
              value={headPersonId}
              onValueChange={setHeadPersonId}
              placeholder="Search people"
              emptyLabel="No people match."
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teams and people</CardTitle>
          <CardDescription>
            Teams can be in several departments, or none. People here belong to
            the department directly, apart from the teams they are on.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="department-teams">Teams</Label>
            <SearchableMultiSelect
              id="department-teams"
              options={teams.map((t) => ({ id: t.id, label: t.name }))}
              values={teamIds}
              onValuesChange={setTeamIds}
              placeholder="Search teams"
              emptyLabel="No teams match."
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="department-people">People</Label>
            <SearchableMultiSelect
              id="department-people"
              options={people.map((p) => ({ id: p.id, label: p.name }))}
              values={personIds}
              onValuesChange={setPersonIds}
              placeholder="Search people"
              emptyLabel="No people match."
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {!readOnly && (
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create department"
                : "Save changes"}
          </Button>
        )}
        {mode === "create" && (
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href="/directory/departments" />}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
