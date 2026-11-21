"use client";

// One column of the large footer (config/footer.ts FOOTER_COLUMNS). Phones (< 744px): a group that opens with a tap – the heading a button
// (44px) with a chevron, the links 44px high; from 744px the column is always open and the heading plain.
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FooterColumn({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <nav aria-label={title} className={cn("max-md:border-b max-md:border-line max-md:last:border-b-0", className)}>
      <h2 className="text-eyebrow uppercase text-muted">
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left uppercase md:pointer-events-none md:min-h-0 md:cursor-default">
          {title}
          <ChevronDown aria-hidden className={cn("size-4 transition-transform md:hidden", open && "rotate-180")} />
        </button>
      </h2>
      <div id={id} className={cn("md:mt-3 md:block", open ? "max-md:block max-md:pb-4" : "max-md:hidden")}>
        {children}
      </div>
    </nav>
  );
}
