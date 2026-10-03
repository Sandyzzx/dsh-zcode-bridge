import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import "./validate-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleRoot = path.join(repoRoot, "plugins", "dsh-zcode-bridge");
const serverDir = path.join(bundleRoot, "server");
const workerDir = path.join(bundleRoot, "worker");
const corePin = JSON.parse(await readFile(path.join(repoRoot, "vendor/core-lock.json"), "utf8"));
await Promise.all([mkdir(serverDir, { recursive: true }), mkdir(workerDir, { recursive: true })]);

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22.18",
  sourcemap: false,
  packages: "bundle",
  logLevel: "info",
  banner: { js: `// Shared core: ${corePin.repository} at ${corePin.commit}` },
};

await Promise.all([
  build({ ...shared, entryPoints: [path.join(repoRoot, "src", "mcp", "main.ts")], outfile: path.join(serverDir, "bridge.mjs") }),
  build({ ...shared, entryPoints: [path.join(repoRoot, "src", "worker", "worker-main.ts")], outfile: path.join(workerDir, "worker-main.mjs") }),
]);

const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const bridgeBundlePath = path.join(serverDir, "bridge.mjs");
const bridgeBundle = await readFile(bridgeBundlePath, "utf8");
const versionPattern = /var (SERVER_VERSION\d*) = "[^"]+";(?: \/\/ x-release-please-version)?/g;
const versionDeclarations = [...bridgeBundle.matchAll(versionPattern)];
if (versionDeclarations.length === 0) {
  throw new Error("Could not find a bundled SERVER_VERSION declaration.");
}
await writeFile(
  bridgeBundlePath,
  bridgeBundle.replace(
    versionPattern,
    (_declaration, name) => `var ${name} = "${packageJson.version}"; // x-release-please-version`,
  ),
  "utf8",
);

console.log("Built the self-contained dsh bundle MCP server and worker.");
