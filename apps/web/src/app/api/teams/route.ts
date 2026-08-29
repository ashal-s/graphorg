import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { teams } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

/**
 * Minimal example of an authenticated, tenant-scoped Route Handler. Full
 * CRUD for teams (and every other entity) is WEB-131/132/136's job; this
 * exists to prove the auth/tenancy infrastructure from this ticket actually
 * rejects unauthenticated and cross-tenant access, with a test to match.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db.query.teams.findMany({
    where: eq(teams.organizationId, session.organizationId),
    columns: { id: true, name: true, description: true },
  });

  return NextResponse.json({ teams: rows });
}
