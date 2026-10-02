import { mkdtempSync, mkdirSync, existsSync, realpathSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const staging = mkdtempSync(path.join(root, ".build-test-"));
const output = path.join(staging, "output");
const target = path.join(root, "dist-test");
const backup = path.join(staging, "previous");
try {
  mkdirSync(output);
  const compiler = createRequire(import.meta.url).resolve("typescript/bin/tsc");
  const run = spawnSync(process.execPath, [compiler, "--project", path.join(root, "tsconfig.test.json"), "--outDir", output], { cwd: root, stdio: "inherit" });
  if (run.status !== 0) throw new Error(`test compilation failed (${String(run.status)})`);
  if (existsSync(target) && realpathSync(target) !== target) throw new Error("test output must be a real in-repository directory");
  if (existsSync(target)) renameSync(target, backup);
  try { renameSync(output, target); }
  catch (error) { if (existsSync(backup)) renameSync(backup, target); throw error; }
} finally {
  if (path.dirname(staging) !== root || realpathSync(staging) !== staging) throw new Error("unexpected test staging path");
  rmSync(staging, { recursive: true, force: true });
}
