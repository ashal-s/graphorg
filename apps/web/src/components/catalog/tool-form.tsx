"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
import { Textarea } from "@/components/ui/textarea";
import { messageFromApiError } from "@/lib/api/client-error";
import { lowerLabel, type ConceptTerms } from "@/lib/terminology";

export interface ToolDetail {
  id: string;
  name: string;
  category: string;
  description: string | null;
  vendor: string | null;
  url: string | null;
}

export function ToolForm({
  mode,
  tool,
  terms,
  categories,
  readOnly = false,
}: {
  mode: "create" | "edit";
  tool?: ToolDetail;
  /** The organization's wording for tools. */
  terms: ConceptTerms;
  /** Categories already in use, offered as suggestions. */
  categories: string[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const singular = lowerLabel(terms.singular);
  const [name, setName] = useState(tool?.name ?? "");
  const [category, setCategory] = useState(tool?.category ?? "");
  const [description, setDescription] = useState(tool?.description ?? "");
  const [vendor, setVendor] = useState(tool?.vendor ?? "");
  const [url, setUrl] = useState(tool?.url ?? "");
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
      category: category.trim().length > 0 ? category.trim() : "other",
      description: description.trim().length > 0 ? description.trim() : null,
      vendor: vendor.trim().length > 0 ? vendor.trim() : null,
      url: url.trim().length > 0 ? url.trim() : null,
    };

    setSaving(true);
    const response = await fetch(
      mode === "create" ? "/api/tools" : `/api/tools/${tool?.id}`,
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

    const body = (await response.json()) as { tool: ToolDetail };
    router.push(`/catalog/tools/${body.tool.id}`);
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
                    ? "/catalog/tools"
                    : `/catalog/tools/${tool?.id}`
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
          <CardTitle>{terms.singular} details</CardTitle>
          <CardDescription>{terms.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Name" htmlFor="tool-name">
            <Input
              id="tool-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`Name this ${singular}`}
              required
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Description" htmlFor="tool-description">
            <Textarea
              id="tool-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={`What is this ${singular} used for?`}
              disabled={readOnly}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Category" htmlFor="tool-category">
              <Input
                id="tool-category"
                list="tool-categories"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="e.g. Communication"
                disabled={readOnly}
              />
              <datalist id="tool-categories">
                {categories.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Vendor" htmlFor="tool-vendor">
              <Input
                id="tool-vendor"
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
                disabled={readOnly}
              />
            </FormField>
            <FormField label="Link" htmlFor="tool-url">
              <Input
                id="tool-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://"
                disabled={readOnly}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>
    </EntityFormShell>
  );
}
