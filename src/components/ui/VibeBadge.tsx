import { Camera, CandlestickChart, Dumbbell, Fish, Flower2, GraduationCap, Languages, Laptop, Mountain, Radio, Rocket, Shapes, Sparkles, TreePalm, WavesHorizontal, type LucideIcon } from "lucide-react";
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
