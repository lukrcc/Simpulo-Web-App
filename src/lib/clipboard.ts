/**
 * Copy text – everywhere, also over plain http (the dev server on the LAN: http://<Name>.local:3000 or an IP). `navigator.clipboard` exists only
 * in a secure context (https, localhost); elsewhere it's undefined. Then a hidden textarea and `document.execCommand("copy")` – old, but the
 * one way that still works there (inside the click that asked for it). Rejects when neither works, so the caller can say so.
 */
export async function copyText(text: string): Promise<void> {
  if (typeof window !== "undefined" && window.isSecureContext && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  if (typeof document === "undefined") throw new Error("No document to copy from");
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    area.remove();
  }
  if (!ok) throw new Error("Copy failed");
}
