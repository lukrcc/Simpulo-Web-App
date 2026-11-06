const TRANSITION = "background-color 150ms";

/**
 * The grip: a small pill with one line, on the tab's edge and on a sheet's handle. Sized and coloured right here, not in a stylesheet: it is
 * the only way to reach the filters by hand, so it must never depend on a rule having arrived.
 */
export function NotchGrip({ hover = false }: { hover?: boolean }) {
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
