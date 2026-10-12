"use client";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

/**
 * The primary among what's selected: the chosen one if it's still selected,
 * else the first selected, or null when nothing is.
 */
export function effectivePrimary(
  selectedIds: string[],
  primaryId: string,
): string | null {
  if (selectedIds.includes(primaryId)) return primaryId;
  return selectedIds[0] ?? null;
}

/**
 * Pick which of the selected items is the primary one. With a single item
 * there's nothing to choose, so nothing is shown; the form submits that one.
 */
export function PrimarySelect({
  id,
  label,
  options,
  selectedIds,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  options: { id: string; name: string }[];
  selectedIds: string[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  if (selectedIds.length < 2) return null;
  const current = effectivePrimary(selectedIds, value) ?? "";

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={current}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {options
          .filter((option) => selectedIds.includes(option.id))
          .map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
      </NativeSelect>
    </div>
  );
}
