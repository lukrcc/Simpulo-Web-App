const TRANSITION = "background-color 150ms";

/**
 * The grip: a small pill with one line, on the tab's edge and on a sheet's handle. Sized and coloured right here, not in a stylesheet: it is
 * the only way to reach the filters by hand, so it must never depend on a rule having arrived.
 */
export function NotchGrip({ hover = false, active = false, line = false }: { hover?: boolean; /** Being dragged, or the tab is open */ active?: boolean; /** The header tab's grip: the line alone */ line?: boolean }) {
  if (line) {
    // The header tab's grip: a line 44 × 6px, fully rounded, sitting ON the tab's edge (centred on it) – ink 45 %, hover/focus 70 %, dragged
    // or open 85 % (the dark header: cream, the same steps; --hdr-grip-rgb). It covers the edge line there: an opaque surface under its tint.
    return (
      <span
        data-notch-grip
        aria-hidden
        style={{ display: "block", width: 44, height: 6, borderRadius: 3, backgroundColor: "var(--hdr-solid)", backgroundImage: `linear-gradient(rgba(var(--hdr-grip-rgb), ${active ? 0.85 : hover ? 0.7 : 0.45}), rgba(var(--hdr-grip-rgb), ${active ? 0.85 : hover ? 0.7 : 0.45}))`, transition: "background-image 150ms" }}
      />
    );
  }
  return (
    <span
      data-notch-grip
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 12,
        borderRadius: 6,
        backgroundColor: hover ? "rgba(34, 30, 27, 0.09)" : "rgba(34, 30, 27, 0.05)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition: TRANSITION,
      }}
    >
      <span style={{ display: "block", width: 14, height: 2, borderRadius: 1, backgroundColor: `color-mix(in srgb, var(--muted) ${hover ? 80 : 50}%, transparent)`, transition: TRANSITION }} />
    </span>
  );
}
