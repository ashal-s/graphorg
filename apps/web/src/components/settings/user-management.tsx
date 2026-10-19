"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsSectionHeader } from "@/components/settings/setting-row";
import type { Role } from "@/lib/auth/roles";
import { assignableRoles, canManageRole } from "@/lib/auth/user-management";
import { messageFromApiError } from "@/lib/api/client-error";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Someone in the people directory who doesn't have an account yet. */
export interface MemberCandidate {
  id: string;
  name: string;
  email: string;
  title: string | null;
}

type AddMode = "directory" | "new";

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_HINTS: Record<Role, string> = {
  owner: "Full control, including other owners and admins.",
  admin: "Manages the workspace, members and all content.",
  editor: "Creates and edits content.",
  viewer: "Read-only access.",
};

/** Turns a failed API response into a message, preferring field-level detail. */
async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  const fieldErrors = body?.details as
    Record<string, string[] | undefined> | undefined;
  const first = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
  if (first) return first;
  return messageFromApiError(body);
}

function RoleOptions({ roles }: { roles: Role[] }) {
  return (
    <>
      {roles.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </>
  );
}

export function UserManagement({
  members,
  candidates = [],
  currentUserId,
  actorRole,
}: {
  members: Member[];
  /** Directory people who can be given an account. */
  candidates?: MemberCandidate[];
  currentUserId: string;
  actorRole: Role;
}) {
  const router = useRouter();
  const grantable = assignableRoles(actorRole);

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [addMode, setAddMode] = useState<AddMode>(
    candidates.length > 0 ? "directory" : "new",
  );
  const [personId, setPersonId] = useState("");
  const [addToDirectory, setAddToDirectory] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>(
    grantable.includes("viewer") ? "viewer" : (grantable[0] ?? "viewer"),
  );
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("viewer");

  const [dialogError, setDialogError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setDialogError(null);
    if (addMode === "directory" && !personId) {
      setDialogError("Pick a person from the directory.");
      return;
    }
    setAdding(true);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        addMode === "directory"
          ? { personId, password: newPassword, role: newRole }
          : {
              name: newName,
              email: newEmail,
              password: newPassword,
              role: newRole,
              addToDirectory,
            },
      ),
    });
    setAdding(false);
    if (!response.ok) {
      setDialogError(await errorMessage(response));
      return;
    }
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setPersonId("");
    setAddToDirectory(false);
    setShowAdd(false);
    router.refresh();
  }

  async function submitPasswordReset(event: React.FormEvent) {
    event.preventDefault();
    if (!resetTarget) return;
    setDialogError(null);
    setResetting(true);
    const response = await fetch(`/api/users/${resetTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    setResetting(false);
    if (!response.ok) {
      setDialogError(await errorMessage(response));
      return;
    }
    setResetTarget(null);
    setResetPassword("");
  }

  async function patchMember(id: string, payload: Record<string, string>) {
    setError(null);
    setBusyId(id);
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusyId(null);
    if (!response.ok) {
      setError(await errorMessage(response));
      return false;
    }
    router.refresh();
    return true;
  }

  async function saveEdit(event: React.FormEvent, member: Member) {
    event.preventDefault();
    const payload: Record<string, string> = {};
    if (editName.trim() !== member.name) payload.name = editName;
    if (editEmail.trim().toLowerCase() !== member.email) {
      payload.email = editEmail;
    }
    if (editRole !== member.role) payload.role = editRole;
    if (Object.keys(payload).length === 0) {
      setEditingId(null);
      return;
    }
    if (await patchMember(member.id, payload)) setEditingId(null);
  }

  async function removeMember(member: Member) {
    if (
      !window.confirm(
        `Remove ${member.name} (${member.email})? They will lose access immediately.`,
      )
    ) {
      return;
    }
    setError(null);
    setBusyId(member.id);
    const response = await fetch(`/api/users/${member.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!response.ok) {
      setError(await errorMessage(response));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <SettingsSectionHeader
        title="Members"
        description={`${members.length} ${members.length === 1 ? "member" : "members"} can sign in to this workspace.`}
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setDialogError(null);
              setShowAdd(true);
            }}
          >
            Add member
          </Button>
        }
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <div>
            <DialogTitle>Add a member</DialogTitle>
            <DialogDescription>
              Give someone in your directory access, or add someone new. Set an
              initial password and share it with them; they can sign in straight
              away.
            </DialogDescription>
          </div>
          <form onSubmit={addMember} className="flex flex-col gap-4">
            <div
              role="tablist"
              aria-label="Who to add"
              className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm"
            >
              {(
                [
                  ["directory", "From the directory"],
                  ["new", "Someone new"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={addMode === mode}
                  onClick={() => {
                    setAddMode(mode);
                    setDialogError(null);
                  }}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    addMode === mode
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {addMode === "directory" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-person">Person</Label>
                <SearchableSelect
                  id="new-person"
                  options={candidates.map((candidate) => ({
                    id: candidate.id,
                    label: `${candidate.name} · ${candidate.email}`,
                  }))}
                  value={personId}
                  onValueChange={setPersonId}
                  placeholder="Search people in your directory"
                  emptyLabel={
                    candidates.length === 0
                      ? "Everyone in the directory already has access."
                      : "No one matches."
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Their name and email come from the directory.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-name">Name</Label>
                  <Input
                    id="new-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addToDirectory}
                    onChange={(e) => setAddToDirectory(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  Also add them to the people directory
                </label>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Initial password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters, with a letter and a number.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-role">Role</Label>
              <NativeSelect
                id="new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
              >
                <RoleOptions roles={grantable} />
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                {ROLE_HINTS[newRole]}
              </p>
            </div>
            {dialogError && (
              <p role="alert" className="text-sm text-destructive">
                {dialogError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adding}>
                {adding ? "Adding…" : "Add member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setResetPassword("");
          }
        }}
      >
        <DialogContent>
          <div>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetTarget?.name}. Share it with them; it
              replaces their current one.
            </DialogDescription>
          </div>
          <form onSubmit={submitPasswordReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-password">New password</Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters, with a letter and a number.
              </p>
            </div>
            {dialogError && (
              <p role="alert" className="text-sm text-destructive">
                {dialogError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting ? "Saving…" : "Reset password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col divide-y divide-border">
        {members.map((member) => {
          const isSelf = member.id === currentUserId;
          const manageable = canManageRole(actorRole, member.role);
          const canEdit = manageable || isSelf;
          const busy = busyId === member.id;
          const roleChoices: Role[] = grantable.includes(member.role)
            ? grantable
            : [member.role, ...grantable];

          if (editingId === member.id) {
            return (
              <form
                key={member.id}
                onSubmit={(event) => saveEdit(event, member)}
                className="flex flex-col gap-3 py-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`edit-name-${member.id}`}>Name</Label>
                    <Input
                      id={`edit-name-${member.id}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`edit-email-${member.id}`}>Email</Label>
                    <Input
                      id={`edit-email-${member.id}`}
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                    />
                  </div>
                  {manageable && !isSelf && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`edit-role-${member.id}`}>Role</Label>
                      <NativeSelect
                        id={`edit-role-${member.id}`}
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as Role)}
                      >
                        <RoleOptions roles={roleChoices} />
                      </NativeSelect>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={busy}>
                    {busy ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={member.id}
              // Name and email take the space; the role and the actions each get
              // a fixed column, left-aligned, so they line up down the list.
              className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 pr-2 md:grid md:grid-cols-[minmax(0,1fr)_6rem_6.5rem]"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {member.name}
                  {isSelf && <Badge variant="secondary">You</Badge>}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {member.email}
                </p>
              </div>

              <div className="flex justify-start">
                <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
              </div>

              <div className="flex justify-start gap-1">
                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400"
                          aria-label={`Edit ${member.name}`}
                          onClick={() => {
                            setError(null);
                            setEditingId(member.id);
                            setEditName(member.name);
                            setEditEmail(member.email);
                            setEditRole(member.role);
                          }}
                        />
                      }
                    >
                      <Pencil aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                )}
                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-400"
                          aria-label={`Reset password for ${member.name}`}
                          onClick={() => {
                            setDialogError(null);
                            setResetPassword("");
                            setResetTarget(member);
                          }}
                        />
                      }
                    >
                      <KeyRound aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent>Reset password</TooltipContent>
                  </Tooltip>
                )}
                {/* Always shown; disabled for yourself and for anyone at or
                    above your own role, with the reason on hover. */}
                {manageable && !isSelf ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${member.name}`}
                          disabled={busy}
                          onClick={() => removeMember(member)}
                        />
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    {/* A disabled button gets no hover events, so the
                        tooltip hangs off a wrapper around it. */}
                    <TooltipTrigger
                      render={<span tabIndex={0} className="inline-flex" />}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        aria-label={`Remove ${member.name}`}
                        disabled
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isSelf
                        ? "You can't remove yourself"
                        : "You can't remove someone at or above your role"}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
