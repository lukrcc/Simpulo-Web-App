import { BookOpen, Briefcase, CalendarDays, Camera, CandlestickChart, Compass, Dumbbell, Fish, Flower2, GraduationCap, Heart, Landmark, Languages, Laptop, Mountain, PartyPopper, Radio, Rocket, Shapes, Sparkles, TreePalm, Users, UtensilsCrossed, WavesHorizontal, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Vibe } from "@/lib/types";
import { Badge } from "./Badge";

/** Each vibe's icon. */
const vibeIcons: Record<Vibe, LucideIcon> = {
  fitness: Dumbbell,
  creator: Camera,
  founder: Rocket,
  "remote-work": Laptop,
  holiday: TreePalm,
  mixed: Shapes,
  surf: WavesHorizontal,
  wellness: Flower2,
  streaming: Radio,
  trading: CandlestickChart,
  yoga: Sparkles,
  diving: Fish,
  climbing: Mountain,
  language: Languages,
  students: GraduationCap,
  party: PartyPopper,
  singles: Heart,
  weekend: CalendarDays,
  business: Briefcase,
  social: Users,
  adventure: Compass,
  culture: Landmark,
  food: UtensilsCrossed,
  study: BookOpen,
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
