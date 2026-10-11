import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import { people, teams } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

import { PersonPage } from "./person-page";
import { TeamPage } from "./team-page";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * People and teams are addressed straight off the site root: `/jordan-lee`,
 * `/payments`. The app's own pages (`/settings`, `/directory`, ...) are real
 * routes and win over this one, and their names can't be used as a slug.
 */
export default async function ProfileBySlugPage({ params }: PageProps) {
  const session = await requireSession();
  const { slug } = await params;
  const orgId = session.organizationId;
  const db = getDb();

  const [person, team] = await Promise.all([
    db.query.people.findFirst({
      where: and(eq(people.organizationId, orgId), eq(people.slug, slug)),
      columns: { id: true },
    }),
    db.query.teams.findFirst({
      where: and(eq(teams.organizationId, orgId), eq(teams.slug, slug)),
      columns: { id: true },
    }),
  ]);

  if (person) return <PersonPage id={person.id} />;
  if (team) return <TeamPage id={team.id} />;
  notFound();
}
