// Run through npm so the current npm CLI is available on Windows as well.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [source, expectedCommit] = process.argv.slice(2);
if (!source || !expectedCommit || !/^[a-f0-9]{40}$/.test(expectedCommit) || !process.env.npm_execpath) throw new Error("usage: npm run core:update -- <clean upstream checkout> <full commit SHA>");
const upstream = realpathSync(source);
const git = (...args) => execFileSync("git", ["-C", upstream, ...args], { encoding: "utf8" }).trim();
if (git("rev-parse", "HEAD") !== expectedCommit) throw new Error("upstream HEAD differs from requested commit");
git("diff", "--exit-code", "HEAD", "--", "src", "package.json", "package-lock.json", "tsconfig.json", "scripts/build-core.mjs");
if (git("ls-files", "--others", "--exclude-standard", "src")) throw new Error("upstream contains untracked source inputs");
const npm = (cwd, ...args) => execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, encoding: "utf8" });
const staging = mkdtempSync(path.join(tmpdir(), "dsh-core-pin-"));
try {
  npm(upstream, "run", "build:core");
  const [packed] = JSON.parse(npm(upstream, "pack", "--pack-destination", staging, "--json"));
  if (packed.name !== "codex-zcode-bridge") throw new Error("unexpected upstream package");
  const artifact = `vendor/codex-zcode-bridge-${packed.version}-${expectedCommit.slice(0, 7)}.tgz`;
  const archive = path.join(staging, packed.filename);
  const modules = Object.fromEntries(packed.files.filter(({ path: relative }) => relative.startsWith("dist/src/")).map(({ path: relative }) => [relative, createHash("sha256").update(readFileSync(path.join(upstream, relative))).digest("hex")]));
  const pin = { repository: "https://github.com/Sandyzzx/codex-zcode-bridge", commit: expectedCommit, version: packed.version, artifact, sha256: createHash("sha256").update(readFileSync(archive)).digest("hex"), integrity: packed.integrity, modules };
  copyFileSync(archive, path.join(root, artifact));
  writeFileSync(path.join(root, "vendor/core-lock.json"), JSON.stringify(pin, null, 2) + "\n");
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  pkg.dependencies["codex-zcode-bridge"] = `file:${artifact}`;
  writeFileSync(path.join(root, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  npm(root, "install", "--ignore-scripts");
  console.log(`Pinned shared core ${expectedCommit}. Run npm run build && npm test && npm run validate:bundle before acceptance.`);
} finally {
  if (path.dirname(staging) !== realpathSync(tmpdir()) || realpathSync(staging) !== staging) throw new Error("unexpected core pin staging path");
  rmSync(staging, { recursive: true, force: true });
}
