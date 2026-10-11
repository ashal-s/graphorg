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
import { Textarea } from "@/components/ui/textarea";
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
      const fieldErrors = body?.details as
        Record<string, string[] | undefined> | undefined;
      const firstFieldError = fieldErrors
        ? Object.values(fieldErrors).flat()[0]
        : undefined;
      setError(
        firstFieldError ??
          (typeof body?.error === "string"
            ? body.error
            : "Something went wrong. Please try again."),
      );
      setSaving(false);
      return;
    }

    const body = (await response.json()) as { tool: ToolDetail };
    router.push(`/catalog/tools/${body.tool.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {readOnly && (
        <Alert>
          <AlertTitle>View-only</AlertTitle>
          <AlertDescription>
            You have viewer access, so this {singular} can be viewed but not
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
          <CardTitle>{terms.singular} details</CardTitle>
          <CardDescription>{terms.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tool-name">Name</Label>
            <Input
              id="tool-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`Name this ${singular}`}
              required
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tool-description">Description</Label>
            <Textarea
              id="tool-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={`What is this ${singular} used for?`}
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tool-category">Category</Label>
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
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tool-vendor">Vendor</Label>
              <Input
                id="tool-vendor"
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tool-url">Link</Label>
              <Input
                id="tool-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://"
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
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
      </div>
    </form>
  );
}
