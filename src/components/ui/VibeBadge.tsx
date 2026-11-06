import { Camera, Compass, Dumbbell, Flower2, GraduationCap, Landmark, Laptop, PartyPopper, Rocket, TreePalm, Users, WavesHorizontal, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Vibe } from "@/lib/types";
import { Badge } from "./Badge";

/** Each vibe's icon. */
export const vibeIcons: Record<Vibe, LucideIcon> = {
  fitness: Dumbbell,
  "surf-water": WavesHorizontal,
  "remote-work": Laptop,
  founder: Rocket,
  creator: Camera,
  wellness: Flower2,
  adventure: Compass,
  culture: Landmark,
  party: PartyPopper,
  holiday: TreePalm,
  social: Users,
  students: GraduationCap,
};

/** A vibe as a neutral Badge with its icon. `label`: a host's custom vibe, shown instead of the vibe name. */
export function VibeBadge({ vibe, label, className }: { vibe: Vibe; label?: string; className?: string }) {
  const t = useTranslations("common");
  const Icon = vibeIcons[vibe];
  return (
    <Badge icon={<Icon aria-hidden />} className={className}>
      {label || t(`vibes.${vibe}`)}
    </Badge>
  );
}
