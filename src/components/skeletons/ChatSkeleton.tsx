import { cn } from "@/lib/utils";
import { Bone } from "./Bone";

// Alternating incoming / outgoing bubbles of varying widths.
const BUBBLES = [
  { mine: false, width: "w-2/3" },
  { mine: false, width: "w-1/3" },
  { mine: true, width: "w-1/2" },
  { mine: false, width: "w-3/5" },
  { mine: true, width: "w-2/5" },
  { mine: true, width: "w-1/4" },
] as const;

/** Chat: header (avatar + name), message bubbles and the composer. Fills its parent's height. */
export function ChatSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <Bone className="size-10 shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-1/3" />
          <Bone className="h-3 w-1/4" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden px-4 py-4">
        {BUBBLES.map((bubble, i) => (
          <div key={i} className={cn("flex", bubble.mine ? "justify-end" : "justify-start")}>
            <Bone className={cn("h-10 rounded-2xl", bubble.width, bubble.mine && "bg-black/10")} />
          </div>
        ))}
      </div>
      <div className="shrink-0 px-4 pb-4">
        <Bone className="h-12" />
      </div>
    </div>
  );
}
