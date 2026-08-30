import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight, Users, Users2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { people, teams } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

export default async function DirectoryPage() {
  const session = await requireSession();
  const orgId = session.organizationId;

  const [peopleCount, teamsCount] = await Promise.all([
    getDb().query.people.findMany({
      where: eq(people.organizationId, orgId),
      columns: { id: true },
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Directory"
        description="People and teams in your organisation."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/directory/people">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <Users
                className="h-6 w-6 text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle className="flex items-center justify-between">
                People
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </CardTitle>
              <CardDescription>
                {peopleCount.length}{" "}
                {peopleCount.length === 1 ? "person" : "people"}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/directory/teams">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <Users2
                className="h-6 w-6 text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle className="flex items-center justify-between">
                Teams
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </CardTitle>
              <CardDescription>
                {teamsCount.length} {teamsCount.length === 1 ? "team" : "teams"}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
