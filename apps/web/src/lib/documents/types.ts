/**
 * Document type enum values and display labels, shared by forms and list UI.
 */

export const DOCUMENT_TYPES = [
  { value: "other", label: "Document" },
  { value: "runbook", label: "Runbook" },
  { value: "adr", label: "Decision record" },
  { value: "spec", label: "Spec" },
  { value: "policy", label: "Policy" },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> =
  Object.fromEntries(
    DOCUMENT_TYPES.map(({ value, label }) => [value, label]),
  ) as Record<DocumentType, string>;

export function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type;
}
