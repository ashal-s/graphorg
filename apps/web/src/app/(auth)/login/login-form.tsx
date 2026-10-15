"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

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

  const workspaces = state?.workspaces;
  const choosingWorkspace = Boolean(workspaces && workspaces.length > 1);

  useEffect(() => {
    if (!workspaces?.length) return;
    setPicked((current) =>
      current && workspaces.some((w) => w.slug === current)
        ? current
        : workspaces[0]!.slug,
    );
  }, [workspaces]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to GraphOrg</CardTitle>
        <CardDescription>
          {choosingWorkspace
            ? "That email belongs to more than one workspace. Choose which one to open."
            : "Enter your email and password."}
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="flex flex-col gap-4 pb-(--card-spacing)">
          <input type="hidden" name="from" value={from} />
          {choosingWorkspace ? (
            <>
              <input type="hidden" name="workspace" value={picked} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Workspace</legend>
                {workspaces!.map((option) => (
                  <button
                    key={option.slug}
                    type="button"
                    onClick={() => setPicked(option.slug)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-colors",
                      picked === option.slug
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
          ) : workspace ? (
            <input type="hidden" name="workspace" value={workspace} />
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
            disabled={pending || (choosingWorkspace && !picked)}
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
