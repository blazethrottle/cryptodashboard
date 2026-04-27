/**
 * Telegram Bot 알림 — @Goodbboybbot
 * 환경 변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 *
 * 구현: curl을 spawn해서 호출 (macOS Node 24 native fetch가 ETIMEDOUT 발생하는 이슈 회피).
 * curl은 Linux + macOS 모두 기본 설치되어 있음 (GitHub Actions ubuntu-latest 포함).
 *
 * 사용처:
 *  - 시그널 변경 (이전 snapshot vs 현재) — 매수·매도·워치 신규 진입
 *  - Trade Plan 트리거 도달 (손절·익절)
 *  - LLM brief 생성 완료 (옵션)
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const API_BASE = "https://api.telegram.org";

async function curlGet(url: string): Promise<unknown> {
  const { stdout } = await execFileP("curl", ["-s", "--max-time", "30", url], { maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout);
}

async function curlPost(url: string, body: unknown): Promise<unknown> {
  const { stdout } = await execFileP(
    "curl",
    ["-s", "--max-time", "30", "-X", "POST", "-H", "Content-Type: application/json", "-d", JSON.stringify(body), url],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

export interface TelegramOptions {
  text: string;
  parseMode?: "MarkdownV2" | "HTML" | "Markdown";
  silent?: boolean;
  token?: string;
  chatId?: string;
}

export interface TelegramResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

export async function sendTelegram(opts: TelegramOptions): Promise<TelegramResult> {
  const token = opts.token ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = opts.chatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN 미설정" };
  if (!chatId) return { ok: false, error: "TELEGRAM_CHAT_ID 미설정" };

  const url = `${API_BASE}/bot${token}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: opts.text,
    disable_notification: opts.silent ?? false,
  };
  if (opts.parseMode) body.parse_mode = opts.parseMode;

  try {
    const data = (await curlPost(url, body)) as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!data.ok) return { ok: false, error: data.description };
    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** chat_id 자동 감지 — getUpdates에서 첫 chat 추출 */
export async function detectChatId(token: string): Promise<{ chatId?: string; chats: Array<{ id: number; name: string; type: string }> }> {
  const data = (await curlGet(`${API_BASE}/bot${token}/getUpdates`)) as {
    ok: boolean;
    result?: Array<{ message?: { chat: { id: number; username?: string; title?: string; first_name?: string; type: string } } }>;
  };
  const chats: Array<{ id: number; name: string; type: string }> = [];
  for (const u of data.result ?? []) {
    const c = u.message?.chat;
    if (!c) continue;
    chats.push({ id: c.id, name: c.username ?? c.title ?? c.first_name ?? `chat_${c.id}`, type: c.type });
  }
  const unique = Array.from(new Map(chats.map((c) => [c.id, c])).values());
  return { chatId: unique[0]?.id.toString(), chats: unique };
}

export function escapeMd(s: string): string {
  return s.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}
