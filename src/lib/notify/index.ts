/**
 * 통합 알림 — Telegram + macOS notification 동시 발송.
 * 시그널 변경, Trade Plan 트리거 등에 사용.
 *
 * 사용처:
 *  - snapshot 마지막에 호출 (signalDiff vs 직전 snapshot)
 *  - Trade Plan check 시 도달 트리거
 */

import { sendTelegram } from "./telegram.ts";
import { notifyMac } from "./macos.ts";

export interface NotifyEvent {
  category: "signal-new-buy" | "signal-new-sell" | "plan-stop-loss" | "plan-take-profit" | "macro-shift" | "info";
  title: string;
  message: string;
  details?: string[];
  silent?: boolean;
}

/** 양 채널에 동시 발송. Telegram 실패해도 macOS는 계속, 그 반대도. */
export async function notifyAll(event: NotifyEvent): Promise<{ telegram: boolean; macos: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 텔레그램은 markdown 지원 — 이모지 + 강조
  const tgEmoji = event.category.startsWith("signal-new-buy")
    ? "🟢🟢"
    : event.category.startsWith("signal-new-sell")
    ? "🟡🟡"
    : event.category === "plan-stop-loss"
    ? "🚨🛑"
    : event.category === "plan-take-profit"
    ? "🎯💰"
    : event.category === "macro-shift"
    ? "🌐"
    : "ℹ️";

  const tgText = [
    `${tgEmoji} *${event.title}*`,
    "",
    event.message,
    ...(event.details ? ["", ...event.details.map((d) => `• ${d}`)] : []),
  ].join("\n");

  const tgRes = await sendTelegram({ text: tgText, parseMode: "Markdown", silent: event.silent });
  if (!tgRes.ok) errors.push(`telegram: ${tgRes.error}`);

  // macOS notification
  const macRes = await notifyMac({
    title: event.title,
    subtitle: event.category,
    message: event.message,
    sound: event.silent ? undefined : "Glass",
  });
  if (!macRes.ok) errors.push(`macos: ${macRes.error}`);

  return { telegram: tgRes.ok, macos: macRes.ok, errors };
}

/**
 * 직전 snapshot vs 현재 snapshot 비교 — 신규 매수/매도 시그널만 알림.
 * silent change (NEUTRAL → NEUTRAL 등)는 무시.
 */
export interface PriorSnapshotMap {
  [base: string]: string;  // base → SignalLevel
}

export interface SignalLikeRow {
  coin: { base: string; name: string };
  result?: { level: string; price: number; reasons: string[] };
}

export function diffSignals(
  prior: PriorSnapshotMap,
  current: SignalLikeRow[],
): { newBuys: SignalLikeRow[]; newSells: SignalLikeRow[]; newWatches: SignalLikeRow[] } {
  const isBuyish = (l: string) => l === "BUY" || l === "BUY_STRONG";
  const isSellish = (l: string) => l === "SELL" || l === "SELL_STRONG";
  const isWatch = (l: string) => l === "WATCH";

  const newBuys: SignalLikeRow[] = [];
  const newSells: SignalLikeRow[] = [];
  const newWatches: SignalLikeRow[] = [];

  for (const r of current) {
    if (!r.result) continue;
    const now = r.result.level;
    const before = prior[r.coin.base] ?? "NEUTRAL";

    if (isBuyish(now) && !isBuyish(before)) newBuys.push(r);
    else if (isSellish(now) && !isSellish(before)) newSells.push(r);
    else if (isWatch(now) && !isWatch(before) && !isBuyish(before) && !isSellish(before)) newWatches.push(r);
  }
  return { newBuys, newSells, newWatches };
}
