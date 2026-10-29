// Simpulo's own social profiles (footer). Leave a URL empty and its icon isn't shown – no dead links.
export const SOCIAL_LINKS = {
  instagram: "https://instagram.com/simpulo",
  tiktok: "https://tiktok.com/@simpulo",
  youtube: "https://youtube.com/@simpulo",
} as const satisfies Record<string, string>;

export type SocialNetwork = keyof typeof SOCIAL_LINKS;
