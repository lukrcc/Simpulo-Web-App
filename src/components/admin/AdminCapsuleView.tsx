"use client";

// Former "Kapsel-Ansicht" (mini tiles over a capsule) – replaced by "Acht Karten" (CLAUDE.md): the topic view shows only its content. Kept as
// a thin wrapper so the pages' content views stay where they are.
import type { ReactNode } from "react";

export function AdminCapsuleView({ fallback }: { page?: string; capsule?: string; tiles?: unknown; detail?: unknown; aside?: ReactNode; fallback: ReactNode }) {
  return <div className="min-w-0">{fallback}</div>;
}
