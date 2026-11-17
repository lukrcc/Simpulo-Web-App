// Admin › Vision's own navigation in the URL (?view=, ?block=): a push to the browser's history and one event, so the page (and the
// browser's back) follow – Next's router would change the URL without telling Vision's URL hook. Shared by AdminVision and its parts.
export const VISION_NAV = "vision-nav";

/** Go to a Vision URL ("?block=segments", "" for the map). */
export function goVision(search: string) {
  window.history.pushState(null, "", `${window.location.pathname}${search}`);
  window.dispatchEvent(new Event(VISION_NAV));
}
