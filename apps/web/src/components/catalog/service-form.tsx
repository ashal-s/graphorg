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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectPicker } from "@/components/catalog/multi-select-picker";

export interface ServiceDetail {
  id: string;
  name: string;
  description: string | null;
  systemId: string | null;
  repositoryId: string | null;
  ownerTeamId: string | null;
  technologies: { id: string; name: string }[];
  dependencies: { id: string; name: string }[];
}

export function ServiceForm({
  mode,
  service,
  systems,
  repositories,
  teams,
  technologies,
  services,
  readOnly = false,
}: {
  mode: "create" | "edit";
  service?: ServiceDetail;
  systems: { id: string; name: string }[];
  repositories: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  technologies: { id: string; name: string; category: string }[];
  /** Every other service in the org, for the "depends on" picker (never
   * includes this service: a service can't depend on itself). */
  services: { id: string; name: string }[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [systemId, setSystemId] = useState(service?.systemId ?? "");
  const [repositoryId, setRepositoryId] = useState(service?.repositoryId ?? "");
  const [ownerTeamId, setOwnerTeamId] = useState(service?.ownerTeamId ?? "");
  const [technologyIds, setTechnologyIds] = useState<string[]>(
    (service?.technologies ?? []).map((technology) => technology.id),
  );
  const [dependsOnServiceIds, setDependsOnServiceIds] = useState<string[]>(
    (service?.dependencies ?? []).map((dependency) => dependency.id),
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
      systemId: systemId.length > 0 ? systemId : null,
      repositoryId: repositoryId.length > 0 ? repositoryId : null,
      ownerTeamId: ownerTeamId.length > 0 ? ownerTeamId : null,
      technologyIds,
      dependsOnServiceIds,
    };

    setSaving(true);
    const response = await fetch(
      mode === "create" ? "/api/services" : `/api/services/${service?.id}`,
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

    const body = (await response.json()) as { service: ServiceDetail };
    router.push(`/catalog/services/${body.service.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {readOnly && (
        <Alert>
          <AlertTitle>View-only</AlertTitle>
          <AlertDescription>
            You have viewer access, so this service can be viewed but not
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
          <CardTitle>Service details</CardTitle>
          <CardDescription>
            What this service does and where it lives.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-name">Name</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. checkout-api"
              required
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-description">Description</Label>
            <Textarea
              id="service-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this service do?"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-system">System</Label>
              <NativeSelect
                id="service-system"
                value={systemId}
                onChange={(event) => setSystemId(event.target.value)}
                disabled={readOnly}
              >
                <option value="">No system</option>
                {systems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-repository">Repository</Label>
              <NativeSelect
                id="service-repository"
                value={repositoryId}
                onChange={(event) => setRepositoryId(event.target.value)}
                disabled={readOnly}
              >
                <option value="">No repository</option>
                {repositories.map((repository) => (
                  <option key={repository.id} value={repository.id}>
                    {repository.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-owner-team">Owner team</Label>
              <NativeSelect
                id="service-owner-team"
                value={ownerTeamId}
                onChange={(event) => setOwnerTeamId(event.target.value)}
                disabled={readOnly}
              >
                <option value="">No owner team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technologies</CardTitle>
          <CardDescription>What this service is built with.</CardDescription>
        </CardHeader>
        <CardContent>
          <MultiSelectPicker
            label="Technologies"
            addLabel="Add technology"
            emptyLabel="No technologies recorded yet."
            options={technologies.map((technology) => ({
              id: technology.id,
              label: technology.name,
              sublabel: technology.category,
            }))}
            selectedIds={technologyIds}
            onChange={setTechnologyIds}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Depends on</CardTitle>
          <CardDescription>
            Other services this one relies on to work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MultiSelectPicker
            label="Depends on"
            addLabel="Add dependency"
            emptyLabel="No dependencies recorded yet."
            options={services.map((s) => ({ id: s.id, label: s.name }))}
            selectedIds={dependsOnServiceIds}
            onChange={setDependsOnServiceIds}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {!readOnly && (
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create service"
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
                  ? "/catalog/services"
                  : `/catalog/services/${service?.id}`
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
