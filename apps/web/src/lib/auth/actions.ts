"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { getDb } from "@/db";
import { organizations, users } from "@/db/schema";
import { loginSchema, signupSchema } from "@/lib/auth/schemas";
import { slugify } from "@/lib/utils";

export interface FormState {
  errors?: Record<string, string[]>;
  message?: string;
}

export async function login(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState | undefined> {
  const parsed = loginSchema.safeParse({
    workspace: formData.get("workspace"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Invalid workspace, email or password." };
    }
    throw error;
  }

  const from = formData.get("from");
  redirect(typeof from === "string" && from.startsWith("/") ? from : "/");
}

export async function signup(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState | undefined> {
  const parsed = signupSchema.safeParse({
    organizationName: formData.get("organizationName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { organizationName, name, email, password } = parsed.data;

  const slug = slugify(organizationName);
  if (!slug) {
    return {
      errors: {
        organizationName: ["Use at least one letter or number."],
      },
    };
  }

  const db = getDb();
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (existing) {
    return {
      message: `The workspace "${slug}" already exists. Try a different organisation name.`,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: organizationName, slug })
      .returning();
    if (!org) throw new Error("Failed to create organization");

    await tx.insert(users).values({
      organizationId: org.id,
      email,
      name,
      passwordHash,
      role: "owner",
    });
  });

  try {
    await signIn("credentials", {
      workspace: slug,
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        message: "Workspace created. Sign in with your new account.",
      };
    }
    throw error;
  }

  redirect("/");
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
