import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight, Boxes, Layers } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { services, systems } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

export default async function CatalogPage() {
  const session = await requireSession();
  const orgId = session.organizationId;

  const [systemsCount, servicesCount] = await Promise.all([
    getDb().query.systems.findMany({
      where: eq(systems.organizationId, orgId),
      columns: { id: true },
    }),
    getDb().query.services.findMany({
      where: eq(services.organizationId, orgId),
      columns: { id: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catalog"
        description="Systems, services, and the tech stack behind them."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/catalog/systems">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <Boxes
                className="h-6 w-6 text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle className="flex items-center justify-between">
                Systems
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </CardTitle>
              <CardDescription>
                {systemsCount.length}{" "}
                {systemsCount.length === 1 ? "system" : "systems"}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/catalog/services">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <Layers
                className="h-6 w-6 text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle className="flex items-center justify-between">
                Services
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </CardTitle>
              <CardDescription>
                {servicesCount.length}{" "}
                {servicesCount.length === 1 ? "service" : "services"}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
