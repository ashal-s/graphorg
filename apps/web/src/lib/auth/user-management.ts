import { hasRole, type Role } from "@/lib/auth/roles";

export const ROLES: readonly Role[] = ["owner", "admin", "editor", "viewer"];

/** Minimum role allowed to list, add, edit and remove workspace members. */
export const USER_MANAGEMENT_ROLE: Role = "admin";

/**
 * The roles `actor` may grant. Owners can grant any role; admins can grant
 * only roles below their own, so an admin can't mint another admin or an
 * owner (or promote themselves by proxy).
 */
export function assignableRoles(actor: Role): Role[] {
  if (!hasRole(actor, USER_MANAGEMENT_ROLE)) return [];
  if (actor === "owner") return [...ROLES];
  return ROLES.filter((role) => !hasRole(role, actor));
}

/**
 * Whether `actor` may edit or remove an existing member who currently holds
 * `target`. Owners can manage anyone; admins can manage only members below
 * admin, so admins can't edit, demote or remove each other or an owner.
 */
export function canManageRole(actor: Role, target: Role): boolean {
  if (!hasRole(actor, USER_MANAGEMENT_ROLE)) return false;
  return actor === "owner" || !hasRole(target, actor);
}
