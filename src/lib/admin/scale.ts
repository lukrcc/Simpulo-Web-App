// The value axis of every admin chart (Regel „Admin-Diagramme“): one helper, so all axes read the same.

/** The "round" steps: 1 · 2 · 2,5 · 5 × 10ⁿ. */
const STEPS = [1, 2, 2.5, 5] as const;

/**
 * A calm value axis: it starts at 0; its top is max(largest value, goal) plus about 10 % air, rounded up to a round step (1 · 2 · 2,5 · 5 ×
 * 10ⁿ) so the axis has 4–6 labels (0 included); a goal line always lies inside it. Losses (values below 0) reach down by the same step –
 * only then does the axis start below 0.
 */
export function niceScale(values: readonly number[], goal?: number | null): { min: number; max: number; step: number; ticks: number[] } {
  const high = Math.max(0, goal ?? 0, ...values.filter(Number.isFinite));
  const low = Math.min(0, ...values.filter(Number.isFinite));
  const span = (high - low) * 1.1 || 1;
  // The smallest round step that keeps the axis to at most 5 intervals (6 labels); at least 3 intervals (4 labels).
  let step = 0;
  for (let pow = Math.pow(10, Math.floor(Math.log10(span / 5)) - 1); step === 0; pow *= 10) {
    for (const s of STEPS) {
      if (span / (s * pow) <= 5) {
        step = s * pow;
        break;
      }
    }
  }
  const min = low < 0 ? -Math.ceil((-low * 1.1) / step) * step : 0;
  let max = Math.ceil((high * 1.1) / step) * step;
  if (max === 0) max = step;
  while ((max - min) / step < 3) max += step;
  max = Math.round(max * 1000) / 1000;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { min, max, step, ticks };
}
