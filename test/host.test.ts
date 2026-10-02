import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, readFile, writeFile, mkdir, symlink, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { codexHostProfile, loadPersistedRuntimeEnvironment, ZCodeModelSettings } from "codex-zcode-bridge/core";
import { dshHostProfile, SERVER_NAME, SERVER_VERSION, SERVER_INSTRUCTIONS } from "../src/host/profile.js";
import { workerEntryPath } from "../src/mcp/main.js";
import { fixture } from "./fixtures.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const compiled = fileURLToPath(new URL("../src/mcp/main.js", import.meta.url));
const bundle = path.join(root, "plugins/dsh-zcode-bridge/server/bridge.mjs");
const protocol = [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "host-test", version: "1" } } },
  { jsonrpc: "2.0", method: "notifications/initialized" },
  { jsonrpc: "2.0", id: 2, method: "tools/list" },
].map((m) => JSON.stringify(m)).join("\n") + "\n";

function probe(entry: string, env: NodeJS.ProcessEnv) {
  const run = spawnSync(process.execPath, [entry], { input: protocol, env, encoding: "utf8", timeout: 15_000, windowsHide: true });
  assert.equal(run.status, 0, run.stderr);
  const responses = run.stdout.trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const init = responses.find((m) => m.id === 1)?.result;
  assert.deepEqual(init?.serverInfo, { name: SERVER_NAME, version: SERVER_VERSION });
  assert.equal(init.instructions, SERVER_INSTRUCTIONS);
  const names = responses.find((m) => m.id === 2)?.result.tools.map((t: { name: string }) => t.name);
  assert.equal(names.length, 12);
  assert.ok(names.includes("zcode_task") && names.includes("zcode_interaction_reply"));
  assert.ok(!names.includes("zcode_progress_probe"));
  assert.match(run.stderr, /dsh-zcode-bridge stdio MCP server ready/);
  assert.doesNotMatch(run.stdout, /\[bridge\]/);
  return run;
}

test("profile owns dsh paths, instructions and the explicit legacy fallback", async () => {
  const f = await fixture();
  try {
    const host = dshHostProfile(f.home, path.join(f.root, "worker.mjs"));
    assert.equal(host.settingsDirectory, f.settings);
    assert.equal(host.defaultDataRoot, f.settings);
    assert.equal(host.workerEntryPath, path.join(f.root, "worker.mjs"));
    assert.deepEqual(host.legacySettingsDirectories, [codexHostProfile(f.home).settingsDirectory]);
  } finally { await f.cleanup(); }
});

test("worker location follows compiled and bundled layouts without plugin-mode guessing", () => {
  assert.equal(workerEntryPath(pathToFileURL(path.join(root, "dist/src/mcp/main.js")).href), path.join(root, "dist/src/worker/worker-main.js"));
  assert.equal(workerEntryPath(pathToFileURL(bundle).href), path.join(root, "plugins/dsh-zcode-bridge/worker/worker-main.mjs"));
});

test("canonical dsh config takes precedence; malformed config cannot fall back to Codex", async () => {
  const f = await fixture();
  try {
    const host = dshHostProfile(f.home);
    const legacy = path.join(host.legacySettingsDirectories![0]!, "runtime-config.json");
    await mkdir(path.dirname(legacy), { recursive: true });
    await writeFile(legacy, JSON.stringify({ ZCODE_BRIDGE_MODE: "yolo" }));
    assert.equal(loadPersistedRuntimeEnvironment({}, f.home, host).ZCODE_BRIDGE_MODE, "build");
    await writeFile(path.join(f.settings, "runtime-config.json"), "{broken");
    assert.throws(() => loadPersistedRuntimeEnvironment({}, f.home, host), /invalid Bridge runtime settings/);
    const run = spawnSync(process.execPath, [compiled], { input: protocol, env: f.env, encoding: "utf8", timeout: 10_000 });
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
  } finally { await f.cleanup(); }
});

test("legacy defaults migrate only into dsh and preserve original Codex settings", async () => {
  const f = await fixture();
  try {
    const host = dshHostProfile(f.home);
    const canonical = path.join(f.settings, "runtime-config.json");
    const { unlink } = await import("node:fs/promises");
    await unlink(canonical);
    const legacy = path.join(host.legacySettingsDirectories![0]!, "runtime-config.json");
    await mkdir(path.dirname(legacy), { recursive: true });
    const original = JSON.stringify({ ZCODE_BRIDGE_MODE: "build", extension: { keep: true }, ZCODE_BRIDGE_DEFAULT_PROVIDER_ID: "legacy", ZCODE_BRIDGE_DEFAULT_MODEL_ID: "old" });
    await writeFile(legacy, original);
    const settings = new ZCodeModelSettings({}, { homeDir: f.home, host });
    assert.equal((await settings.getDefaultModel()).model?.model_id, "old");
    await settings.setDefaultModel({ provider_id: "dsh", model_id: "new" });
    assert.equal(await readFile(legacy, "utf8"), original);
    const current = JSON.parse(await readFile(canonical, "utf8"));
    assert.equal(current.ZCODE_BRIDGE_DEFAULT_MODEL_ID, "new");
    assert.deepEqual(current.extension, { keep: true });
    assert.equal((await new ZCodeModelSettings({}, { homeDir: f.home, host: codexHostProfile(f.home) }).getDefaultModel()).model?.model_id, "old");
  } finally { await f.cleanup(); }
});

for (const [label, entry] of [["compiled", compiled], ["bundle", bundle]] as const) {
  test(`${label} entry speaks MCP with dsh identity and instructions`, async () => {
    const f = await fixture();
    try { probe(entry, f.env); } finally { await f.cleanup(); }
  });
}

test("copied bundle runs without source, dist or node_modules, including a junction launch", async () => {
  const f = await fixture();
  try {
    const install = path.join(f.root, "installed");
    await cp(path.join(root, "plugins/dsh-zcode-bridge"), install, { recursive: true });
    assert.ok(!(await readdir(install)).includes("node_modules"));
    probe(path.join(install, "server/bridge.mjs"), f.env);
    const link = path.join(f.root, "profile-bundle");
    await symlink(install, link, process.platform === "win32" ? "junction" : "dir");
    probe(path.join(link, "server/bridge.mjs"), f.env);
  } finally { await f.cleanup(); }
});

test("standalone default data root stays in dsh home rather than the installed core", async () => {
  const f = await fixture();
  try {
    await writeFile(path.join(f.settings, "runtime-config.json"), "{}");
    const run = probe(compiled, f.env);
    assert.ok(run.stderr.includes(`data root: ${f.settings}`));
  } finally { await f.cleanup(); }
});

test("worker rejects missing attempt and a different host profile", async () => {
  const f = await fixture();
  try {
    const entry = path.join(root, "plugins/dsh-zcode-bridge/worker/worker-main.mjs");
    const missing = spawnSync(process.execPath, [entry, f.root, "task"], { env: f.env, encoding: "utf8" });
    assert.equal(missing.status, 2);
    const foreign = spawnSync(process.execPath, [entry, f.root, "task", "1"], { env: { ...f.env, ZCODE_BRIDGE_HOST_PROFILE: JSON.stringify(codexHostProfile(f.home)) }, encoding: "utf8" });
    assert.equal(foreign.status, 1);
    assert.match(foreign.stderr, /requires a dsh/);
  } finally { await f.cleanup(); }
});
