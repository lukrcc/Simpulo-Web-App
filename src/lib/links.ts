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
