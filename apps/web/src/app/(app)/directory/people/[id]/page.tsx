import { and, eq } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { people } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Old `/directory/people/<id>` links keep working: they go to `/<slug>`. */
export default async function LegacyPersonPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const person = await getDb().query.people.findFirst({
    where: and(
      eq(people.id, id),
      eq(people.organizationId, session.organizationId),
    ),
    columns: { slug: true },
  });
  if (!person) notFound();
  permanentRedirect(`/${person.slug}`);
}
