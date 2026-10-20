import { Camera, Dumbbell, Flower2, Laptop, Rocket, TreePalm, WavesHorizontal, type LucideIcon } from "lucide-react";
import type { Vibe } from "@/lib/types";
import { cn, vibeLabel } from "@/lib/utils";

const vibeStyles: Record<Vibe, { icon: LucideIcon; className: string }> = {
  fitness: { icon: Dumbbell, className: "bg-emerald-50 text-emerald-700" },
  creator: { icon: Camera, className: "bg-fuchsia-50 text-fuchsia-700" },
  founder: { icon: Rocket, className: "bg-indigo-50 text-indigo-700" },
  "remote-work": { icon: Laptop, className: "bg-sky-50 text-sky-700" },
  holiday: { icon: TreePalm, className: "bg-amber-50 text-amber-700" },
  surf: { icon: WavesHorizontal, className: "bg-cyan-50 text-cyan-700" },
  wellness: { icon: Flower2, className: "bg-rose-50 text-rose-700" },
};

export function VibeBadge({ vibe, className }: { vibe: Vibe; className?: string }) {
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
      {vibeLabel(vibe)}
    </span>
  );
}
