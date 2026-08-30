import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  WORKFLOW_ROLE_LABELS,
  type AssembledPersonProfile,
} from "@/lib/directory/person-profile";

import { RelatedRecordLink } from "./related-record-link";

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function PersonProfileRelationships({
  profile,
}: {
  profile: AssembledPersonProfile;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            {profile.team ? "This person's team." : "Not on a team."}
          </CardDescription>
        </CardHeader>
        {profile.team && (
          <CardContent>
            <RelatedRecordLink href={`/directory/teams/${profile.team.id}`}>
              {profile.team.name}
            </RelatedRecordLink>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manager</CardTitle>
          <CardDescription>
            {profile.manager
              ? "Who this person reports to."
              : "No manager set."}
          </CardDescription>
        </CardHeader>
        {profile.manager && (
          <CardContent>
            <RelatedRecordLink href={`/directory/people/${profile.manager.id}`}>
              {profile.manager.name}
            </RelatedRecordLink>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Direct reports</CardTitle>
          <CardDescription>
            {profile.directReports.length === 0
              ? "Nobody reports to this person."
              : `${countLabel(profile.directReports.length, "person reports", "people report")} to this person.`}
          </CardDescription>
        </CardHeader>
        {profile.directReports.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {profile.directReports.map((report) => (
              <RelatedRecordLink
                key={report.id}
                href={`/directory/people/${report.id}`}
              >
                {report.name}
              </RelatedRecordLink>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
          <CardDescription>
            {profile.workflows.length === 0
              ? "This person doesn't own or isn't assigned to any workflows."
              : `${countLabel(profile.workflows.length, "workflow", "workflows")} this person owns or is assigned to.`}
          </CardDescription>
        </CardHeader>
        {profile.workflows.length > 0 && (
          <CardContent className="flex flex-col gap-2">
            {profile.workflows.map((workflow) => (
              <RelatedRecordLink
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                className="w-fit"
              >
                <span className="font-medium">{workflow.name}</span>
                {workflow.roles.map((role) => (
                  <Badge key={role} variant="outline">
                    {WORKFLOW_ROLE_LABELS[role]}
                  </Badge>
                ))}
              </RelatedRecordLink>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            {profile.services.length === 0
              ? "This person's team doesn't own any services."
              : `${countLabel(profile.services.length, "service", "services")} this person is linked to via team ownership.`}
          </CardDescription>
        </CardHeader>
        {profile.services.length > 0 && (
          <CardContent className="flex flex-col gap-2">
            {profile.services.map((service) => (
              <RelatedRecordLink
                key={service.id}
                href={`/catalog/services/${service.id}`}
                className="w-fit"
              >
                {service.name}
              </RelatedRecordLink>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
          <CardDescription>
            {profile.repositories.length === 0
              ? "This person's team doesn't own any repositories."
              : `${countLabel(profile.repositories.length, "repository", "repositories")} this person is linked to via team ownership.`}
          </CardDescription>
        </CardHeader>
        {profile.repositories.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {profile.repositories.map((repository) => (
              <RelatedRecordLink
                key={repository.id}
                href={`/catalog/repositories/${repository.id}`}
              >
                {repository.name}
              </RelatedRecordLink>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technologies</CardTitle>
          <CardDescription>
            {profile.technologies.length === 0
              ? "No technologies are recorded on this person's services."
              : "Technologies associated with this person's services."}
          </CardDescription>
        </CardHeader>
        {profile.technologies.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {profile.technologies.map((technology) => (
              <RelatedRecordLink
                key={technology.id}
                href={`/catalog/technologies/${technology.id}`}
              >
                {technology.name}
              </RelatedRecordLink>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>
            {profile.tools.length === 0
              ? "No tools are recorded in this organisation."
              : "Tools in this organisation's catalog, used alongside this person's services."}
          </CardDescription>
        </CardHeader>
        {profile.tools.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {profile.tools.map((tool) => (
              <RelatedRecordLink
                key={tool.id}
                href={`/catalog/tools/${tool.id}`}
              >
                {tool.name}
              </RelatedRecordLink>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {profile.documents.length === 0
              ? "This person's team doesn't manage any documents."
              : `${countLabel(profile.documents.length, "document", "documents")} this person manages via their team.`}
          </CardDescription>
        </CardHeader>
        {profile.documents.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {profile.documents.map((document) => (
              <RelatedRecordLink
                key={document.id}
                href={`/catalog/documents/${document.id}`}
              >
                {document.title}
              </RelatedRecordLink>
            ))}
          </CardContent>
        )}
      </Card>
    </>
  );
}
