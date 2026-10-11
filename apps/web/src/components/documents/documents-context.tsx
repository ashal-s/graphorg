"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { DocumentRecord, FolderRecord } from "@/lib/documents/tree";

export interface DocumentsData {
  folders: FolderRecord[];
  documents: DocumentRecord[];
  teams: { id: string; name: string }[];
  people: { id: string; name: string }[];
  canEdit: boolean;
}

const DocumentsContext = createContext<DocumentsData | null>(null);

/** Everything the documents sidebar and pages need, loaded once by the layout. */
export function DocumentsProvider({
  value,
  children,
}: {
  value: DocumentsData;
  children: ReactNode;
}) {
  return (
    <DocumentsContext.Provider value={value}>
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments(): DocumentsData {
  const value = useContext(DocumentsContext);
  if (!value)
    throw new Error("useDocuments must be used inside DocumentsProvider");
  return value;
}
