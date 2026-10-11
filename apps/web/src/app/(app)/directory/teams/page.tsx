import { eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, Users2 } from "lucide-react";

import { TeamsDirectory } from "@/components/directory/teams-directory";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { personPhotoSrc } from "@/lib/person-photo";

export default async function TeamsPage() {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");

  // All teams are sent once; searching happens in the browser as you type.
  const rows = await getDb().query.teams.findMany({
    where: eq(teams.organizationId, session.organizationId),
    with: {
      memberships: {
        columns: { teamRole: true },
        with: {
          person: {
            columns: { id: true, name: true, photoUrl: true, updatedAt: true },
          },
        },
      },
    },
    orderBy: (row, { asc }) => asc(row.name),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teams"
        icon={Users2}
        description="Who owns what across your organisation."
        actions={
          canEdit && (
            <Button
              render={<Link href="/directory/teams/new" />}
              nativeButton={false}
            >
              <Plus aria-hidden="true" />
              New team
            </Button>
          )
        }
      />

      <TeamsDirectory
        teams={rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          members: row.memberships
            .map((membership) => ({
              id: membership.person.id,
              name: membership.person.name,
              photoSrc: personPhotoSrc(membership.person),
              teamRole: membership.teamRole,
            }))
            // Leads first, so the stack shows who runs the team.
            .sort(
              (a, b) =>
                Number(b.teamRole === "lead") - Number(a.teamRole === "lead") ||
                a.name.localeCompare(b.name),
            ),
        }))}
        canEdit={canEdit}
        emptyAction={
          <Button
            size="sm"
            render={<Link href="/directory/teams/new" />}
            nativeButton={false}
          >
            New team
          </Button>
        }
      />
    </div>
  );
}
