"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type KeyboardEvent } from "react";
import { cn, splitList } from "@/lib/utils";

/** Language chips; type one and press Enter or comma to add. */
interface LanguageInputProps {
  languages: string[];
  onChange: (languages: string[]) => void;
  /** Soft field style of Edit profile (warm grey fill, focus ring) instead of the white stepper field */
  soft?: boolean;
}

export function LanguageInput({ languages, onChange, soft = false }: LanguageInputProps) {
  const t = useTranslations("create.about");
  const [draft, setDraft] = useState("");

  function add() {
    const next = splitList(draft, /,/).filter((l) => !languages.some((x) => x.toLowerCase() === l.toLowerCase()));
    if (next.length > 0) onChange([...languages, ...next]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && languages.length > 0) {
      onChange(languages.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border px-2 py-2",
        soft ? "border-[#E7E5E4] bg-[#FAFAF9] focus-within:ring-2 focus-within:ring-ink/20" : "border-neutral-200 bg-white focus-within:border-ink",
      )}
    >
      {languages.map((language) => (
        <span key={language} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-1 pl-3 pr-1.5 text-sm">
          {language}
          <button
            type="button"
            onClick={() => onChange(languages.filter((l) => l !== language))}
            aria-label={t("removeLanguage", { language })}
            className="rounded-full p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={languages.length === 0 ? t("languagesPlaceholder") : t("languagesPlaceholderMore")}
        aria-label={t("addLanguage")}
        className="h-8 min-w-28 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}
