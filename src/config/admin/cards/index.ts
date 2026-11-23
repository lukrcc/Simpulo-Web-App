// Every page's cards (CLAUDE.md "Karten-Inhalte nur in config/admin/cards ändern; UI-Bausteine bleiben stabil").
import type { TopicPage } from "../../admin-topics";
import { ANALYSIS_CARDS } from "./analysis";
import { DATA_CARDS } from "./data";
import { FUNDING_CARDS } from "./funding";
import { GROWTH_CARDS } from "./growth";
import { HOSTS_CARDS } from "./hosts";
import { HOUSES_CARDS } from "./houses";
import { LABS_CARDS } from "./labs";
import { MARKETING_CARDS } from "./marketing";
import { MONEY_CARDS } from "./money";
import { OVERVIEW_CARDS } from "./overview";
import { SYSTEM_CARDS } from "./system";
import type { CardDef } from "./types";
import { VISION_CARDS } from "./vision";

export type { CardDef } from "./types";

export const ADMIN_CARDS: Readonly<Record<TopicPage, readonly CardDef[]>> = {
  overview: OVERVIEW_CARDS,
  money: MONEY_CARDS,
  growth: GROWTH_CARDS,
  analysis: ANALYSIS_CARDS,
  houses: HOUSES_CARDS,
  hosts: HOSTS_CARDS,
  marketing: MARKETING_CARDS,
  data: DATA_CARDS,
  funding: FUNDING_CARDS,
  vision: VISION_CARDS,
  system: SYSTEM_CARDS,
  labs: LABS_CARDS,
};
