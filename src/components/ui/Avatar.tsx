import Link from "next/link";
import type { User } from "@/lib/types";
import type { CrewFaceMode } from "@/config/privacy";
import { cn } from "@/lib/utils";
import { PersonPhoto } from "./PersonPhoto";

/** xs 24 · mini 28 (the waitlist) · sm 32 · base 36 (the site header's avatar) · md 40 · row 44 (Settings' profile card) · lg 56 · crew 72 (the House page) · xl 96 */
type AvatarSize = "xs" | "mini" | "sm" | "base" | "md" | "row" | "lg" | "crew" | "xl";

const sizePx: Record<AvatarSize, number> = { xs: 24, mini: 28, sm: 32, base: 36, md: 40, row: 44, lg: 56, crew: 72, xl: 96 };

const sizeClasses: Record<AvatarSize, string> = {
  xs: "size-6",
  mini: "size-7",
  sm: "size-8",
  base: "size-9",
  md: "size-10",
  row: "size-11",
  lg: "size-14",
  crew: "size-18",
  xl: "size-24",
};

interface AvatarProps {
  user: Pick<User, "id" | "name" | "photos">;
  size?: AvatarSize;
  /** Links to the user's public profile */
  linked?: boolean;
  /** How the viewer may see this person (config/privacy.ts): blurred – the photo softly blurred; hidden – a neutral placeholder. Neither links. */
  mode?: CrewFaceMode;
  className?: string;
}

export function Avatar({ user, size = "md", linked = false, mode = "full", className }: AvatarProps) {
  if (mode === "hidden") return <PersonPhoto src={undefined} alt="" size={sizePx[size]} className={cn("bg-line", sizeClasses[size], className)} />;
  if (mode === "blurred") {
    return (
      <span aria-hidden className={cn("block shrink-0 overflow-hidden rounded-full", sizeClasses[size], className)}>
        <PersonPhoto src={user.photos[0]} alt="" size={sizePx[size]} className={cn("bg-line blur-[3px]", sizeClasses[size])} />
      </span>
    );
  }
  const image = (
    <PersonPhoto
      src={user.photos[0]}
      alt={user.name}
      size={sizePx[size]}
      className={cn("bg-line", sizeClasses[size], className)}
    />
  );
  if (!linked) return image;
  return (
    <Link href={`/u/${user.id}`} aria-label={user.name} data-tooltip={user.name} className="shrink-0 rounded-full">
      {image}
    </Link>
  );
}

interface AvatarStackProps {
  users: Array<Pick<User, "id" | "name" | "photos" | "privacy">>;
  max?: number;
  /** A crew on a House: how the viewer may see each (useCrewFaceOf) */
  faceOf?: (user: Pick<User, "id" | "privacy">) => CrewFaceMode;
  size?: Extract<AvatarSize, "xs" | "mini" | "sm" | "md">;
  linked?: boolean;
}

export function AvatarStack({ users, max = 4, size = "sm", linked = false, faceOf }: AvatarStackProps) {
  // Someone hidden from this viewer has no face here – they only count in "+N".
  const shown = faceOf ? users.filter((user) => faceOf(user) !== "hidden") : users;
  const visible = shown.slice(0, max);
  const rest = users.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar key={user.id} user={user} size={size} linked={linked} mode={faceOf?.(user)} className="ring-2 ring-surface" />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-bg text-small font-medium text-muted ring-2 ring-surface",
            sizeClasses[size],
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
