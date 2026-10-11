import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isUniqueViolation } from "@/lib/api/db-errors";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
  requireUuidParam,
} from "@/lib/api/http";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import {
  assignableRoles,
  canManageRole,
  USER_MANAGEMENT_ROLE,
} from "@/lib/auth/user-management";

import { publicUserColumns } from "../columns";
import { updateUserSchema } from "../schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, USER_MANAGEMENT_ROLE)) {
    return jsonError(403, "Forbidden");
  }

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const target = await db.query.users.findFirst({
    where: and(
      eq(users.id, id),
      eq(users.organizationId, session.organizationId),
    ),
    columns: { id: true, role: true },
  });
  if (!target) return jsonError(404, "User not found");

  const isSelf = target.id === session.userId;
  // Members may always edit their own profile fields, but never their own
  // role: that would let an admin promote themselves, or an owner leave the
  // workspace without one.
  if (!isSelf && !canManageRole(session.role, target.role)) {
    return jsonError(403, "You can't manage this member");
  }

  const parsed = updateUserSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;
  const { password, role, ...rest } = parsed.data;

  if (role !== undefined && role !== target.role) {
    if (isSelf) return jsonError(400, "You can't change your own role");
    if (!assignableRoles(session.role).includes(role)) {
      return jsonError(403, `You can't grant the ${role} role`);
    }
  }

  const values: Partial<typeof users.$inferInsert> = { ...rest };
  if (role !== undefined) values.role = role;
  if (password !== undefined) {
    values.passwordHash = await bcrypt.hash(password, 10);
  }

  try {
    const [user] = await db
      .update(users)
      .set(values)
      .where(
        and(eq(users.id, id), eq(users.organizationId, session.organizationId)),
      )
      .returning(publicUserColumns);
    return NextResponse.json({ user });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A member with this email already exists");
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, USER_MANAGEMENT_ROLE)) {
    return jsonError(403, "Forbidden");
  }

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  if (id === session.userId) {
    return jsonError(400, "You can't remove your own account");
  }

  const db = getDb();
  const target = await db.query.users.findFirst({
    where: and(
      eq(users.id, id),
      eq(users.organizationId, session.organizationId),
    ),
    columns: { id: true, role: true },
  });
  if (!target) return jsonError(404, "User not found");
  if (!canManageRole(session.role, target.role)) {
    return jsonError(403, "You can't manage this member");
  }

  await db
    .delete(users)
    .where(
      and(eq(users.id, id), eq(users.organizationId, session.organizationId)),
    );
  return new NextResponse(null, { status: 204 });
}
