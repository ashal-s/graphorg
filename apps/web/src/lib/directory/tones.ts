import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { departments, people, teams } from "@/db/schema";
import { assignTones } from "@/lib/palette";

/**
 * Palette positions for every team, person and department in an organization,
 * by the order they were created in, so colours spread out evenly and stay put.
 */
export async function loadTones(organizationId: string): Promise<{
  teams: Record<string, number>;
  people: Record<string, number>;
  departments: Record<string, number>;
}> {
  const db = getDb();
  const [teamRows, peopleRows, departmentRows] = await Promise.all([
    db
      .select({ id: teams.id, createdAt: teams.createdAt })
      .from(teams)
      .where(eq(teams.organizationId, organizationId)),
    db
      .select({ id: people.id, createdAt: people.createdAt })
      .from(people)
      .where(eq(people.organizationId, organizationId)),
    db
      .select({ id: departments.id, createdAt: departments.createdAt })
      .from(departments)
      .where(eq(departments.organizationId, organizationId)),
  ]);
  return {
    teams: assignTones(teamRows),
    people: assignTones(peopleRows),
    departments: assignTones(departmentRows),
  };
}
