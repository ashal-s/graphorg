import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight, Layers, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { services, tools } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { lowerLabel } from "@/lib/terminology";
import { getTerminology } from "@/lib/terminology-server";

export default async function CatalogPage() {
  const session = await requireSession();
  const orgId = session.organizationId;

  const [terminology, serviceRows, toolRows] = await Promise.all([
    getTerminology(orgId),
    getDb().query.services.findMany({
      where: eq(services.organizationId, orgId),
      columns: { id: true },
    }),
    getDb().query.tools.findMany({
      where: eq(tools.organizationId, orgId),
      columns: { id: true },
    }),
  ]);

  const sections = [
    {
      href: "/catalog/services",
      icon: Layers,
      terms: terminology.services,
      count: serviceRows.length,
    },
    {
      href: "/catalog/tools",
      icon: Wrench,
      terms: terminology.tools,
      count: toolRows.length,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catalog"
        description={`${terminology.services.plural} and ${lowerLabel(terminology.tools.plural)} across your organization.`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ href, icon: Icon, terms, count }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <Icon
                  className="h-6 w-6 text-muted-foreground"
                  aria-hidden="true"
                />
                <CardTitle className="flex items-center justify-between">
                  {terms.plural}
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {count} {count === 1 ? terms.singular : terms.plural}
                </p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
