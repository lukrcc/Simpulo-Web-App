"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { getCurrentUser, useStore } from "@/lib/store";

/** "Add a photo" sheet – the same uploader as the Create flow, saving straight to the profile. */
export function PhotoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add a photo">
      {/* Remounted on every open, so it starts from the current profile photos. */}
      {open && <PhotoSheetBody onDone={onClose} />}
    </Sheet>
  );
}

function PhotoSheetBody({ onDone }: { onDone: () => void }) {
  const store = useStore();
  const showToast = useToast();
  const [photos, setPhotos] = useState(() => getCurrentUser(store)?.photos ?? []);

  return (
    <div className="space-y-4">
      <PhotoUploader photos={photos} onChange={setPhotos} />
      <p className="text-xs text-zinc-500">Start with a clear photo of your face – hosts decide who joins.</p>
      <button
        type="button"
        disabled={!photos[0]}
        onClick={() => {
          store.updateCurrentUser({ photos });
          showToast("Photo added");
          onDone();
        }}
        className={buttonClass("dark", "lg", "w-full")}
      >
        Save
      </button>
    </div>
  );
}
