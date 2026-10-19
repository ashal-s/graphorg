"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { MultiSelectPicker } from "@/components/catalog/multi-select-picker";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { messageFromApiError } from "@/lib/api/client-error";
import { lowerLabel, type Terminology } from "@/lib/terminology";

export interface ServiceDetail {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  ownerTeamId: string | null;
  tools: { id: string; name: string }[];
  dependencies: { id: string; name: string }[];
}

export function ServiceForm({
  mode,
  service,
  terminology,
  parents,
  teams,
  tools,
  services,
  readOnly = false,
  defaultOwnerTeamId,
}: {
  mode: "create" | "edit";
  service?: ServiceDetail;
  /** The organization's wording for services and tools. */
  terminology: Terminology;
  /** Services this one may sit under (never itself or anything beneath it). */
  parents: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  tools: { id: string; name: string; category: string }[];
  /** Every other service in the org, for the "depends on" picker (never
   * includes this service: a service can't depend on itself). */
  services: { id: string; name: string }[];
  readOnly?: boolean;
  /** Pre-selects the owner team on the create form (e.g. when arriving from a team page). */
  defaultOwnerTeamId?: string;
}) {
  const router = useRouter();
  const serviceTerms = terminology.services;
  const toolTerms = terminology.tools;
  const singular = lowerLabel(serviceTerms.singular);
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [parentId, setParentId] = useState(service?.parentId ?? "");
  const [ownerTeamId, setOwnerTeamId] = useState(
    service?.ownerTeamId ?? defaultOwnerTeamId ?? "",
  );
  const [toolIds, setToolIds] = useState<string[]>(
    (service?.tools ?? []).map((tool) => tool.id),
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
      parentId: parentId.length > 0 ? parentId : null,
      ownerTeamId: ownerTeamId.length > 0 ? ownerTeamId : null,
      toolIds,
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
      setError(messageFromApiError(body));
      setSaving(false);
      return;
    }

    const body = (await response.json()) as { service: ServiceDetail };
    router.push(`/catalog/services/${body.service.id}`);
    router.refresh();
  }

  return (
    <EntityFormShell
      onSubmit={handleSubmit}
      readOnly={readOnly}
      readOnlyMessage={`You have viewer access, so this ${singular} can be viewed but not changed.`}
      error={error}
      actions={
        <>
          {!readOnly && (
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : mode === "create"
                  ? `Create ${singular}`
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
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{serviceTerms.singular} details</CardTitle>
          <CardDescription>{serviceTerms.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Name" htmlFor="service-name">
            <Input
              id="service-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`Name this ${singular}`}
              required
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Description" htmlFor="service-description">
            <Textarea
              id="service-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={`What is this ${singular} about?`}
              disabled={readOnly}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Part of" htmlFor="service-parent">
              <NativeSelect
                id="service-parent"
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                disabled={readOnly}
              >
                <option value="">Top level</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Owner team" htmlFor="service-owner-team">
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
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{toolTerms.plural}</CardTitle>
          <CardDescription>{toolTerms.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <MultiSelectPicker
            label={toolTerms.plural}
            addLabel={`Add ${lowerLabel(toolTerms.singular)}`}
            emptyLabel={`No ${lowerLabel(toolTerms.plural)} recorded yet.`}
            options={tools.map((tool) => ({
              id: tool.id,
              label: tool.name,
              sublabel: tool.category,
            }))}
            selectedIds={toolIds}
            onChange={setToolIds}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Depends on</CardTitle>
          <CardDescription>
            Other {lowerLabel(serviceTerms.plural)} this one relies on.
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
    </EntityFormShell>
  );
}
