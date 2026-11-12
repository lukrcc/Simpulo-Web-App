// Small helpers for links and threads, whatever the data source.

export const crewThreadId = (stayId: string) => `t-${stayId}`;

export interface LinkPreview {
  title: string;
  /** "" when there's no picture */
  imageUrl: string;
  domain: string;
}

/** "airbnb.com" – or the input itself when it isn't a valid URL. */
export function linkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── Simpulo's own short links (QR codes, shares) ────────────────────────────────

/**
 * Where links point: NEXT_PUBLIC_LINK_BASE_URL (later https://simpulo.app), else this page's own origin – locally http://localhost:3000 –
 * and on the server, without either, https://simpulo.app.
 */
export function linkBase(): string {
  const configured = process.env.NEXT_PUBLIC_LINK_BASE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://simpulo.app";
}

function withRef(path: string, ref?: string): string {
  return `${linkBase()}${path}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
}

/** /get – getting Simpulo on the phone. `ref` says where the link was found (footer, get, house-qr, …). */
export const appLink = (ref?: string) => withRef("/get", ref);
/** /h/{slug} – a House (redirects to its page). */
export const houseLink = (slug: string, ref?: string) => withRef(`/h/${encodeURIComponent(slug)}`, ref);
/** /i/{code} – an invite link (the code is its token; → /invite/[token], the spot held for 48h). */
export const inviteLink = (code: string, ref?: string) => withRef(`/i/${encodeURIComponent(code)}`, ref);
/** /c/{handle} – a creator (for now: the start page). */
export const creatorLink = (handle: string, ref?: string) => withRef(`/c/${encodeURIComponent(handle)}`, ref);
