"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { LANGUAGES, cn } from "@/lib/utils";
import { OptionList, filterOptions, useListNavigation, type ComboOption } from "./Combobox";

const OPTIONS: ComboOption[] = LANGUAGES.map((l) => ({ value: l.name, label: l.name }));

interface LanguageInputProps {
  /** English names as stored on profiles ("German") */
  languages: string[];
  onChange: (languages: string[]) => void;
  /** Soft field style of the form pages (warm grey fill, focus ring) instead of the white field */
  soft?: boolean;
}

/** Language chips plus a searchable list to add more – picked from the list, never typed free. */
export function LanguageInput({ languages, onChange, soft = false }: LanguageInputProps) {
  const t = useTranslations("create.about");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const chosen = new Set(languages.map((l) => l.toLowerCase()));
  const options = filterOptions(OPTIONS, query).filter((o) => !chosen.has(o.value.toLowerCase()));
  const nav = useListNavigation(options.length);

  function add(option: ComboOption) {
    onChange([...languages, option.value]);
    setQuery("");
    nav.setActive(0);
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !query && languages.length > 0) {
      onChange(languages.slice(0, -1));
      return;
    }
    const action = nav.onKey(e, () => setOpen(true));
    if (action === "close") setOpen(false);
    if (action === "pick" && open && options[nav.active]) add(options[nav.active]);
  }

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex min-h-11 cursor-text flex-wrap items-center gap-1.5 rounded-xl border px-2 py-1.5",
          soft ? "border-[#E7E5E4] bg-[#FAFAF9] focus-within:ring-2 focus-within:ring-ink/20" : "border-neutral-200 bg-white focus-within:border-ink",
        )}
      >
        {languages.map((language) => (
          <span key={language} className="inline-flex items-center gap-1 rounded-full bg-white py-1 pl-3 pr-1.5 text-sm ring-1 ring-black/5">
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
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options.length > 0 ? `${listId}-${nav.active}` : undefined}
          aria-label={t("addLanguage")}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            nav.setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setQuery("");
          }}
          onKeyDown={onKeyDown}
          placeholder={languages.length === 0 ? t("languagesPlaceholder") : t("languagesPlaceholderMore")}
          className="h-8 min-w-28 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-neutral-400"
        />
      </div>
      {open && (
        <OptionList id={listId} options={options} active={nav.active} onPick={add} onHover={nav.setActive} empty={t("noLanguage")} />
      )}
    </div>
  );
}
