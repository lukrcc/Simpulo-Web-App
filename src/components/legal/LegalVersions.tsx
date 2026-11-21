"use client";

// The EN/DE switch of a legal page: shown only when more than one language exists (today only English – then nothing). All versions are
// prerendered; the switch only shows one of them.
import { useState, type ReactNode } from "react";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";

export function LegalVersions({ versions, label }: { versions: { lang: string; label: string; node: ReactNode }[]; label: string }) {
  const [lang, setLang] = useState(versions[0]?.lang);
  if (versions.length < 2) return versions[0]?.node ?? null;
  return (
    <>
      <div className="mb-6">
        <CapsuleGroup size="sm" label={label} value={lang ?? null} onChange={setLang} options={versions.map((v) => ({ value: v.lang, content: v.label }))} />
      </div>
      {versions.map((v) => (
        <div key={v.lang} hidden={v.lang !== lang}>
          {v.node}
        </div>
      ))}
    </>
  );
}
