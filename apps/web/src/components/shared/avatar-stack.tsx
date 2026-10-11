import { PersonAvatar } from "@/components/shared/person-avatar";
import { cn } from "@/lib/utils";

/**
 * A few overlapping avatars with a "+N" for the rest: a quick sense of who
 * is in a group without listing everyone. Each person keeps their own colour.
 */
export function AvatarStack({
  people,
  max = 4,
  className,
}: {
  people: {
    id: string;
    name: string;
    photoSrc?: string | null;
    tone?: number;
  }[];
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-1.5">
        {shown.map((person) => (
          // An opaque backing, so overlapping avatars don't show through
          // each other.
          <span
            key={person.id}
            className="rounded-full bg-card ring-2 ring-card"
          >
            <PersonAvatar
              name={person.name}
              photoUrl={person.photoSrc}
              colorKey={person.id}
              tone={person.tone}
              className="size-8"
              textClassName="text-[11px]"
            />
          </span>
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}
