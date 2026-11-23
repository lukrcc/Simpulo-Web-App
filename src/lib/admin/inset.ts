// The admin content's one margin left, right and bottom (admin-tokens.css --adm-page-inset, CLAUDE.md "Gleicher Rand"), read where a
// part measures its height down to the window's bottom – so it ends exactly that far above it.
export function pageInset(): number {
  if (typeof document === "undefined") return 18;
  const scope = document.querySelector(".admin-scope") ?? document.documentElement;
  return parseFloat(getComputedStyle(scope).getPropertyValue("--adm-page-inset")) || 18;
}
