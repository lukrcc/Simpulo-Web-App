// Founding Hosts (CLAUDE.md "Founding Host"): the badge for the first FOUNDING_HOST.limit accepted hosts – the one place that decides it.
import { FOUNDING_HOST } from "@/config/policies";
import type { User } from "./types";

export function isFoundingHost(user: Pick<User, "foundingHost" | "foundingHostNo"> | undefined | null): boolean {
  return Boolean(user?.foundingHost && user.foundingHostNo && user.foundingHostNo <= FOUNDING_HOST.limit);
}
