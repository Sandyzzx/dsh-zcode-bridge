import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { TaskStore } from "codex-zcode-bridge/core";
import { fixture, delay } from "./fixtures.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
type Fixture = Awaited<ReturnType<typeof fixture>>;

async function connect(f: Fixture) {
  const install = path.join(f.root, "bundle");
  await cp(path.join(root, "plugins/dsh-zcode-bridge"), install, { recursive: true });
  const env = Object.fromEntries(Object.entries(f.env).filter((pair): pair is [string, string] => typeof pair[1] === "string"));
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(install, "server/bridge.mjs")], cwd: install, env, stderr: "pipe" });
  transport.stderr?.on("data", () => {});
  const client = new Client({ name: "dsh-lifecycle-test", version: "1" }, { capabilities: {} });
  await client.connect(transport);
  const tool = async (name: string, args: Record<string, unknown> = {}): Promise<Record<string, any>> => {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    assert.ok(result.structuredContent);
    return result.structuredContent as Record<string, any>;
  };
  return { client, tool };
}

async function waitFor<T>(read: () => Promise<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 12_000;
  while (true) {
    const value = await read();
    if (ready(value)) return value;
    if (Date.now() >= deadline) throw new Error(`fixture wait timed out: ${JSON.stringify(value)}`);
    await delay(30);
  }
}

function task(workspace: string, id = "host-task", worktree?: string) {
  return { task_id: id, workspace, objective: "Return the fixture report", requirements: [], allowed_paths: [], forbidden_paths: [], acceptance_criteria: [], test_commands: [], ...(worktree ? { worktree_path: worktree } : {}) };
}

test("isolated installed bundle executes and resumes through its own worker and preserves project identity", { timeout: 35_000 }, async () => {
  const f = await fixture();
  const { client, tool } = await connect(f);
  try {
    const project = path.join(f.root, "project");
    const worktree = path.join(f.root, "execution");
    await mkdir(project); await mkdir(worktree);
    await tool("zcode_task", task(project, "host-task", worktree));
    const status = await waitFor(() => tool("zcode_status", { task_id: "host-task" }), (s) => s.status === "completed" || s.status === "failed");
    assert.equal(status.status, "completed");
    const first = await tool("zcode_result", { task_id: "host-task" });
    assert.equal(first.session_id, "dsh-session");
    assert.equal(first.summary, "dsh fixture completed");
    await tool("zcode_continue", { task_id: "host-task", feedback: "Verify this follow-up" });
    const continued = await waitFor(() => tool("zcode_status", { task_id: "host-task" }), (s) => s.status === "completed" || s.status === "failed");
    assert.equal(continued.status, "completed");
    assert.equal(continued.attempt, 2);
    const requests = (await readFile(f.log, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    const creates = requests.filter((r) => r.method === "session/create" || r.method === "session/resume");
    assert.ok(creates.some((r) => r.method === "session/create"));
    assert.ok(creates.some((r) => r.method === "session/resume"));
    for (const request of creates) assert.deepEqual(request.params.workspace, { workspacePath: worktree, workspaceKey: project });
    const store = new TaskStore(f.config.ZCODE_BRIDGE_DATA_DIR);
    assert.equal(store.readStatus("host-task").worker_pid, null);
    assert.equal(store.readStatus("host-task").zcode_pid, null);
    assert.equal(store.readArchivedResult("host-task", 1)?.session_id, "dsh-session");
  } finally { await client.close(); await f.cleanup(); }
});

test("permission replies reach detached bundled workers and remain attempt scoped on continuation", { timeout: 35_000 }, async () => {
  const f = await fixture(true);
  const { client, tool } = await connect(f);
  try {
    await tool("zcode_task", task(f.root));
    let previous = "";
    for (const attempt of [1, 2]) {
      if (attempt === 2) await tool("zcode_continue", { task_id: "host-task", feedback: "Repeat permission fixture" });
      const events = await waitFor(() => tool("zcode_events", { task_id: "host-task", after_seq: 0, limit: 200 }), (page) => page.events.some((event: any) => event.type === "interaction_requested" && String(event.details?.request_id).startsWith(`${attempt}:`)));
      const id = events.events.find((event: any) => event.type === "interaction_requested" && String(event.details?.request_id).startsWith(`${attempt}:`)).details.request_id;
      assert.notEqual(id, previous);
      await tool("zcode_interaction_reply", { task_id: "host-task", request_id: id, decision: "allow" });
      const status = await waitFor(() => tool("zcode_status", { task_id: "host-task" }), (s) => s.status === "completed" || s.status === "failed");
      assert.equal(status.status, "completed");
      previous = id;
    }
    const requests = (await readFile(f.log, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    assert.equal(requests.filter((r) => r.id === "permission" && r.result).length, 2);
  } finally { await client.close(); await f.cleanup(); }
});

test("cancelling an installed bundle worker ends a pending permission and yields cancelled result", { timeout: 30_000 }, async () => {
  const f = await fixture(true);
  const { client, tool } = await connect(f);
  try {
    await tool("zcode_task", task(f.root));
    await waitFor(() => tool("zcode_events", { task_id: "host-task", after_seq: 0 }), (page) => page.events.some((event: any) => event.type === "interaction_requested"));
    await tool("zcode_cancel", { task_id: "host-task" });
    const status = await waitFor(() => tool("zcode_status", { task_id: "host-task" }), (s) => s.status === "cancelled");
    assert.equal(status.worker_pid, null);
    const result = await tool("zcode_result", { task_id: "host-task" });
    assert.equal(result.status, "cancelled");
    assert.equal(result.session_id, "dsh-session");
  } finally { await client.close(); await f.cleanup(); }
});

test("catalog cache and model defaults use dsh settings and preserve Codex configuration", { timeout: 30_000 }, async () => {
  const f = await fixture();
  const codexDirectory = path.join(f.home, ".codex", "codex-zcode-bridge");
  await mkdir(codexDirectory, { recursive: true });
  const original = JSON.stringify({ ZCODE_BRIDGE_DEFAULT_PROVIDER_ID: "codex", ZCODE_BRIDGE_DEFAULT_MODEL_ID: "codex-only" });
  await writeFile(path.join(codexDirectory, "runtime-config.json"), original);
  const { client, tool } = await connect(f);
  try {
    const catalog = await tool("zcode_model_catalog", { workspace: f.root });
    assert.equal(catalog.models[0].model_id, "fake");
    await tool("zcode_set_default_model", { provider_id: "fake", model_id: "fake" });
    assert.equal((await tool("zcode_default_model")).model.model_id, "fake");
    assert.equal(await readFile(path.join(codexDirectory, "runtime-config.json"), "utf8"), original);
    assert.ok((await readdir(f.settings)).some((name) => name.includes("catalog")));
    assert.deepEqual(await readdir(codexDirectory), ["runtime-config.json"]);
    const config = JSON.parse(await readFile(path.join(f.settings, "runtime-config.json"), "utf8"));
    assert.equal(config.ZCODE_BRIDGE_MODE, "build");
    await tool("zcode_clear_default_model");
    assert.equal((await tool("zcode_default_model")).configured, false);
    assert.equal(await readFile(path.join(codexDirectory, "runtime-config.json"), "utf8"), original);
  } finally { await client.close(); await f.cleanup(); }
});
