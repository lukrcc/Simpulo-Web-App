// Edit profile (/settings/profile): its sections, in their order – one accordion, one open at a time. Each has an icon, a title and a short
// summary from the data (words in messages: profile.edit.sections.{key}), and a status: complete, missing (required and not done) or optional
// (not required and not done). Required: photos (at least one, the face) and basics (first name, date of birth 18+, country). The progress
// "X of 6" counts the complete ones.
import { BadgeCheck, Camera, Link2, MapPin, MessageSquareText, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { ageOn, MIN_AGE } from "@/lib/birthDate";
import type { User } from "@/lib/types";

export type ProfileSectionKey = "photos" | "basics" | "vibe" | "about" | "links" | "inFor" | "verify";
export type ProfileSectionStatus = "complete" | "missing" | "optional";

/** `progress: false`: not part of "X of 6" ("I'm in for" is a signal, not part of the profile). */
export const PROFILE_SECTIONS: readonly { key: ProfileSectionKey; icon: LucideIcon; required: boolean; progress?: false }[] = [
  { key: "photos", icon: Camera, required: true },
  { key: "basics", icon: UserRound, required: true },
  { key: "vibe", icon: Sparkles, required: false },
  { key: "about", icon: MessageSquareText, required: false },
  { key: "links", icon: Link2, required: false },
  { key: "inFor", icon: MapPin, required: false, progress: false },
  { key: "verify", icon: BadgeCheck, required: false },
];

/** Whether a section is done, from the profile as it stands (the form's draft). */
export function sectionDone(key: ProfileSectionKey, user: User, today: string | null): boolean {
  switch (key) {
    case "photos":
      return user.photos.length > 0;
    case "basics":
      return Boolean(user.name.trim() && user.birthDate && user.country.trim() && (!today || ageOn(user.birthDate, today) >= MIN_AGE));
    case "vibe":
      return Boolean(user.houseVibe);
    case "about":
      return Boolean(user.bio.trim()) && user.languages.length > 0;
    case "links":
      return (user.socials?.length ?? 0) > 0;
    case "verify":
      return user.verified;
    case "inFor":
      // Lives in the store, not on the profile: Edit profile shows its own status.
      return false;
  }
}

export function sectionStatus(key: ProfileSectionKey, user: User, today: string | null): ProfileSectionStatus {
  if (sectionDone(key, user, today)) return "complete";
  return PROFILE_SECTIONS.find((s) => s.key === key)!.required ? "missing" : "optional";
}
