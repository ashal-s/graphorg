import type { NextResponse } from "next/server";

import { documentFolders, people, teams } from "@/db/schema";
import { jsonError } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";

/**
 * Checks the folder, team and person a document create/update points at all
 * belong to the caller's organization. Returns a 400 for the first bad one,
 * or `null` when they are all fine.
 */
export async function validateDocumentRefs(
  organizationId: string,
  refs: {
    folderId?: string | null;
    ownerTeamId?: string | null;
    ownerPersonId?: string | null;
  },
): Promise<NextResponse | null> {
  const checks = [
    {
      id: refs.folderId,
      column: documentFolders.id,
      org: documentFolders.organizationId,
      message: "folderId does not reference a folder in this organization",
    },
    {
      id: refs.ownerTeamId,
      column: teams.id,
      org: teams.organizationId,
      message: "ownerTeamId does not reference a team in this organization",
    },
    {
      id: refs.ownerPersonId,
      column: people.id,
      org: people.organizationId,
      message: "ownerPersonId does not reference a person in this organization",
    },
  ];

  for (const check of checks) {
    if (!check.id) continue;
    const missing = await findMissingInOrg(
      check.column,
      check.org,
      organizationId,
      [check.id],
    );
    if (missing.length > 0) return jsonError(400, check.message);
  }
  return null;
}
