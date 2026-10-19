"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import {
  SettingRow,
  SettingsSectionHeader,
} from "@/components/settings/setting-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { messageFromApiError } from "@/lib/api/client-error";
import {
  DEFAULT_TERMINOLOGY,
  type ConceptTerms,
  type Terminology,
} from "@/lib/terminology";

type Concept = keyof Terminology;

const CONCEPTS: Array<{ key: Concept; heading: string; blurb: string }> = [
  {
    key: "services",
    heading: "Services",
    blurb: "What your organization delivers or runs.",
  },
  {
    key: "tools",
    heading: "Tools",
    blurb: "What your organization uses to do its work.",
  },
];

const FIELD_KEYS: Record<Concept, Record<keyof ConceptTerms, string>> = {
  services: {
    singular: "servicesLabelSingular",
    plural: "servicesLabelPlural",
    description: "servicesDescription",
  },
  tools: {
    singular: "toolsLabelSingular",
    plural: "toolsLabelPlural",
    description: "toolsDescription",
  },
};

/**
 * Lets an admin name the two catalog concepts for their organization (a
 * school's "Programs", a club's "Equipment") and say in one line what
 * belongs in each. The wording appears across the app wherever the concept
 * does; blank resets to the default.
 */
export function CatalogTerminologyForm({
  terminology,
}: {
  terminology: Terminology;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(terminology);
  const [editing, setEditing] = useState<Concept | null>(null);
  const [draft, setDraft] = useState<ConceptTerms | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing(concept: Concept) {
    setError(null);
    setDraft({ ...current[concept] });
    setEditing(concept);
  }

  function cancel() {
    setEditing(null);
    setDraft(null);
    setError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || !draft) return;

    const defaults = DEFAULT_TERMINOLOGY[editing];
    const keys = FIELD_KEYS[editing];
    const payload: Record<string, string> = {};
    for (const field of ["singular", "plural", "description"] as const) {
      const value = draft[field].trim();
      // Wording that matches the default is stored as "unset", so it keeps
      // following the default if that ever changes.
      payload[keys[field]] = value === defaults[field] ? "" : value;
    }

    setSaving(true);
    setError(null);
    const response = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(messageFromApiError(body));
      return;
    }

    setCurrent((previous) => ({
      ...previous,
      [editing]: {
        singular: draft.singular.trim() || defaults.singular,
        plural: draft.plural.trim() || defaults.plural,
        description: draft.description.trim() || defaults.description,
      },
    }));
    cancel();
    router.refresh();
  }

  function update(field: keyof ConceptTerms, value: string) {
    setDraft((previous) =>
      previous ? { ...previous, [field]: value } : previous,
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <SettingsSectionHeader
        title="Catalog"
        description="Name the two things your organization keeps track of, and say in one line what belongs in each. This wording is used throughout the app."
      />

      {CONCEPTS.map(({ key, heading, blurb }) => {
        const terms = current[key];
        const isEditing = editing === key && draft !== null;
        return (
          <section key={key} aria-label={heading}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  {heading}
                </h3>
                <p className="text-sm text-muted-foreground">{blurb}</p>
              </div>
              {!isEditing && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400"
                        aria-label={`Edit ${heading.toLowerCase()} wording`}
                        onClick={() => startEditing(key)}
                        disabled={editing !== null}
                      />
                    }
                  >
                    <Pencil aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={save} className="mt-2 divide-y divide-border">
                <SettingRow
                  label="Name (one)"
                  htmlFor={`${key}-singular`}
                  hint="Used where there's a single item, e.g. “New program”."
                >
                  <Input
                    id={`${key}-singular`}
                    autoFocus
                    maxLength={40}
                    value={draft.singular}
                    onChange={(event) => update("singular", event.target.value)}
                  />
                </SettingRow>
                <SettingRow
                  label="Name (many)"
                  htmlFor={`${key}-plural`}
                  hint="Used for the page heading, navigation and counts."
                >
                  <Input
                    id={`${key}-plural`}
                    maxLength={40}
                    value={draft.plural}
                    onChange={(event) => update("plural", event.target.value)}
                  />
                </SettingRow>
                <SettingRow
                  label="One-line description"
                  htmlFor={`${key}-description`}
                  hint="Shown under the page heading. Up to 160 characters."
                >
                  <div className="flex flex-col gap-2">
                    <Input
                      id={`${key}-description`}
                      maxLength={160}
                      value={draft.description}
                      onChange={(event) =>
                        update("description", event.target.value)
                      }
                    />
                    {error && (
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={cancel}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDraft({ ...DEFAULT_TERMINOLOGY[key] })
                        }
                      >
                        Use defaults
                      </Button>
                    </div>
                  </div>
                </SettingRow>
              </form>
            ) : (
              <div className="mt-2 divide-y divide-border">
                <SettingRow label="Name">
                  <p className="py-1 text-sm">
                    {terms.singular}
                    <span className="text-muted-foreground">
                      {" "}
                      · {terms.plural}
                    </span>
                  </p>
                </SettingRow>
                <SettingRow label="One-line description">
                  <p className="py-1 text-sm">{terms.description}</p>
                </SettingRow>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
