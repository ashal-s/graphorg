"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { getDb } from "@/db";
import { organizations, users } from "@/db/schema";
import {
  resolveLoginWorkspaces,
  TooManyLoginCandidatesError,
} from "@/lib/auth/resolve-login";
import {
  loginCredentialsSchema,
  loginSchema,
  signupSchema,
} from "@/lib/auth/schemas";
import { slugify } from "@/lib/utils";

export interface FormState {
  errors?: Record<string, string[]>;
  message?: string;
  /** Set when email+password match more than one workspace: pick one to continue. */
  workspaces?: Array<{ slug: string; name: string }>;
}

export async function login(
  _prevState: FormState | undefined,
  formData: FormData,
): Promise<FormState | undefined> {
  const credentials = loginCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!credentials.success) {
    return { errors: credentials.error.flatten().fieldErrors };
  }

  const workspaceRaw = formData.get("workspace");
  const workspaceHint =
    typeof workspaceRaw === "string" ? workspaceRaw.trim().toLowerCase() : "";

  let workspace = workspaceHint;
  if (!workspace) {
    let matches;
    try {
      matches = await resolveLoginWorkspaces(
        credentials.data.email,
        credentials.data.password,
      );
    } catch (error) {
      if (error instanceof TooManyLoginCandidatesError) {
        return {
          message:
            "This email is linked to too many workspaces. Switch from a workspace you already use, or sign in with that workspace selected.",
        };
      }
      console.error("[auth] resolve login workspaces failed", error);
      return {
        message: "Sign-in is unavailable right now. Please try again later.",
      };
    }
    if (matches.length === 0) {
      return { message: "Invalid email or password." };
    }
    if (matches.length > 1) {
      return { workspaces: matches };
    }
    workspace = matches[0]!.slug;
  }

  const parsed = loginSchema.safeParse({
    ...credentials.data,
    workspace,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { message: "Invalid email or password." };
      }
      // Anything else (database down, missing AUTH_SECRET, ...) is our
      // fault, not the user's. Say so, and leave the cause in the logs
      // instead of blaming their password.
      console.error("[auth] sign-in failed", error.type, error.cause);
      return {
        message: "Sign-in is unavailable right now. Please try again later.",
      };
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

/**
 * Moves to another workspace: accounts belong to one organization each, so
 * this signs out and opens sign-in with that workspace pre-selected.
 */
export async function switchWorkspace(slug: string) {
  const workspace = slugify(slug);
  await signOut({
    redirectTo: workspace
      ? `/login?workspace=${encodeURIComponent(workspace)}`
      : "/login",
  });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
