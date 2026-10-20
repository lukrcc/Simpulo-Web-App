import { House, Inbox, Send, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata: Metadata = { title: "How it works" };

const STEPS: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: House, title: "Open a House", text: "Pick a place, dates and a vibe. Say who you're looking for – a rough budget is enough to start." },
  { icon: Send, title: "Share", text: "Your House gets its own page. Share the link wherever your people are." },
  { icon: Inbox, title: "Requests", text: "People ask to join with a short message. You see their profile and reply before you decide." },
  { icon: Users, title: "Crew", text: "Accepted people join the crew chat. Decide on the place together and lock it in." },
  { icon: Sparkles, title: "Live together", text: "Arrive, unpack, and live with people who wanted the same trip as you." },
];

export default function HowItWorksPage() {
  return (
    <ContentPage title="How Simpulo works" intro="Five steps from an idea to a shared House.">
      <ol className="space-y-6">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold text-ink">
                <span className="mr-1.5 text-zinc-400">{i + 1}.</span>
                {title}
              </h2>
              <p className="mt-1">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </ContentPage>
  );
}
