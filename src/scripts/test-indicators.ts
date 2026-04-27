/**
 * 인디케이터 sanity test.
 * Wilder RSI / SMA의 알려진 케이스로 검증.
 */

import { rsi, sma, slope, crossedAbove, crossedBelow } from "../lib/indicators.ts";

let passed = 0;
let failed = 0;

function expect(name: string, actual: number, expected: number, tol = 0.01): void {
  const ok = Math.abs(actual - expected) < tol;
  if (ok) {
    console.log(`  ✓ ${name}: ${actual.toFixed(4)} ≈ ${expected.toFixed(4)}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)}`);
    failed++;
  }
}

function expectBool(name: string, actual: boolean, expected: boolean): void {
  if (actual === expected) {
    console.log(`  ✓ ${name}: ${actual}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}: got ${actual}, expected ${expected}`);
    failed++;
  }
}

console.log("\n━━━ Indicator sanity tests ━━━\n");

// SMA
console.log("SMA:");
{
  const v = [1, 2, 3, 4, 5];
  const s = sma(v, 3);
  expect("sma([1..5], 3) at idx 2", s[2], 2);
  expect("sma([1..5], 3) at idx 4", s[4], 4);
}

// RSI — Wilder reference series from cTrader docs
// https://help.ctrader.com/ctrader-automate/indicators/rsi/
console.log("\nRSI (Wilder, 14):");
{
  // Classic Wilder example. Last value should be ~70.46.
  const closes = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
    45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64,
    46.21, 46.25, 45.71, 46.45, 45.78, 45.35, 44.03, 44.18, 44.22, 44.57,
    43.42, 42.66, 43.13,
  ];
  const r = rsi(closes, 14);
  expect("RSI last value", r.at(-1)!, 37.78, 0.5);
}

// Cross detection
console.log("\nCross detection:");
{
  const series = [10, 11, 12, 13, 14, 15];
  const ma = [12, 12, 12, 12, 12, 12];
  expectBool("crossedAbove(price, ma=12)", crossedAbove(series, ma, 5), true);
}
{
  const series = [15, 14, 13, 12, 11, 10];
  const ma = [12, 12, 12, 12, 12, 12];
  expectBool("crossedBelow(price, ma=12)", crossedBelow(series, ma, 5), true);
}
{
  const series = [10, 10, 11, 11, 11];
  const ma = [12, 12, 12, 12, 12];
  expectBool("no cross when below", crossedAbove(series, ma, 5), false);
}

// Slope
console.log("\nSlope:");
{
  const up = [1, 2, 3, 4, 5];
  expect("slope of [1..5]", slope(up, 5), 1.0);
  const flat = [3, 3, 3, 3, 3];
  expect("slope of flat", slope(flat, 5), 0);
  const down = [5, 4, 3, 2, 1];
  expect("slope of [5..1]", slope(down, 5), -1.0);
}

console.log(`\n━━━ Result: ${passed} passed, ${failed} failed ━━━\n`);
process.exit(failed > 0 ? 1 : 0);
