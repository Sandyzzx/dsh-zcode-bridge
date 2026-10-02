#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startBridge } from "codex-zcode-bridge/core";
import { dshHostProfile, SERVER_VERSION } from "../host/profile.js";

export function workerEntryPath(moduleUrl = import.meta.url): string {
  const extension = moduleUrl.endsWith(".mjs") ? "mjs" : "js";
  return fileURLToPath(new URL(`../worker/worker-main.${extension}`, moduleUrl));
}

function sameRealPath(moduleUrl: string, entry: string): boolean {
  try {
    const modulePath = realpathSync(fileURLToPath(moduleUrl));
    const entryPath = realpathSync(path.resolve(entry));
    return process.platform === "win32"
      ? modulePath.toLowerCase() === entryPath.toLowerCase()
      : modulePath === entryPath;
  } catch { return false; }
}

if (process.argv[1] && sameRealPath(import.meta.url, process.argv[1])) {
  void startBridge(dshHostProfile(undefined, workerEntryPath()), SERVER_VERSION).catch((error: unknown) => {
    console.error(`[bridge] fatal: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
