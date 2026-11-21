"use client";

import type { ReactNode } from "react";
import { ModalFooter, Sheet } from "./Sheet";
import { Button } from "./ActionButton";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  /** Something to fill in before confirming (a reason) – between the text and the buttons */
  children?: ReactNode;
}

/** "Are you sure?" for actions that can't be undone in one tap (leave, close). */
export function ConfirmSheet({ open, title, description, confirmLabel, onConfirm, onClose, children }: ConfirmSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-small leading-relaxed text-muted">{description}</p>
      {children && <div className="mt-4">{children}</div>}
      <ModalFooter onCancel={onClose} className="mt-6">
        <Button variant="primary" size="md" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Sheet>
  );
}
