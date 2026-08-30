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
import { serviceTechnologies, technologies } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TechnologyDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const orgId = session.organizationId;
  const [technology, links] = await Promise.all([
    getDb().query.technologies.findFirst({
      where: and(
        eq(technologies.id, id),
        eq(technologies.organizationId, orgId),
      ),
    }),
    getDb().query.serviceTechnologies.findMany({
      where: eq(serviceTechnologies.technologyId, id),
      with: {
        service: {
          columns: { id: true, name: true, organizationId: true },
        },
      },
    }),
  ]);

  if (!technology) notFound();

  const relatedServices = links
    .map((link) => link.service)
    .filter((service) => service.organizationId === orgId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {technology.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          <Badge variant="outline">{technology.category}</Badge>
          {technology.description ? ` ${technology.description}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            {relatedServices.length === 0
              ? "No services use this technology yet."
              : `${relatedServices.length} service${relatedServices.length === 1 ? "" : "s"} use this technology.`}
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
    </div>
  );
}
