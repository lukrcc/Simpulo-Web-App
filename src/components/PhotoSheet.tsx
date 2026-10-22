"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { getCurrentUser, useStore } from "@/lib/store";

/** "Add a photo" sheet – the same uploader as the Create flow, saving straight to the profile. */
export function PhotoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("common.ui.photoSheet");
  return (
    <Sheet open={open} onClose={onClose} title={t("title")}>
      {/* Remounted on every open, so it starts from the current profile photos. */}
      {open && <PhotoSheetBody onDone={onClose} />}
    </Sheet>
  );
}

function PhotoSheetBody({ onDone }: { onDone: () => void }) {
  const t = useTranslations("common.ui.photoSheet");
  const store = useStore();
  const showToast = useToast();
  const [photos, setPhotos] = useState(() => getCurrentUser(store)?.photos ?? []);

  return (
    <div className="space-y-4">
      <PhotoUploader photos={photos} onChange={setPhotos} />
      <p className="text-xs text-zinc-500">{t("hint")}</p>
      <button
        type="button"
        disabled={!photos[0]}
        onClick={() => {
          store.updateCurrentUser({ photos });
          showToast(t("added"));
          onDone();
        }}
        className={buttonClass("dark", "lg", "w-full")}
      >
        {t("save")}
      </button>
    </div>
  );
}
