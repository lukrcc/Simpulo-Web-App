/**
 * 32px number circle with a dot ("1.") – the steps on the claim page. (The old "Use Simpulo like an app" card is gone: InstallHint shows
 * what fits the device.)
 */
export function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-body font-semibold text-ink">
      {n}
      <span className="text-ink">.</span>
    </span>
  );
}
