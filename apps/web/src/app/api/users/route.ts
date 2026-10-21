import bcrypt from "bcryptjs";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { people, users } from "@/db/schema";
import { isUniqueViolation } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import {
  assignableRoles,
  USER_MANAGEMENT_ROLE,
} from "@/lib/auth/user-management";

import { notifyMemberAdded } from "@/lib/email/resend";
import { logger } from "@/lib/logger";
import { uniqueSlug } from "@/lib/slugs";

import { publicUserColumns } from "./columns";
import { createUserSchema } from "./schema";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, USER_MANAGEMENT_ROLE)) {
    return jsonError(403, "Forbidden");
  }

  const rows = await getDb()
    .select(publicUserColumns)
    .from(users)
    .where(eq(users.organizationId, session.organizationId))
    .orderBy(asc(users.name));

  return NextResponse.json({ users: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, USER_MANAGEMENT_ROLE)) {
    return jsonError(403, "Forbidden");
  }

  const parsed = createUserSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const { password, personId, addToDirectory, role } = parsed.data;

  if (!assignableRoles(session.role).includes(role)) {
    return jsonError(403, `You can't grant the ${role} role`);
  }

  const db = getDb();

  // Someone already in the directory: their name and email are used, and the
  // new account is linked to their directory entry.
  let name = parsed.data.name ?? "";
  let email = parsed.data.email ?? "";
  if (personId) {
    const person = await db.query.people.findFirst({
      where: and(
        eq(people.id, personId),
        eq(people.organizationId, session.organizationId),
      ),
      columns: { id: true, name: true, email: true, userId: true },
    });
    if (!person) {
      return jsonError(
        400,
        "personId does not reference a person in this organization",
      );
    }
    if (person.userId) {
      return jsonError(409, "This person is already a member");
    }
    name = person.name;
    email = person.email;
  }

  try {
    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          name,
          email,
          role,
          organizationId: session.organizationId,
          passwordHash: await bcrypt.hash(password, 10),
        })
        .returning(publicUserColumns);
      if (!created) throw new Error("Failed to insert user");

      if (personId) {
        await tx
          .update(people)
          .set({ userId: created.id })
          .where(eq(people.id, personId));
      } else if (addToDirectory) {
        // Link to a matching directory entry if there is one, else add them.
        const existing = await tx.query.people.findFirst({
          where: and(
            eq(people.organizationId, session.organizationId),
            eq(people.email, email),
          ),
          columns: { id: true, userId: true },
        });
        if (existing) {
          if (!existing.userId) {
            await tx
              .update(people)
              .set({ userId: created.id })
              .where(eq(people.id, existing.id));
          }
        } else {
          await tx.insert(people).values({
            name,
            email,
            slug: await uniqueSlug(session.organizationId, name, tx),
            userId: created.id,
            organizationId: session.organizationId,
          });
        }
      }
      return created;
    });

    // Scaffold notify only — never include the password. The member row is
    // already committed; a mail failure must not turn this into a 500.
    try {
      await notifyMemberAdded({
        to: user.email,
        memberName: user.name,
        organizationName: session.organizationName,
        userId: user.id,
      });
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error.message : error,
          userId: user.id,
        },
        "member-added email failed",
      );
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A member with this email already exists");
    }
    throw error;
  }
}
