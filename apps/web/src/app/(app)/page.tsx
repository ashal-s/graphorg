import { eq } from "drizzle-orm";
import Link from "next/link";
import {
  ArrowUpRight,
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

import { EmptyState } from "@/components/states/empty-state";
import { OrganizationLogo } from "@/components/shared/organization-logo";
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
  organizations,
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

function OrganizationHero({
  name,
  description,
  logoUrl,
}: {
  name: string;
  description: string | null;
  logoUrl: string | null;
}) {
  return (
    <header className="flex items-center gap-5">
      <OrganizationLogo name={name} logoUrl={logoUrl} />
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {name}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description ||
            "The whole organization in one view: who's here, what runs, and how it's built."}
        </p>
      </div>
    </header>
  );
}

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
    organization,
    peopleRows,
    teamRows,
    systemRows,
    serviceRows,
    workflowRows,
    technologyRows,
    toolRows,
  ] = await Promise.all([
    getDb().query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { name: true, description: true, logoUrl: true },
    }),
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

  const hero = (
    <OrganizationHero
      name={organization?.name ?? session.organizationName}
      description={organization?.description ?? null}
      logoUrl={organization?.logoUrl ?? null}
    />
  );

  const hasAnyContext = stats.some((stat) => stat.count > 0);

  if (!hasAnyContext) {
    return (
      <div className="flex flex-col gap-6">
        {hero}
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
      {hero}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const body = (
            <>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {stat.label}
                {stat.href && (
                  <ArrowUpRight
                    className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="mt-2 block text-3xl font-semibold tracking-tight tabular-nums">
                {stat.count}
              </span>
            </>
          );
          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className={cn(
                "group bg-background p-5 outline-none transition-colors",
                "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              )}
            >
              {body}
            </Link>
          ) : (
            <div key={stat.label} className="bg-background p-5">
              {body}
            </div>
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
