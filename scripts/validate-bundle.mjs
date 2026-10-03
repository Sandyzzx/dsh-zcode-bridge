// Structural validation for the dsh bundle in plugins/dsh-zcode-bridge.
// Parses cordis.patch.yml with the Loader's `!!js` tag semantics, checks the
// bundle manifest and display metadata, and confirms the built artifacts are
// present and self-contained. Run after `npm run build`.
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleRoot = path.join(root, "plugins", "dsh-zcode-bridge");

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is missing or invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Mirrors the Loader's JS-expression tag: the YAML scalar becomes { __jsExpr }.
// `!!js` expands to tag:yaml.org,2002:js, which is what cordis's loader maps.
const jsTag = {
  tag: "tag:yaml.org,2002:js",
  resolve: (value) => ({ __jsExpr: value }),
};

const pkg = await readJson(path.join(root, "package.json"), "package.json");
const bundle = await readJson(path.join(bundleRoot, "package.json"), "bundle package.json");

if (bundle.name !== "dsh-zcode-bridge") {
  throw new Error("bundle package.json name must be dsh-zcode-bridge");
}
if (bundle.version !== pkg.version) {
  throw new Error(`bundle package.json version must match package.json (${pkg.version})`);
}
if (bundle.type !== "module" || bundle.private !== true) {
  throw new Error("bundle package.json must be a private ES module");
}
const patchRelPath = bundle.dsh?.bundle?.patch;
if (typeof patchRelPath !== "string" || !patchRelPath.startsWith("./")) {
  throw new Error("bundle package.json must declare dsh.bundle.patch as a relative path");
}
if (!bundle.files?.includes("cordis.patch.yml") || !bundle.files?.includes("SECURITY.md")) {
  throw new Error("bundle files must include its activation patch and security policy");
}
const patchPath = path.join(bundleRoot, patchRelPath);
await access(patchPath);
if (bundle.icon) {
  const iconPath = path.join(bundleRoot, bundle.icon);
  const iconStat = await stat(iconPath).catch(() => null);
  if (!iconStat?.isFile()) throw new Error(`bundle icon does not exist: ${bundle.icon}`);
  if (iconStat.size > 256 * 1024) throw new Error("bundle icon exceeds the 256 KiB limit");
}

const patchDoc = parse(await readFile(patchPath, "utf8"), { customTags: [jsTag] });
if (!Array.isArray(patchDoc) || patchDoc.length !== 1 || !patchDoc[0] || typeof patchDoc[0] !== "object") {
  throw new Error("cordis.patch.yml must be a single-entry insert list");
}
const insertList = patchDoc[0].insert;
if (!Array.isArray(insertList) || insertList.length !== 1) {
  throw new Error("cordis.patch.yml must insert exactly one row");
}
const row = insertList[0];
if (row.id !== "zcode-bridge-mcp") {
  throw new Error("patch row id must be zcode-bridge-mcp");
}
if (row.name !== "@deepseek-ai/dsh-mcp-client") {
  throw new Error("patch row must insert the shipped @deepseek-ai/dsh-mcp-client");
}
const config = row.config ?? {};
if (config.serverName !== "zcode_bridge") {
  throw new Error("patch config.serverName must be zcode_bridge (pattern [A-Za-z0-9_-]{1,32})");
}
if (config.transport !== "stdio") {
  throw new Error("patch config transport must be stdio");
}
const command = typeof config.command === "string" ? config.command : config.command?.__jsExpr;
if (typeof command !== "string" || !(command === "node" || command === "process.execPath")) {
  throw new Error("patch config.command must launch Node (bare command or !!js process.execPath)");
}
if (config.env?.ZCODE_BRIDGE_PLUGIN_MODE !== "1") {
  throw new Error("patch config.env must set ZCODE_BRIDGE_PLUGIN_MODE=1");
}
if (config.failOnStartupError !== true) {
  throw new Error("patch config.failOnStartupError must be true so a broken Bridge rejects activation");
}
const serverArg = Array.isArray(config.args) ? config.args[0] : undefined;
if (typeof serverArg === "string" && !serverArg.includes("server/bridge.mjs")) {
  throw new Error("patch args must point at server/bridge.mjs");
}
if (serverArg && typeof serverArg === "object" && typeof serverArg.__jsExpr === "string" && !serverArg.__jsExpr.includes("server/bridge.mjs")) {
  throw new Error("patch args expression must build the server/bridge.mjs path");
}

for (const relativePath of [
  "server/bridge.mjs",
  "worker/worker-main.mjs",
  "locale/en.json",
  "locale/zh.json",
  "README.md",
  "LICENSE",
  "NOTICE",
  "SECURITY.md",
]) {
  await access(path.join(bundleRoot, relativePath));
}

for (const locale of ["en", "zh"]) {
  const meta = await readJson(path.join(bundleRoot, "locale", `${locale}.json`), `locale/${locale}.json`);
  if (typeof meta.meta?.title !== "string" || typeof meta.meta?.description !== "string") {
    throw new Error(`locale/${locale}.json must contain meta.title and meta.description`);
  }
}

const serverBundle = await readFile(path.join(bundleRoot, "server", "bridge.mjs"), "utf8");
const workerBundle = await readFile(path.join(bundleRoot, "worker", "worker-main.mjs"), "utf8");
const corePin = await readJson(path.join(root, "vendor/core-lock.json"), "shared core provenance");
for (const [label, text] of [["server/bridge.mjs", serverBundle], ["worker/worker-main.mjs", workerBundle]]) {
  if (!text.includes(`// Shared core: ${corePin.repository} at ${corePin.commit}`)) {
    throw new Error(`${label} was built from a different core pin; run npm run build`);
  }
  if (/from\s+["'](?!node:)[^][./@]/.test(text)) {
    throw new Error(`${label} must be self-contained (no bare module imports)`);
  }
}
if (!serverBundle.includes("dsh-zcode-bridge")) {
  throw new Error("server/bridge.mjs should carry the dsh-zcode-bridge server name");
}
const serverVersions = [...serverBundle.matchAll(/var (SERVER_VERSION\d*) = "([^"]+)";(?: (\/\/ x-release-please-version))?/g)];
if (serverVersions.length === 0 || serverVersions.some(([, , version]) => version !== pkg.version)) {
  throw new Error("bundle server versions differ from host package");
}
if (serverVersions.some(([, , , marker]) => marker !== "// x-release-please-version")) {
  throw new Error("bundle server versions must all be marked for Release Please updates");
}

console.log(`dsh bundle is structurally valid (${bundle.name}@${bundle.version}).`);
