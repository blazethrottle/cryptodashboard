export const fmtUsd = (n: number | undefined | null): string => {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

export const fmtPrice = (n: number | undefined | null): string => {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (Math.abs(n) >= 1) return `$${n.toFixed(2)}`;
  if (Math.abs(n) >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toExponential(2)}`;
};

export const fmtPct = (n: number | undefined | null, digits = 1): string => {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
};

export const fmtNum = (n: number, digits = 2): string => {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 10000) return n.toFixed(0);
  return n.toFixed(digits);
};

export const fmtKR = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
};

export const levelColor = (level: string): string => {
  switch (level) {
    case "BUY_STRONG":
    case "BUY":
      return "text-buy border-buy/40 bg-buy/10";
    case "WATCH":
      return "text-watch border-watch/40 bg-watch/10";
    case "SELL":
    case "SELL_STRONG":
      return "text-sell border-sell/40 bg-sell/10";
    case "NEUTRAL":
    default:
      return "text-muted border-border bg-surface2";
  }
};

export const levelLabel = (level: string): string => {
  switch (level) {
    case "BUY_STRONG": return "🟢🟢 강한 매수";
    case "BUY": return "🟢 매수";
    case "WATCH": return "🔵 워치";
    case "NEUTRAL": return "⚪ 중립";
    case "SELL": return "🟡 매도";
    case "SELL_STRONG": return "🔴 강한 매도";
    default: return level;
  }
};

export const levelEmoji = (level: string): string => {
  switch (level) {
    case "BUY_STRONG": return "🟢🟢";
    case "BUY": return "🟢";
    case "WATCH": return "🔵";
    case "SELL": return "🟡";
    case "SELL_STRONG": return "🔴";
    case "NEUTRAL":
    default: return "⚪";
  }
};
