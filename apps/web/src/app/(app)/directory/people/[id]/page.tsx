import { notFound } from "next/navigation";
import { z } from "zod";

import { PersonForm } from "@/components/directory/person-form";
import { PersonProfileRelationships } from "@/components/directory/person-profile-relationships";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { loadPersonProfile } from "@/lib/directory/load-person-profile";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const readOnly = !hasRole(session.role, "editor");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const loaded = await loadPersonProfile(session.organizationId, id);
  if (!loaded) notFound();

  const { person, teamOptions, managerOptions, profile } = loaded;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {person.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {person.title ? `${person.title} · ` : ""}
            {person.email}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Profile of this person&apos;s team, workflows, services, and the
            records they&apos;re linked to.
          </p>
        </div>
        {!readOnly && (
          <DeleteEntityButton
            entityLabel="person"
            entityName={person.name}
            apiPath={`/api/people/${person.id}`}
            redirectTo="/directory/people"
          />
        )}
      </div>

      <PersonForm
        mode="edit"
        person={person}
        teams={teamOptions}
        managers={managerOptions}
        readOnly={readOnly}
      />

      <PersonProfileRelationships profile={profile} />
    </div>
  );
}
