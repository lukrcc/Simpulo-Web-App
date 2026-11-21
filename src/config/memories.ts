// House Memories (CLAUDE.md "Moments-Reiter als Album"): the album of a House – photos and short clips from the crew. Structure and limits
// only; the words are in lib/i18n/en.ts (house.album.*).

export const MEMORY_POLICY = {
  /** Photos are re-drawn at most this long on their longer side (and lose every EXIF field, GPS included) */
  maxPhotoPx: 1600,
  jpegQuality: 0.82,
  /** Clips: at most this long and this big */
  maxClipSeconds: 30,
  maxClipMb: 60,
  /** The card on the last evening and the day after asks for this many */
  askFor: 3,
  /** "Your album is ready": this many photos as a preview */
  preview: 6,
  /** Who sees an album by default: only the crew of the House (Regel) */
  defaultVisibility: "crew",
} as const;

/**
 * The incentive (prepared, off): whoever shares material Simpulo may use ("Simpulo may use this for Simpulo's own posts") gets a fee
 * advantage on their next House. `discountPercent` – the size of it – is still open (the founders decide); while it is null, nothing is
 * applied even with the switch on.
 */
export const MEMORIES_PERK = {
  enabled: false,
  /** Approved photos or clips from one House that earn it */
  minApproved: 3,
  discountPercent: null as number | null,
} as const;
