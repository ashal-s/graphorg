import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { services, tools } from "@/db/schema";

import { contextPaths } from "../paths";
import type { PageContext } from "../types";

export async function buildCatalog(orgId: string): Promise<PageContext> {
  const [serviceRows, toolRows] = await Promise.all([
    getDb().query.services.findMany({
      where: eq(services.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: asc(services.name),
    }),
    getDb().query.tools.findMany({
      where: eq(tools.organizationId, orgId),
      columns: { id: true, name: true, category: true },
      orderBy: asc(tools.name),
    }),
  ]);

  return {
    page: "Catalog",
    path: "/catalog",
    data: {
      serviceCount: serviceRows.length,
      toolCount: toolRows.length,
      services: serviceRows.map((s) => ({
        name: s.name,
        path: contextPaths.service(s.id),
      })),
      tools: toolRows.map((t) => ({
        name: t.name,
        category: t.category,
        path: contextPaths.tool(t.id),
      })),
    },
  };
}

export async function buildServices(orgId: string): Promise<PageContext> {
  const rows = await getDb().query.services.findMany({
    where: eq(services.organizationId, orgId),
    columns: { id: true, name: true, description: true },
    with: {
      ownerTeam: { columns: { name: true, slug: true } },
      parent: { columns: { id: true, name: true } },
      tools: { with: { tool: { columns: { id: true, name: true } } } },
    },
    orderBy: asc(services.name),
  });

  return {
    page: "Services",
    path: "/catalog/services",
    data: {
      count: rows.length,
      services: rows.map((s) => ({
        name: s.name,
        description: s.description,
        path: contextPaths.service(s.id),
        ownerTeam: s.ownerTeam && {
          name: s.ownerTeam.name,
          path: contextPaths.team(s.ownerTeam.slug),
        },
        parent: s.parent && {
          name: s.parent.name,
          path: contextPaths.service(s.parent.id),
        },
        tools: s.tools.map((l) => l.tool.name).sort(),
      })),
    },
  };
}

export async function buildTools(orgId: string): Promise<PageContext> {
  const rows = await getDb().query.tools.findMany({
    where: eq(tools.organizationId, orgId),
    columns: { id: true, name: true, category: true, vendor: true },
    orderBy: asc(tools.name),
  });

  return {
    page: "Tools",
    path: "/catalog/tools",
    data: {
      count: rows.length,
      tools: rows.map((t) => ({
        name: t.name,
        category: t.category,
        vendor: t.vendor,
        path: contextPaths.tool(t.id),
      })),
    },
  };
}

export async function buildService(
  orgId: string,
  id: string,
): Promise<PageContext | null> {
  const db = getDb();
  const service = await db.query.services.findFirst({
    where: and(eq(services.id, id), eq(services.organizationId, orgId)),
    with: {
      ownerTeam: { columns: { name: true, slug: true } },
      parent: { columns: { id: true, name: true } },
      children: { columns: { id: true, name: true } },
      tools: {
        with: { tool: { columns: { id: true, name: true, category: true } } },
      },
      assignees: {
        with: {
          person: { columns: { name: true, slug: true, title: true } },
        },
      },
      dependencies: {
        with: { dependsOnService: { columns: { id: true, name: true } } },
      },
      dependents: {
        with: { service: { columns: { id: true, name: true } } },
      },
    },
  });
  if (!service) return null;

  const byName = <T extends { name: string }>(a: T, b: T) =>
    a.name.localeCompare(b.name);
  const serviceRef = (s: { id: string; name: string }) => ({
    name: s.name,
    path: contextPaths.service(s.id),
  });

  return {
    page: service.name,
    path: contextPaths.service(service.id),
    data: {
      name: service.name,
      description: service.description,
      ownerTeam: service.ownerTeam && {
        name: service.ownerTeam.name,
        path: contextPaths.team(service.ownerTeam.slug),
      },
      parent: service.parent && serviceRef(service.parent),
      children: service.children.map(serviceRef).sort(byName),
      people: service.assignees
        .map((a) => ({
          name: a.person.name,
          title: a.person.title,
          path: contextPaths.person(a.person.slug),
        }))
        .sort(byName),
      tools: service.tools
        .map((l) => ({
          name: l.tool.name,
          category: l.tool.category,
          path: contextPaths.tool(l.tool.id),
        }))
        .sort(byName),
      dependsOn: service.dependencies
        .map((d) => serviceRef(d.dependsOnService))
        .sort(byName),
      dependedOnBy: service.dependents
        .map((d) => serviceRef(d.service))
        .sort(byName),
    },
  };
}

export async function buildTool(
  orgId: string,
  id: string,
): Promise<PageContext | null> {
  const db = getDb();
  const tool = await db.query.tools.findFirst({
    where: and(eq(tools.id, id), eq(tools.organizationId, orgId)),
  });
  if (!tool) return null;

  const links = await db.query.serviceTools.findMany({
    where: (row, { eq }) => eq(row.toolId, id),
    with: {
      service: { columns: { id: true, name: true, organizationId: true } },
    },
  });

  return {
    page: tool.name,
    path: contextPaths.tool(tool.id),
    data: {
      name: tool.name,
      category: tool.category,
      description: tool.description,
      vendor: tool.vendor,
      url: tool.url,
      usedBy: links
        .map((l) => l.service)
        .filter((s) => s.organizationId === orgId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ name: s.name, path: contextPaths.service(s.id) })),
    },
  };
}
