"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * Multi-select for a full-replacement id list on a create/edit form (a
 * service's tools or dependencies). A Sheet, not a dropdown/combobox:
 * the app has no listbox primitive yet, and a side panel gives room for a
 * search box plus a scrollable list without extra dependencies.
 */
export function MultiSelectPicker({
  label,
  addLabel,
  options,
  selectedIds,
  onChange,
  emptyLabel = "Nothing selected yet.",
  disabled = false,
}: {
  label: string;
  addLabel: string;
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = options.filter((option) => selectedIds.includes(option.id));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(q) ||
          option.sublabel?.toLowerCase().includes(q),
      )
    : options;

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((existingId) => existingId !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )}
        {selected.map((option) => (
          <Badge key={option.id} variant="secondary" className="gap-1 pr-1">
            {option.label}
            {!disabled && (
              <button
                type="button"
                onClick={() => toggle(option.id)}
                aria-label={`Remove ${option.label}`}
                className="rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      {!disabled && (
        <Sheet>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
              />
            }
          >
            <Plus aria-hidden="true" />
            {addLabel}
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{label}</SheetTitle>
              <SheetDescription>
                Search and select as many as apply.
              </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-4">
              <Input
                placeholder="Search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="flex-1 space-y-1 overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No matches.
                  </p>
                )}
                {filtered.map((option) => {
                  const isSelected = selectedIds.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(option.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted",
                        isSelected && "bg-muted",
                      )}
                    >
                      <span>
                        <span className="block font-medium">
                          {option.label}
                        </span>
                        {option.sublabel && (
                          <span className="block text-xs text-muted-foreground">
                            {option.sublabel}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <Check
                          className="size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <SheetFooter>
              <SheetClose render={<Button type="button" />}>Done</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
