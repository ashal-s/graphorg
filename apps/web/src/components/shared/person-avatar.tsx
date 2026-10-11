import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { toneAt, toneFor } from "@/lib/palette";
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
  colorKey,
  tone,
}: {
  name: string;
  photoUrl?: string | null;
  /** Size, e.g. `size-24`. */
  className?: string;
  textClassName?: string;
  /**
   * Gives the initials their own colour from the shared palette, stable for
   * the same key (use the person's id). Without it they use the main blue.
   */
  colorKey?: string;
  /** A position in the palette; wins over `colorKey` (see `assignTones`). */
  tone?: number;
}) {
  const url = photoUrl?.trim() || null;
  return (
    <Avatar className={className}>
      {url && <AvatarImage src={url} alt={name} referrerPolicy="no-referrer" />}
      <AvatarFallback
        className={cn(
          "text-sm font-semibold",
          tone !== undefined
            ? toneAt(tone).className
            : colorKey
              ? toneFor(colorKey).className
              : "bg-primary/10 text-primary",
          textClassName,
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
