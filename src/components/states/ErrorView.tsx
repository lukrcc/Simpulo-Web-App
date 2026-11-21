"use client";

// The one look of every error page (CLAUDE.md "Fehlerseiten"): the wordmark, a title, one short sentence, Explore and Get help – never a
// technical message. Without a connection it says so ("You're offline"). Used by not-found, the error pages of the app's areas and
// global-error (which renders without the app's providers – so the words come in as props, and "Get help" is then a link).
import Link from "next/link";
import { Wordmark } from "@/components/layout/Logo";
import { buttonStyles } from "@/components/ui/ActionButton";
import { openGetHelp } from "@/lib/support/feedback";
import { useOnline } from "@/lib/useOnline";

export interface ErrorViewTexts {
  title: string;
  description: string;
  explore: string;
  getHelp: string;
  retry?: string;
  offlineTitle?: string;
  offlineDescription?: string;
}

export function ErrorView({ texts, retry, helpHref, homeHref = "/explore", h1 = true }: { texts: ErrorViewTexts; retry?: () => void; /** Without the app's help sheet (global-error): a link */ helpHref?: string; /** Where "Explore" leads (the admin: its overview) */ homeHref?: string; h1?: boolean }) {
  const online = useOnline();
  const offline = !online && Boolean(texts.offlineTitle);
  const Title = h1 ? "h1" : "h2";
  return (
    <div data-error-view={offline ? "offline" : "error"} className="mx-auto flex w-full max-w-[min(100%-2*var(--page-margin),560px)] flex-col items-center py-16 text-center md:py-24">
      <Wordmark size="lg" />
      <Title className="mt-8 text-h2 text-ink">{offline ? texts.offlineTitle : texts.title}</Title>
      <p className="mt-2 max-w-sm text-body text-muted">{offline ? texts.offlineDescription : texts.description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {retry && texts.retry && (
          <button type="button" onClick={retry} className={buttonStyles("primary", "md")}>
            {texts.retry}
          </button>
        )}
        <Link href={homeHref} className={buttonStyles(retry ? "secondary" : "primary", "md")}>
          {texts.explore}
        </Link>
      </div>
      {helpHref ? (
        <a href={helpHref} className="mt-6 text-small font-semibold text-ink underline-offset-4 hover:underline">
          {texts.getHelp}
        </a>
      ) : (
        <button type="button" onClick={() => openGetHelp()} className="mt-6 text-small font-semibold text-ink underline-offset-4 hover:underline">
          {texts.getHelp}
        </button>
      )}
    </div>
  );
}
