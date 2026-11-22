// Admin › every page's "Überblick" tab (CLAUDE.md "Überblick zuerst"): the tiles' words, one file per page (merged into ADMIN_DE.pageTiles).
import { TILES_ANALYSIS } from "./analysis";
import { TILES_COCKPIT } from "./cockpit";
import { TILES_DATA } from "./data";
import { TILES_FUNDING } from "./funding";
import { TILES_GROWTH } from "./growth";
import { TILES_HOSTS } from "./hosts";
import { TILES_HOUSES } from "./houses";
import { TILES_INBOX } from "./inbox";
import { TILES_LABS } from "./labs";
import { TILES_MARKETING } from "./marketing";
import { TILES_MONEY } from "./money";
import { TILES_VISION } from "./vision";

export const PAGE_TILES = {
  cockpit: TILES_COCKPIT,
  inbox: TILES_INBOX,
  money: TILES_MONEY,
  growth: TILES_GROWTH,
  analysis: TILES_ANALYSIS,
  houses: TILES_HOUSES,
  hosts: TILES_HOSTS,
  marketing: TILES_MARKETING,
  data: TILES_DATA,
  labs: TILES_LABS,
  vision: TILES_VISION,
  funding: TILES_FUNDING,
} as const;
