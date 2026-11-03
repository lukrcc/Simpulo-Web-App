/**
 * Inline script, run before the app's bundles: the first popstate listener on the page, before Next.js's. The handler itself
 * comes with the bundle (src/lib/houseTransition.ts); until then the event just passes. No dependency on it here: the root
 * layout is a server component.
 */
export const HOUSE_BACK_GATE = `window.addEventListener("popstate",function(e){window.__housePop&&window.__housePop(e)},true)`;
