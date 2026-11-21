"use client";

// /dev/crash (dev only – app/dev/layout.tsx): throws while rendering, so the error page (app/error.tsx – the one ErrorView) shows. The Dev
// menu's "Trigger an error" opens it.
export default function Crash(): never {
  throw new Error("Dev: a deliberate error to see the error page");
}
