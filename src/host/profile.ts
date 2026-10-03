import { homedir } from "node:os";
import path from "node:path";
import type { BridgeHostProfile } from "codex-zcode-bridge/core";

export const SERVER_NAME = "dsh-zcode-bridge";
export const SERVER_VERSION = "1.0.1"; // x-release-please-version

export const SERVER_INSTRUCTIONS = `Delegate bounded development tasks to the local ZCode agent, then track and review them.

Flow: zcode_task to submit (returns a TaskReceipt with task_id), zcode_events to poll progress (use after_seq plus wait_ms up to 25000; interaction_requested events carry pending permission or user-input requests), zcode_result once finished. zcode_continue reuses a task with review feedback; zcode_cancel stops a queued or running task. zcode_doctor gives read-only setup diagnostics. zcode_model_catalog, zcode_default_model, and zcode_set_default_model manage ZCode provider/model selection; per-task model overrides exist in zcode_task.

Monitoring: after submission, follow progress with zcode_events and set wait_ms to 10000–25000 for long polling. Do not use shell commands or Start-Sleep loops to poll; use zcode_status only when an immediate status refresh is needed.

Discipline: workspace is the project root and the ZCode Desktop project identity; pass worktree_path only if you prepared that worktree yourself — the Bridge never creates one. 'completed' means execution finished, not that the work is accepted: independently review the diff and run checks before deciding PASS. Reply to permission requests through zcode_interaction_reply only when the user explicitly authorized the action; otherwise deny or ask the user.`;

export function dshHostProfile(homeDirectory = homedir(), workerEntryPath?: string): BridgeHostProfile {
  const settingsDirectory = path.join(homeDirectory, ".dsh", "zcode-bridge");
  return {
    name: SERVER_NAME,
    settingsDirectory,
    defaultDataRoot: settingsDirectory,
    legacySettingsDirectories: [path.join(homeDirectory, ".codex", "codex-zcode-bridge")],
    instructions: SERVER_INSTRUCTIONS,
    ...(workerEntryPath ? { workerEntryPath } : {}),
  };
}
