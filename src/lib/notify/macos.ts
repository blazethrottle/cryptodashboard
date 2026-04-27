/**
 * macOS 시스템 알림 — osascript 사용.
 * Mac mini에서 Claude Code 실행 중일 때 즉시 알림.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export interface MacNotifyOptions {
  title: string;
  message: string;
  subtitle?: string;
  sound?: "default" | "Ping" | "Hero" | "Glass" | "Submarine" | string;
}

/** osascript display notification — macOS 알림 센터에 표시 */
export async function notifyMac(opts: MacNotifyOptions): Promise<{ ok: boolean; error?: string }> {
  const escape = (s: string) => s.replace(/"/g, '\\"').replace(/\n/g, " ");
  const parts: string[] = [`display notification "${escape(opts.message)}" with title "${escape(opts.title)}"`];
  if (opts.subtitle) parts.push(`subtitle "${escape(opts.subtitle)}"`);
  if (opts.sound) parts.push(`sound name "${opts.sound}"`);
  const script = parts.join(" ");

  try {
    await execFileP("osascript", ["-e", script]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
