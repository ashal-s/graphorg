import { and, eq, ilike } from "drizzle-orm";
import Link from "next/link";
import { Boxes, Plus } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/db";
import { systems } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SystemsPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const canEdit = hasRole(session.role, "editor");
  const { q } = await searchParams;

  const rows = await getDb().query.systems.findMany({
    where: and(
      eq(systems.organizationId, session.organizationId),
      q ? ilike(systems.name, `%${q}%`) : undefined,
    ),
    with: {
      ownerTeam: { columns: { id: true, name: true } },
      services: { columns: { id: true } },
    },
    orderBy: (row, { asc }) => asc(row.name),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Systems</h1>
          <p className="text-sm text-muted-foreground">
            The systems your organisation runs, and who owns each one.
          </p>
        </div>
        {canEdit && (
          <Button
            render={<Link href="/catalog/systems/new" />}
            nativeButton={false}
          >
            <Plus aria-hidden="true" />
            New system
          </Button>
        )}
      </div>

      <SearchBar defaultValue={q} placeholder="Search systems" />

      {rows.length === 0 ? (
        <EmptyState
          icon={
            <Boxes
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title={q ? "No systems match your search" : "No systems yet"}
          description={
            canEdit
              ? "Create a system to start mapping your catalog."
              : "Nobody has created a system yet."
          }
          action={
            canEdit &&
            !q && (
              <Button
                size="sm"
                render={<Link href="/catalog/systems/new" />}
                nativeButton={false}
              >
                New system
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((system) => (
            <Link key={system.id} href={`/catalog/systems/${system.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{system.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {system.services.length}{" "}
                      {system.services.length === 1 ? "service" : "services"}
                    </p>
                  </div>
                  {system.ownerTeam && (
                    <Badge variant="outline" className="shrink-0">
                      {system.ownerTeam.name}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
