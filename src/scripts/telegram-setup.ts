/**
 * Telegram chat_id 자동 감지 + .env 작성 + 테스트 메시지 발송.
 *
 *   npm run telegram:setup
 *
 * 흐름:
 *   1. 사용자가 텔레그램에서 봇과 talk 시작 (한 번만)
 *   2. 이 스크립트 실행 → getUpdates → chat_id 추출
 *   3. .env에 TELEGRAM_CHAT_ID 추가 (이미 있으면 갱신)
 *   4. 테스트 메시지 발송
 */

import "dotenv/config";
import dns from "node:dns";
// macOS Node 24 IPv6 timeout 이슈 회피 — Telegram API 호출 시 IPv4 우선
dns.setDefaultResultOrder("ipv4first");

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { detectChatId, sendTelegram } from "../lib/notify/telegram.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ENV_FILE = path.join(REPO_ROOT, ".env");

async function main(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN 미설정. .env 파일에 추가하세요.");
    process.exit(1);
  }

  console.log("🔍 chat_id 자동 감지 (getUpdates)...");
  const { chatId, chats } = await detectChatId(token);

  if (!chatId) {
    console.log("⚠️ 받은 메시지 없음. 사용자분이 텔레그램에서 봇과 talk 시작 후 다시 실행:");
    console.log("   1. 텔레그램 앱 → @Claude_Goodbbot 검색");
    console.log("   2. /start 또는 아무 메시지 1개 보내기");
    console.log("   3. npm run telegram:setup 다시 실행");
    process.exit(1);
  }

  console.log(`✓ 발견된 chat 목록 (${chats.length}):`);
  for (const c of chats) console.log(`  - ${c.id} (${c.name}, ${c.type})`);
  console.log(`✓ 사용할 chat_id: ${chatId}`);

  // .env 갱신
  let envContent = "";
  try {
    envContent = await fs.readFile(ENV_FILE, "utf-8");
  } catch {
    // 새로 생성
  }

  if (envContent.includes("TELEGRAM_CHAT_ID=")) {
    envContent = envContent.replace(/TELEGRAM_CHAT_ID=.*/m, `TELEGRAM_CHAT_ID=${chatId}`);
    envContent = envContent.replace(/^# TELEGRAM_CHAT_ID.*$/m, `TELEGRAM_CHAT_ID=${chatId}`);
  } else {
    envContent += `\nTELEGRAM_CHAT_ID=${chatId}\n`;
  }
  await fs.writeFile(ENV_FILE, envContent);
  console.log(`✓ .env 갱신 완료`);

  // 테스트 메시지
  console.log("📨 테스트 메시지 발송...");
  const testRes = await sendTelegram({
    text: "🤖 *Crypto Dashboard 알림 시스템 셋업 완료*\n\n앞으로 시그널 변경 / Trade Plan 트리거 시 자동 발송됩니다.",
    parseMode: "Markdown",
    chatId,
  });
  if (testRes.ok) {
    console.log(`✓ 테스트 메시지 발송 (message_id ${testRes.messageId})`);
    console.log("📱 텔레그램 확인해주세요.");
  } else {
    console.log(`❌ 발송 실패: ${testRes.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
