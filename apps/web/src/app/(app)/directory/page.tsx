import { eq } from "drizzle-orm";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRight, BookUser, Network, Users, Users2 } from "lucide-react";
import type { ReactNode } from "react";

import { AvatarStack } from "@/components/shared/avatar-stack";
import { PageHeader } from "@/components/shared/page-header";
import { TeamChip } from "@/components/shared/team-chip";
import { getDb } from "@/db";
import { people, teams } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { loadTones } from "@/lib/directory/tones";
import { personPhotoSrc } from "@/lib/person-photo";

function SectionCard({
  href,
  icon: Icon,
  title,
  description,
  stat,
  children,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  stat?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-5 rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-all hover:-translate-y-px hover:shadow-md hover:ring-primary/40"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <ArrowRight
          className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </span>
      <span>
        <span className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight">{title}</span>
          {stat && (
            <span className="text-sm font-medium text-muted-foreground">
              {stat}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      {children && (
        <span className="mt-auto border-t border-border pt-4">{children}</span>
      )}
    </Link>
  );
}

export default async function DirectoryPage() {
  const session = await requireSession();
  const orgId = session.organizationId;

  const [peopleRows, teamRows, tones] = await Promise.all([
    getDb().query.people.findMany({
      where: eq(people.organizationId, orgId),
      columns: { id: true, name: true, photoUrl: true, updatedAt: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    loadTones(orgId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Directory"
        icon={BookUser}
        description="People and teams in your organisation."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          href="/directory/people"
          icon={Users}
          title="People"
          stat={String(peopleRows.length)}
          description="Everyone in your organisation, with their position and teams."
        >
          {peopleRows.length > 0 ? (
            <AvatarStack
              max={6}
              people={peopleRows.map((person) => ({
                id: person.id,
                name: person.name,
                photoSrc: personPhotoSrc(person),
                tone: tones.people[person.id],
              }))}
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              No one has been added yet.
            </span>
          )}
        </SectionCard>

        <SectionCard
          href="/directory/teams"
          icon={Users2}
          title="Teams"
          stat={String(teamRows.length)}
          description="The groups people work in, and who leads each one."
        >
          {teamRows.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {teamRows.slice(0, 4).map((team) => (
                <TeamChip
                  key={team.id}
                  team={{ ...team, tone: tones.teams[team.id] }}
                />
              ))}
              {teamRows.length > 4 && (
                <span className="px-1 py-0.5 text-xs font-medium text-muted-foreground">
                  +{teamRows.length - 4} more
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              No teams have been created yet.
            </span>
          )}
        </SectionCard>

        <SectionCard
          href="/org-chart"
          icon={Network}
          title="Org chart"
          description="Who reports to whom, laid out from the top down."
        />
      </div>
    </div>
  );
}
