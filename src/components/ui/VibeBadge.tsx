import { BookOpen, Briefcase, CalendarDays, Camera, CandlestickChart, Compass, Dumbbell, Fish, Flower2, GraduationCap, Heart, Landmark, Languages, Laptop, Mountain, PartyPopper, Radio, Rocket, Shapes, Sparkles, TreePalm, Users, UtensilsCrossed, WavesHorizontal, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Vibe } from "@/lib/types";
import { cn } from "@/lib/utils";

const vibeStyles: Record<Vibe, { icon: LucideIcon; className: string }> = {
  fitness: { icon: Dumbbell, className: "bg-emerald-50 text-emerald-700" },
  creator: { icon: Camera, className: "bg-fuchsia-50 text-fuchsia-700" },
  founder: { icon: Rocket, className: "bg-indigo-50 text-indigo-700" },
  "remote-work": { icon: Laptop, className: "bg-sky-50 text-sky-700" },
  holiday: { icon: TreePalm, className: "bg-amber-50 text-amber-700" },
  mixed: { icon: Shapes, className: "bg-zinc-100 text-zinc-700" },
  surf: { icon: WavesHorizontal, className: "bg-cyan-50 text-cyan-700" },
  wellness: { icon: Flower2, className: "bg-rose-50 text-rose-700" },
  streaming: { icon: Radio, className: "bg-violet-50 text-violet-700" },
  trading: { icon: CandlestickChart, className: "bg-lime-50 text-lime-700" },
  yoga: { icon: Sparkles, className: "bg-pink-50 text-pink-700" },
  diving: { icon: Fish, className: "bg-blue-50 text-blue-700" },
  climbing: { icon: Mountain, className: "bg-stone-100 text-stone-700" },
  language: { icon: Languages, className: "bg-teal-50 text-teal-700" },
  students: { icon: GraduationCap, className: "bg-orange-50 text-orange-700" },
  party: { icon: PartyPopper, className: "bg-purple-50 text-purple-700" },
  singles: { icon: Heart, className: "bg-red-50 text-red-700" },
  weekend: { icon: CalendarDays, className: "bg-yellow-50 text-yellow-800" },
  business: { icon: Briefcase, className: "bg-slate-100 text-slate-700" },
  social: { icon: Users, className: "bg-green-50 text-green-700" },
  adventure: { icon: Compass, className: "bg-emerald-100 text-emerald-800" },
  culture: { icon: Landmark, className: "bg-indigo-100 text-indigo-800" },
  food: { icon: UtensilsCrossed, className: "bg-amber-100 text-amber-800" },
  study: { icon: BookOpen, className: "bg-blue-100 text-blue-800" },
};

/** `label`: a host's custom vibe, shown instead of the vibe name. */
export function VibeBadge({ vibe, label, className }: { vibe: Vibe; label?: string; className?: string }) {
  const t = useTranslations("common");
  const { icon: Icon, className: colors } = vibeStyles[vibe];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        colors,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label || t(`vibes.${vibe}`)}
    </span>
  );
}
