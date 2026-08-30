import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { RelatedRecordLink } from "@/components/directory/related-record-link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const document = await getDb().query.documents.findFirst({
    where: and(
      eq(documents.id, id),
      eq(documents.organizationId, session.organizationId),
    ),
    with: { ownerTeam: { columns: { id: true, name: true } } },
  });
  if (!document) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {document.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          <Badge variant="outline">{document.type}</Badge>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Managed by</CardTitle>
          <CardDescription>
            {document.ownerTeam
              ? "Team that manages this document."
              : "No owner team set."}
          </CardDescription>
        </CardHeader>
        {document.ownerTeam && (
          <CardContent>
            <RelatedRecordLink
              href={`/directory/teams/${document.ownerTeam.id}`}
            >
              {document.ownerTeam.name}
            </RelatedRecordLink>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Source</CardTitle>
          <CardDescription>
            {document.url
              ? "External document URL."
              : "No URL recorded for this document."}
          </CardDescription>
        </CardHeader>
        {document.url && (
          <CardContent>
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
            >
              {document.url}
            </a>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
