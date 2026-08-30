import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { RelatedRecordLink } from "@/components/directory/related-record-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { repositories, services } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RepositoryDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const [repository, relatedServices] = await Promise.all([
    getDb().query.repositories.findFirst({
      where: and(
        eq(repositories.id, id),
        eq(repositories.organizationId, orgId),
      ),
      with: { ownerTeam: { columns: { id: true, name: true } } },
    }),
    getDb().query.services.findMany({
      where: and(
        eq(services.repositoryId, id),
        eq(services.organizationId, orgId),
      ),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  if (!repository) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {repository.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Source repository in the organisation catalog.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Owner team</CardTitle>
          <CardDescription>
            {repository.ownerTeam
              ? "Team that owns this repository."
              : "No owner team set."}
          </CardDescription>
        </CardHeader>
        {repository.ownerTeam && (
          <CardContent>
            <RelatedRecordLink
              href={`/directory/teams/${repository.ownerTeam.id}`}
            >
              {repository.ownerTeam.name}
            </RelatedRecordLink>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            {relatedServices.length === 0
              ? "No services are linked to this repository."
              : `${relatedServices.length} service${relatedServices.length === 1 ? "" : "s"} linked to this repository.`}
          </CardDescription>
        </CardHeader>
        {relatedServices.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {relatedServices.map((service) => (
              <RelatedRecordLink
                key={service.id}
                href={`/catalog/services/${service.id}`}
              >
                {service.name}
              </RelatedRecordLink>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remote</CardTitle>
          <CardDescription>
            {repository.url
              ? "External repository URL."
              : "No remote URL recorded."}
          </CardDescription>
        </CardHeader>
        {repository.url && (
          <CardContent>
            <a
              href={repository.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
            >
              {repository.url}
            </a>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
