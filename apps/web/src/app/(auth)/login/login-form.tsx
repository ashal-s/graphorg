"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { login } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LoginForm({
  from,
  workspace = "",
}: {
  from: string;
  /** Pre-selects a workspace, e.g. after choosing one from the switcher. */
  workspace?: string;
}) {
  const [state, action, pending] = useActionState(login, undefined);
  const [picked, setPicked] = useState(workspace);
  // Controlled so credentials survive the re-render after a multi-workspace
  // response (uncontrolled fields reset when the form action settles).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState(workspace);

  const workspaces = state?.workspaces;
  const choosingWorkspace = Boolean(workspaces && workspaces.length > 1);
  const needWorkspaceField =
    Boolean(state?.needWorkspace) || Boolean(workspace);
  // Prefer the user's click; otherwise the first match (no effect needed).
  const selectedWorkspace =
    choosingWorkspace && workspaces
      ? picked && workspaces.some((option) => option.slug === picked)
        ? picked
        : workspaces[0]!.slug
      : picked;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to GraphOrg</CardTitle>
        <CardDescription>
          {choosingWorkspace
            ? "That email belongs to more than one workspace. Choose which one to open."
            : state?.needWorkspace
              ? "Enter your workspace slug, email and password."
              : "Enter your email and password."}
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="flex flex-col gap-4 pb-(--card-spacing)">
          <input type="hidden" name="from" value={from} />
          {choosingWorkspace ? (
            <>
              <input type="hidden" name="workspace" value={selectedWorkspace} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Workspace</legend>
                {workspaces!.map((option) => (
                  <button
                    key={option.slug}
                    type="button"
                    onClick={() => setPicked(option.slug)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selectedWorkspace === option.slug
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <span className="block text-sm font-medium">
                      {option.name}
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {option.slug}
                    </span>
                  </button>
                ))}
              </fieldset>
            </>
          ) : needWorkspaceField ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workspace">Workspace</Label>
              <Input
                id="workspace"
                name="workspace"
                value={workspaceSlug}
                onChange={(event) => setWorkspaceSlug(event.target.value)}
                placeholder="acme"
                autoComplete="organization"
                required={Boolean(state?.needWorkspace)}
              />
              {state?.errors?.workspace && (
                <p className="text-xs text-destructive">
                  {state.errors.workspace[0]}
                </p>
              )}
            </div>
          ) : null}
          <div
            className={cn(
              "flex flex-col gap-1.5",
              choosingWorkspace && "sr-only",
            )}
          >
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {state?.errors?.email && (
              <p className="text-xs text-destructive">
                {state.errors.email[0]}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex flex-col gap-1.5",
              choosingWorkspace && "sr-only",
            )}
          >
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {state?.errors?.password && (
              <p className="text-xs text-destructive">
                {state.errors.password[0]}
              </p>
            )}
          </div>
          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          <Button
            type="submit"
            disabled={pending || (choosingWorkspace && !selectedWorkspace)}
            className="w-full"
          >
            {pending
              ? "Signing in..."
              : choosingWorkspace
                ? "Continue"
                : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            No workspace yet?{" "}
            <Link
              href="/signup"
              className="text-primary underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
