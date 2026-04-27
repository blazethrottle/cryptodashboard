/**
 * git commit/push 헬퍼 — LLM-Wiki 운영 규칙 ("1 ingest = 1 commit = 1 push") 지원.
 * Default off — 사용자가 명시적으로 --commit 또는 --push 플래그 지정 시에만 동작.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

async function git(repo: string, args: string[]): Promise<string> {
  const { stdout } = await execFileP("git", args, { cwd: repo, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

async function gitSafe(repo: string, args: string[]): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  try {
    const { stdout, stderr } = await execFileP("git", args, { cwd: repo, maxBuffer: 10 * 1024 * 1024 });
    return { stdout: stdout.trim(), stderr: stderr.trim(), ok: true };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { stdout: (e.stdout ?? "").trim(), stderr: (e.stderr ?? "").trim(), ok: false };
  }
}

export interface CommitSummary {
  changed: number;
  message: string;
  pushed: boolean;
}

/**
 * git status -s 로 변경 감지 → add . + commit + (옵션) push.
 * 변경 없으면 no-op.
 */
export async function commitAndPush(
  repo: string,
  message: string,
  push: boolean,
): Promise<string> {
  const status = await git(repo, ["status", "--porcelain"]);
  if (!status) {
    return "변경 없음 — commit skipped";
  }

  const changed = status.split("\n").filter((l) => l.trim()).length;
  await git(repo, ["add", "-A"]);

  // commit
  const commit = await gitSafe(repo, ["commit", "-m", message]);
  if (!commit.ok) {
    return `commit 실패: ${commit.stderr}`;
  }

  if (!push) {
    return `committed ${changed} files: "${message}" — push 안 함 (--push 추가하면 원격 반영)`;
  }

  const pushRes = await gitSafe(repo, ["push", "origin", "main"]);
  if (!pushRes.ok) {
    return `committed ${changed} files but push 실패: ${pushRes.stderr}`;
  }

  return `committed ${changed} files + pushed: "${message}"`;
}
