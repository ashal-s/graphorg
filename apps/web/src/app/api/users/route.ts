import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isUniqueViolation } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import {
  assignableRoles,
  USER_MANAGEMENT_ROLE,
} from "@/lib/auth/user-management";

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
  const { password, ...rest } = parsed.data;

  if (!assignableRoles(session.role).includes(rest.role)) {
    return jsonError(403, `You can't grant the ${rest.role} role`);
  }

  try {
    const [user] = await getDb()
      .insert(users)
      .values({
        ...rest,
        organizationId: session.organizationId,
        passwordHash: await bcrypt.hash(password, 10),
      })
      .returning(publicUserColumns);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A member with this email already exists");
    }
    throw error;
  }
}
