import { users } from "@/db/schema";

/** The user fields safe to return from the API; never includes `passwordHash`. */
export const publicUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
};
