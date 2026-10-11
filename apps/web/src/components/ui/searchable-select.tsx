"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SearchableOption {
  id: string;
  label: string;
}

interface Item {
  value: string;
  label: string;
}

const FIELD =
  "min-h-8 w-full rounded-lg border border-input bg-transparent text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50 dark:bg-input/30";

const INPUT =
  "min-w-16 flex-1 bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed";

function toItems(options: SearchableOption[]): Item[] {
  return options.map((option) => ({ value: option.id, label: option.label }));
}

function Popup({ emptyLabel }: { emptyLabel: string }) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={4} className="z-[70]">
        <ComboboxPrimitive.Popup className="max-h-60 w-(--anchor-width) min-w-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md transition duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <ComboboxPrimitive.Empty className="px-2 py-1.5 text-muted-foreground empty:hidden">
            {emptyLabel}
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List>
            {(item: Item) => (
              <ComboboxPrimitive.Item
                key={item.value}
                value={item}
                className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-muted"
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <ComboboxPrimitive.ItemIndicator>
                  <CheckIcon className="size-4" aria-hidden="true" />
                </ComboboxPrimitive.ItemIndicator>
              </ComboboxPrimitive.Item>
            )}
          </ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

/**
 * Pick one option from a list you can type to narrow. Selecting the same
 * option again, or pressing the clear button, empties it.
 */
export function SearchableSelect({
  id,
  options,
  value,
  onValueChange,
  placeholder = "Search…",
  emptyLabel = "No matches.",
  disabled,
  className,
}: {
  id?: string;
  options: SearchableOption[];
  /** The selected option's id, or "" for none. */
  value: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const items = React.useMemo(() => toItems(options), [options]);
  const selected = items.find((item) => item.value === value) ?? null;

  return (
    <ComboboxPrimitive.Root<Item>
      items={items}
      value={selected}
      onValueChange={(next) => onValueChange(next?.value ?? "")}
      disabled={disabled}
    >
      <div className={cn(FIELD, "flex items-center pr-1", className)}>
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          className={INPUT}
        />
        {selected && !disabled && (
          <ComboboxPrimitive.Clear
            aria-label="Clear"
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
          </ComboboxPrimitive.Clear>
        )}
        <ComboboxPrimitive.Trigger
          aria-label="Show options"
          className="rounded p-1 text-muted-foreground"
        >
          <ChevronDownIcon className="size-4" aria-hidden="true" />
        </ComboboxPrimitive.Trigger>
      </div>
      <Popup emptyLabel={emptyLabel} />
    </ComboboxPrimitive.Root>
  );
}

/** Pick any number of options, shown as removable chips; type to narrow. */
export function SearchableMultiSelect({
  id,
  options,
  values,
  onValuesChange,
  placeholder = "Search…",
  emptyLabel = "No matches.",
  disabled,
  className,
}: {
  id?: string;
  options: SearchableOption[];
  values: string[];
  onValuesChange: (ids: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const items = React.useMemo(() => toItems(options), [options]);
  const selected = items.filter((item) => values.includes(item.value));

  return (
    <ComboboxPrimitive.Root<Item, true>
      multiple
      items={items}
      value={selected}
      onValueChange={(next) => onValuesChange(next.map((item) => item.value))}
      disabled={disabled}
    >
      <ComboboxPrimitive.Chips
        className={cn(
          FIELD,
          "flex flex-wrap items-center gap-1 p-1",
          className,
        )}
      >
        {selected.map((item) => (
          <ComboboxPrimitive.Chip
            key={item.value}
            aria-label={item.label}
            className="flex items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2 text-xs"
          >
            {item.label}
            <ComboboxPrimitive.ChipRemove
              aria-label={`Remove ${item.label}`}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3" aria-hidden="true" />
            </ComboboxPrimitive.ChipRemove>
          </ComboboxPrimitive.Chip>
        ))}
        <ComboboxPrimitive.Input
          id={id}
          placeholder={selected.length === 0 ? placeholder : "Add another…"}
          className={cn(INPUT, "py-0.5")}
        />
      </ComboboxPrimitive.Chips>
      <Popup emptyLabel={emptyLabel} />
    </ComboboxPrimitive.Root>
  );
}
