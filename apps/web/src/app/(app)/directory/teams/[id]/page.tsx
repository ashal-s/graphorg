import { and, eq } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { teams } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Old `/directory/teams/<id>` links keep working: they go to `/<slug>`. */
export default async function LegacyTeamPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const team = await getDb().query.teams.findFirst({
    where: and(
      eq(teams.id, id),
      eq(teams.organizationId, session.organizationId),
    ),
    columns: { slug: true },
  });
  if (!team) notFound();
  permanentRedirect(`/${team.slug}`);
}
