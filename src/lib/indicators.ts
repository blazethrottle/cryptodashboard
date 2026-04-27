/**
 * Technical indicators — pure functions, no I/O.
 * Designed to mirror values seen on TradingView so users can sanity-check.
 */

/**
 * Wilder's RSI (the standard one TradingView shows by default).
 * Returns the RSI series aligned to `closes`; first `period` entries are NaN.
 */
export function rsi(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length <= period) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** Simple moving average aligned to input. First `period-1` entries are NaN. */
export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    sum += values[i] - values[i - period];
    out[i] = sum / period;
  }
  return out;
}

/** Slope of the last `n` values via simple linear regression. Returns slope per step. */
export function slope(values: number[], n = 10): number {
  const tail = values.slice(-n).filter((v) => !Number.isNaN(v));
  if (tail.length < 2) return NaN;
  const N = tail.length;
  const xMean = (N - 1) / 2;
  const yMean = tail.reduce((a, b) => a + b, 0) / N;
  let num = 0;
  let den = 0;
  for (let i = 0; i < N; i++) {
    num += (i - xMean) * (tail[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  return den === 0 ? NaN : num / den;
}

/** Last non-NaN value. */
export function last<T>(arr: T[]): T | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (typeof v === "number" ? !Number.isNaN(v) : v != null) return v;
  }
  return undefined;
}

/** True if `series[i]` was below `level` and `series[i+1]` is at/above level (within last `lookback`). */
export function crossedAbove(series: number[], level: number[] | number, lookback = 3): boolean {
  return crossedDirection(series, level, lookback, "up");
}

export function crossedBelow(series: number[], level: number[] | number, lookback = 3): boolean {
  return crossedDirection(series, level, lookback, "down");
}

function crossedDirection(
  series: number[],
  level: number[] | number,
  lookback: number,
  dir: "up" | "down",
): boolean {
  const lvl = (i: number) => (typeof level === "number" ? level : level[i]);
  const start = Math.max(1, series.length - lookback);
  for (let i = start; i < series.length; i++) {
    const a = series[i - 1];
    const b = series[i];
    const la = lvl(i - 1);
    const lb = lvl(i);
    if ([a, b, la, lb].some((v) => Number.isNaN(v))) continue;
    if (dir === "up" && a < la && b >= lb) return true;
    if (dir === "down" && a > la && b <= lb) return true;
  }
  return false;
}
