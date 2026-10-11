"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SettingsSectionHeader } from "@/components/settings/setting-row";
import type { Role } from "@/lib/auth/roles";
import { assignableRoles, canManageRole } from "@/lib/auth/user-management";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}

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
  return typeof body?.error === "string"
    ? body.error
    : "Something went wrong. Please try again.";
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
  currentUserId,
  actorRole,
}: {
  members: Member[];
  currentUserId: string;
  actorRole: Role;
}) {
  const router = useRouter();
  const grantable = assignableRoles(actorRole);

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
  const [editPassword, setEditPassword] = useState("");

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setAdding(true);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      }),
    });
    setAdding(false);
    if (!response.ok) {
      setError(await errorMessage(response));
      return;
    }
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setShowAdd(false);
    router.refresh();
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
    if (editPassword) payload.password = editPassword;
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
    <div className="flex flex-col gap-6">
      <SettingsSectionHeader
        title="Members"
        description={`${members.length} ${members.length === 1 ? "member" : "members"} can sign in to this workspace.`}
        actions={
          <Button
            type="button"
            size="sm"
            variant={showAdd ? "outline" : "default"}
            onClick={() => setShowAdd((open) => !open)}
          >
            {showAdd ? "Cancel" : "Add member"}
          </Button>
        }
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {showAdd && (
        <form
          onSubmit={addMember}
          className="flex flex-col gap-4 border-b border-border py-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
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
                At least 8 characters, with a letter and a number. Share it with
                them; they can sign in straight away.
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
          </div>
          <div>
            <Button type="submit" disabled={adding}>
              {adding ? "Adding…" : "Add member"}
            </Button>
          </div>
        </form>
      )}

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
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`edit-password-${member.id}`}>
                    New password
                  </Label>
                  <Input
                    id={`edit-password-${member.id}`}
                    type="password"
                    autoComplete="new-password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep the current password"
                  />
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
              className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
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

              {manageable && !isSelf ? (
                <div className="w-32">
                  <NativeSelect
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    disabled={busy}
                    onChange={(e) =>
                      patchMember(member.id, { role: e.target.value })
                    }
                  >
                    <RoleOptions roles={roleChoices} />
                  </NativeSelect>
                </div>
              ) : (
                <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
              )}

              <div className="flex gap-1">
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setError(null);
                      setEditingId(member.id);
                      setEditName(member.name);
                      setEditEmail(member.email);
                      setEditPassword("");
                    }}
                  >
                    Edit
                  </Button>
                )}
                {manageable && !isSelf && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => removeMember(member)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
