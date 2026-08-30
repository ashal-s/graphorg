import { eq } from "drizzle-orm";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Cpu,
  Layers,
  LayoutDashboard,
  Users,
  Users2,
  Workflow as WorkflowIcon,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import {
  people,
  services,
  systems,
  teams,
  technologies,
  tools,
  workflows,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const TECHNOLOGY_CATEGORY_LABELS: Record<string, string> = {
  language: "Languages",
  framework: "Frameworks",
  database: "Databases",
  infrastructure: "Infrastructure",
  other: "Other",
};

export default async function OverviewPage() {
  const session = await requireSession();
  const orgId = session.organizationId;

  const [
    peopleRows,
    teamRows,
    systemRows,
    serviceRows,
    workflowRows,
    technologyRows,
    toolRows,
  ] = await Promise.all([
    getDb().query.people.findMany({
      where: eq(people.organizationId, orgId),
      columns: { id: true },
    }),
    getDb().query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true },
    }),
    getDb().query.systems.findMany({
      where: eq(systems.organizationId, orgId),
      columns: { id: true },
    }),
    getDb().query.services.findMany({
      where: eq(services.organizationId, orgId),
      columns: { id: true },
      with: {
        technologies: {
          with: { technology: { columns: { id: true, name: true } } },
        },
      },
    }),
    getDb().query.workflows.findMany({
      where: eq(workflows.organizationId, orgId),
      columns: { id: true },
    }),
    getDb().query.technologies.findMany({
      where: eq(technologies.organizationId, orgId),
      columns: { id: true, category: true },
    }),
    getDb().query.tools.findMany({
      where: eq(tools.organizationId, orgId),
      columns: { id: true },
    }),
  ]);

  const stats: Array<{
    label: string;
    singular: string;
    plural: string;
    count: number;
    icon: LucideIcon;
    href?: string;
  }> = [
    {
      label: "People",
      singular: "person",
      plural: "people",
      count: peopleRows.length,
      icon: Users,
      href: "/directory/people",
    },
    {
      label: "Teams",
      singular: "team",
      plural: "teams",
      count: teamRows.length,
      icon: Users2,
      href: "/directory/teams",
    },
    {
      label: "Systems",
      singular: "system",
      plural: "systems",
      count: systemRows.length,
      icon: Boxes,
      href: "/catalog/systems",
    },
    {
      label: "Services",
      singular: "service",
      plural: "services",
      count: serviceRows.length,
      icon: Layers,
      href: "/catalog/services",
    },
    {
      label: "Workflows",
      singular: "workflow",
      plural: "workflows",
      count: workflowRows.length,
      icon: WorkflowIcon,
      href: "/workflows",
    },
    {
      label: "Technologies",
      singular: "technology",
      plural: "technologies",
      count: technologyRows.length,
      icon: Cpu,
    },
    {
      label: "Tools",
      singular: "tool",
      plural: "tools",
      count: toolRows.length,
      icon: Wrench,
    },
  ];

  const hasAnyContext = stats.some((stat) => stat.count > 0);

  if (!hasAnyContext) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Overview"
          description={`An overview of ${session.organizationName} lands here once it exists.`}
        />
        <EmptyState
          icon={
            <LayoutDashboard
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title="No context yet"
          description="People, teams, tools and services you add will summarize here."
        />
      </div>
    );
  }

  const categoryBreakdown = Object.entries(
    technologyRows.reduce<Record<string, number>>((acc, tech) => {
      acc[tech.category] = (acc[tech.category] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([category, count]) => ({
      category,
      label: TECHNOLOGY_CATEGORY_LABELS[category] ?? category,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const maxCategoryCount = Math.max(
    1,
    ...categoryBreakdown.map((c) => c.count),
  );

  const usageByTechnology = new Map<string, { name: string; count: number }>();
  for (const service of serviceRows) {
    for (const link of service.technologies) {
      const existing = usageByTechnology.get(link.technology.id);
      if (existing) {
        existing.count += 1;
      } else {
        usageByTechnology.set(link.technology.id, {
          name: link.technology.name,
          count: 1,
        });
      }
    }
  }
  const mostUsedTechnologies = Array.from(usageByTechnology.values()).sort(
    (a, b) => b.count - a.count,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description={`The whole of ${session.organizationName} in one view: who's here, what runs, and how it's built.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const card = (
            <Card
              className={cn(
                "h-full",
                stat.href && "transition-colors hover:bg-muted/50",
              )}
            >
              <CardHeader>
                <Icon
                  className="h-6 w-6 text-muted-foreground"
                  aria-hidden="true"
                />
                <CardTitle className="flex items-center justify-between">
                  {stat.label}
                  {stat.href && (
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </CardTitle>
                <CardDescription>
                  {stat.count} {stat.count === 1 ? stat.singular : stat.plural}
                </CardDescription>
              </CardHeader>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>

      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Technology stack</CardTitle>
            <CardDescription>
              {technologyRows.length}{" "}
              {technologyRows.length === 1 ? "technology" : "technologies"} in
              the catalog, by category.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {categoryBreakdown.map((entry) => (
                <div key={entry.category} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-muted-foreground">
                    {entry.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(entry.count / maxCategoryCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-sm font-medium">
                    {entry.count}
                  </span>
                </div>
              ))}
            </div>
            {mostUsedTechnologies.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Most used in services</p>
                <div className="flex flex-wrap gap-1.5">
                  {mostUsedTechnologies.map((tech) => (
                    <Badge key={tech.name} variant="secondary">
                      {tech.name} · {tech.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
