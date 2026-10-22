import Link from "next/link";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PersonPhoto } from "./PersonPhoto";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizePx: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 96 };

const sizeClasses: Record<AvatarSize, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-24",
};

interface AvatarProps {
  user: Pick<User, "id" | "name" | "photos">;
  size?: AvatarSize;
  /** Links to the user's public profile */
  linked?: boolean;
  className?: string;
}

export function Avatar({ user, size = "md", linked = false, className }: AvatarProps) {
  const image = (
    <PersonPhoto
      src={user.photos[0]}
      alt={user.name}
      size={sizePx[size]}
      className={cn("bg-neutral-200", sizeClasses[size], className)}
    />
  );
  if (!linked) return image;
  return (
    <Link href={`/u/${user.id}`} className="shrink-0 rounded-full" title={user.name}>
      {image}
    </Link>
  );
}

interface AvatarStackProps {
  users: Array<Pick<User, "id" | "name" | "photos">>;
  max?: number;
  size?: Extract<AvatarSize, "xs" | "sm" | "md">;
  linked?: boolean;
}

export function AvatarStack({ users, max = 4, size = "sm", linked = false }: AvatarStackProps) {
  const visible = users.slice(0, max);
  const rest = users.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar key={user.id} user={user} size={size} linked={linked} className="ring-2 ring-white" />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600 ring-2 ring-white",
            sizeClasses[size],
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
