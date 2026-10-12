import { sql } from "drizzle-orm";

import type { Database } from "@/db";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Anything that can run raw SQL: the database or a transaction. */
type Exec = Pick<Database, "execute">;

/**
 * The join tables that carry an `is_primary` flag. `owner` is the side that
 * has the one primary (a team's primary department, a person's primary
 * department or primary team); `other` is what it points at.
 */
const LINKS = {
  "team-departments": {
    table: "department_teams",
    owner: "team_id",
    other: "department_id",
  },
  "person-departments": {
    table: "department_people",
    owner: "person_id",
    other: "department_id",
  },
  "person-teams": {
    table: "team_members",
    owner: "person_id",
    other: "team_id",
  },
} as const;

export type LinkKind = keyof typeof LINKS;

/** The requested primary isn't among the owner's links. */
export class PrimaryNotLinkedError extends Error {
  constructor() {
    super("the primary must be one of the selected items");
  }
}

/**
 * Makes `ownerId` have exactly one primary link, if it has any links at all.
 * `primaryOtherId` picks it; without one, the current primary is kept, or the
 * first link (by id) becomes primary when there is none. Throws
 * `PrimaryNotLinkedError` if the requested primary isn't linked.
 */
export async function settlePrimary(
  tx: Exec,
  kind: LinkKind,
  ownerId: string,
  primaryOtherId?: string | null,
): Promise<void> {
  const { table, owner, other } = LINKS[kind];
  const t = sql.identifier(table);
  const ownerCol = sql.identifier(owner);
  const otherCol = sql.identifier(other);

  const rows = await tx.execute<{ other: string; is_primary: boolean }>(
    sql`select ${otherCol} as other, is_primary from ${t}
        where ${ownerCol} = ${ownerId} order by ${otherCol}`,
  );
  const links = Array.from(rows);
  if (links.length === 0) return;

  let primary = primaryOtherId ?? undefined;
  if (primary !== undefined && !links.some((l) => l.other === primary)) {
    throw new PrimaryNotLinkedError();
  }
  primary ??= links.find((l) => l.is_primary)?.other ?? links[0]!.other;

  const current = links.filter((l) => l.is_primary);
  if (current.length === 1 && current[0]!.other === primary) return;

  // Clear first: the unique index allows only one primary at a time.
  await tx.execute(
    sql`update ${t} set is_primary = false where ${ownerCol} = ${ownerId}`,
  );
  await tx.execute(
    sql`update ${t} set is_primary = true
        where ${ownerCol} = ${ownerId} and ${otherCol} = ${primary}`,
  );
}

/**
 * Replaces everything linked to `ownerId` with `otherIds` in a
 * `department_teams`/`department_people` style table, keeping the flag on
 * links that stay, then settles the primary.
 */
export async function replaceLinks(
  tx: Tx,
  kind: "team-departments" | "person-departments",
  ownerId: string,
  otherIds: string[],
  primaryOtherId?: string | null,
): Promise<void> {
  const { table, owner, other } = LINKS[kind];
  const t = sql.identifier(table);
  const ownerCol = sql.identifier(owner);
  const otherCol = sql.identifier(other);
  const unique = [...new Set(otherIds)];

  if (unique.length === 0) {
    await tx.execute(sql`delete from ${t} where ${ownerCol} = ${ownerId}`);
    return;
  }
  const list = sql.join(
    unique.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  await tx.execute(
    sql`delete from ${t} where ${ownerCol} = ${ownerId}
        and ${otherCol} not in (${list})`,
  );
  await tx.execute(
    sql`insert into ${t} (${ownerCol}, ${otherCol})
        select ${ownerId}::uuid, v from unnest(array[${list}]) as v
        on conflict do nothing`,
  );
  await settlePrimary(tx, kind, ownerId, primaryOtherId);
}

/**
 * From the department side: makes `ownerIds` exactly the teams (or people)
 * in `departmentId`. Anyone added with no primary yet gets this department
 * as primary, and anyone who loses their primary here is given another.
 */
export async function replaceDepartmentMembers(
  tx: Tx,
  kind: "team-departments" | "person-departments",
  departmentId: string,
  ownerIds: string[],
): Promise<void> {
  const { table, owner } = LINKS[kind];
  const t = sql.identifier(table);
  const ownerCol = sql.identifier(owner);
  const unique = [...new Set(ownerIds)];

  const before = Array.from(
    await tx.execute<{ owner: string }>(
      sql`select ${ownerCol} as owner from ${t} where department_id = ${departmentId}`,
    ),
  ).map((row) => row.owner);

  // Diff rather than delete-and-reinsert, so links that stay keep their flag.
  if (unique.length === 0) {
    await tx.execute(
      sql`delete from ${t} where department_id = ${departmentId}`,
    );
  } else {
    const list = sql.join(
      unique.map((id) => sql`${id}::uuid`),
      sql`, `,
    );
    await tx.execute(
      sql`delete from ${t} where department_id = ${departmentId}
          and ${ownerCol} not in (${list})`,
    );
    await tx.execute(
      sql`insert into ${t} (department_id, ${ownerCol})
          select ${departmentId}::uuid, v from unnest(array[${list}]) as v
          on conflict do nothing`,
    );
  }

  // Added people may have no primary yet; removed ones may have lost theirs.
  const affected = new Set([...before, ...unique]);
  for (const ownerId of affected) {
    await settlePrimary(tx, kind, ownerId);
  }
}

/**
 * Applies the department and primary choices from a person create/update
 * body, after `setPersonTeams` has set their teams. Fields left out keep
 * what they have; a primary that no longer fits is replaced.
 */
export async function applyPersonPrimaries(
  tx: Tx,
  personId: string,
  input: {
    teamsChanged: boolean;
    primaryTeamId?: string | null;
    departmentIds?: string[];
    primaryDepartmentId?: string | null;
  },
): Promise<void> {
  if (input.teamsChanged || input.primaryTeamId !== undefined) {
    await settlePrimary(tx, "person-teams", personId, input.primaryTeamId);
  }
  if (input.departmentIds) {
    await replaceLinks(
      tx,
      "person-departments",
      personId,
      input.departmentIds,
      input.primaryDepartmentId,
    );
  } else if (input.primaryDepartmentId !== undefined) {
    await settlePrimary(
      tx,
      "person-departments",
      personId,
      input.primaryDepartmentId,
    );
  }
}

/**
 * Puts each of `personIds` directly in the department if they aren't
 * already (used so a department's heads are always among its people).
 * Anyone already there keeps their flag; a newcomer with no primary
 * department yet gets this one.
 */
export async function addDepartmentPeople(
  tx: Tx,
  departmentId: string,
  personIds: string[],
): Promise<void> {
  const unique = [...new Set(personIds)];
  if (unique.length === 0) return;

  const list = sql.join(
    unique.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  await tx.execute(
    sql`insert into department_people (department_id, person_id)
        select ${departmentId}::uuid, v from unnest(array[${list}]) as v
        on conflict do nothing`,
  );
  for (const personId of unique) {
    await settlePrimary(tx, "person-departments", personId);
  }
}
