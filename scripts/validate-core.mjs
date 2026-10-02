import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pin = JSON.parse(await readFile(path.join(root, "vendor/core-lock.json"), "utf8"));
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
if (!/^[a-f0-9]{40}$/.test(pin.commit) || !/^vendor\/codex-zcode-bridge-[\w.-]+\.tgz$/.test(pin.artifact)) throw new Error("invalid core pin");
if (pkg.dependencies["codex-zcode-bridge"] !== `file:${pin.artifact}`) throw new Error("core dependency disagrees with provenance pin");
const hash = createHash("sha256").update(await readFile(path.join(root, pin.artifact))).digest("hex");
if (hash !== pin.sha256) throw new Error("core artifact checksum mismatch");
if (lock.packages["node_modules/codex-zcode-bridge"]?.integrity !== pin.integrity) throw new Error("npm lock disagrees with core integrity");
const installedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.resolve("codex-zcode-bridge/core"))), "../..");
const installed = JSON.parse(await readFile(path.join(installedRoot, "package.json"), "utf8"));
if (installed.version !== pin.version) throw new Error("installed core version mismatch; run npm ci");
for (const [relative, expected] of Object.entries(pin.modules)) {
  if (!relative.startsWith("dist/src/") || relative.includes("..")) throw new Error("invalid pinned module path");
  const actual = createHash("sha256").update(await readFile(path.join(installedRoot, relative))).digest("hex");
  if (actual !== expected) throw new Error(`installed core module drift: ${relative}; run npm ci`);
}
console.log(`Shared core verified: ${pin.version} at ${pin.commit.slice(0, 7)} (${Object.keys(pin.modules).length} modules).`);
