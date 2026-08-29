"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
import { Select } from "@/components/ui/select";

export interface PersonDetail {
  id: string;
  name: string;
  email: string;
  title: string | null;
  teamId: string | null;
  managerId: string | null;
}

export function PersonForm({
  mode,
  person,
  teams,
  managers,
  readOnly = false,
}: {
  mode: "create" | "edit";
  person?: PersonDetail;
  teams: { id: string; name: string }[];
  /** Every other person in the org, for the manager picker (never includes
   * this person: nobody can be their own manager). */
  managers: { id: string; name: string }[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(person?.name ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [title, setTitle] = useState(person?.title ?? "");
  const [teamId, setTeamId] = useState(person?.teamId ?? "");
  const [managerId, setManagerId] = useState(person?.managerId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }
    if (email.trim().length === 0) {
      setError("Email is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      title: title.trim().length > 0 ? title.trim() : null,
      teamId: teamId.length > 0 ? teamId : null,
      managerId: managerId.length > 0 ? managerId : null,
    };

    setSaving(true);
    const response = await fetch(
      mode === "create" ? "/api/people" : `/api/people/${person?.id}`,
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

    const body = (await response.json()) as { person: PersonDetail };
    router.push(`/directory/people/${body.person.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {readOnly && (
        <Alert>
          <AlertTitle>View-only</AlertTitle>
          <AlertDescription>
            You have viewer access, so this person can be viewed but not
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
          <CardTitle>Person details</CardTitle>
          <CardDescription>
            Who they are and where they fit in the org.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-name">Name</Label>
            <Input
              id="person-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Jordan Lee"
              required
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-email">Email</Label>
            <Input
              id="person-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="jordan@example.com"
              required
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-title">Title</Label>
            <Input
              id="person-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Senior Platform Engineer"
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-team">Team</Label>
            <Select
              id="person-team"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              className="max-w-72"
              disabled={readOnly}
            >
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-manager">Manager</Label>
            <Select
              id="person-manager"
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
              className="max-w-72"
              disabled={readOnly}
            >
              <option value="">No manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {!readOnly && (
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create person"
                : "Save changes"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                mode === "create"
                  ? "/directory/people"
                  : `/directory/people/${person?.id}`
              }
            />
          }
        >
          {readOnly ? "Back" : "Cancel"}
        </Button>
      </div>
    </form>
  );
}
