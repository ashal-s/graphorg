import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

/**
 * A person's profile picture, or their initials when none is set (or the
 * image fails to load).
 */
export function PersonAvatar({
  name,
  photoUrl,
  className,
  textClassName,
}: {
  name: string;
  photoUrl?: string | null;
  /** Size, e.g. `size-24`. */
  className?: string;
  textClassName?: string;
}) {
  const url = photoUrl?.trim() || null;
  return (
    <Avatar className={className}>
      {url && <AvatarImage src={url} alt={name} referrerPolicy="no-referrer" />}
      <AvatarFallback
        className={cn(
          "bg-primary/10 text-sm font-semibold text-primary",
          textClassName,
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
