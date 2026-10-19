"use client";

import type { FormEvent, ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

/**
 * Shared chrome for create/edit entity forms: view-only banner, save error,
 * field card(s) as children, and an actions row.
 */
export function EntityFormShell({
  onSubmit,
  readOnly,
  readOnlyMessage,
  error,
  children,
  actions,
}: {
  onSubmit: (event: FormEvent) => void;
  readOnly?: boolean;
  readOnlyMessage: string;
  error: string | null;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {readOnly && (
        <Alert>
          <AlertTitle>View-only</AlertTitle>
          <AlertDescription>{readOnlyMessage}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {children}
      <div className="flex gap-2">{actions}</div>
    </form>
  );
}

/** Label + control stack used across entity forms and dialogs. */
export function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
