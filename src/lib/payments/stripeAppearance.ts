"use client";

/**
 * The Stripe Payment Element's look (Appearance API), from our tokens – it can't read CSS variables, so their computed values are read at the
 * moment the element is created (stripe.elements({ appearance: stripeAppearance() }), lib/payments/stripe.ts once it's built). Dark mode
 * (CLAUDE.md "Dark Mode"): Stripe's "night" theme with our dark floor; light: "stripe" with our cream. Fields as ui/Input: radius 12, 48px.
 */
export interface StripeAppearance {
  theme: "stripe" | "night";
  variables: Record<string, string>;
  rules: Record<string, Record<string, string>>;
}

export function stripeAppearance(): StripeAppearance {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const read = (name: string) => css.getPropertyValue(name).trim();
  const dark = root.getAttribute("data-theme") === "dark";
  return {
    theme: dark ? "night" : "stripe",
    variables: {
      colorPrimary: read("--brand-action"),
      colorBackground: read("--surface"),
      colorText: read("--text"),
      colorTextSecondary: read("--text-muted"),
      colorTextPlaceholder: read("--text-faint"),
      colorDanger: read("--danger"),
      borderRadius: "12px",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSizeBase: "16px",
    },
    rules: {
      ".Input": { border: `1px solid ${read("--input-border")}`, boxShadow: "none", padding: "13px 14px" },
      ".Input:focus": { boxShadow: `0 0 0 3px color-mix(in srgb, ${read("--brand-action")} 15%, transparent)` },
      ".Label": { color: read("--text-muted") },
    },
  };
}
