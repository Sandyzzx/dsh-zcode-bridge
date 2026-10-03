# dsh-zcode-bridge

DeepSeek Harness (dsh) bundle that connects the local ZCode Bridge MCP server. The delegating agent can submit bounded development tasks to the local ZCode runtime, follow progress, answer permission or input requests, and review the changes before accepting them.

## What is inside

- `cordis.patch.yml` — configuration-only bundle patch. It inserts the shipped `@deepseek-ai/dsh-mcp-client` with one stdio entry (`serverName: zcode_bridge`) that launches `server/bridge.mjs` with Node and sets `ZCODE_BRIDGE_PLUGIN_MODE=1`.
- `server/bridge.mjs` — self-contained MCP server (the Bridge task manager, ZCode adapter, and task store bundled with esbuild).
- `worker/worker-main.mjs` — the detached worker the server spawns per task; the two files must stay siblings of `server/` inside this bundle.
- `locale/` — display metadata for the Plugin Manager.

MCP tools appear to the model as `mcp__zcode_bridge__zcode_task`, `mcp__zcode_bridge__zcode_events`, and the other `zcode_*` tools. The server also publishes MCP instructions that describe the delegation flow and review discipline.

## Requirements

- Node.js 22.18+ on the `PATH` of the machine running dsh (the dsh desktop app ships its own Node runtime and puts it on the child `PATH`).
- Git, and an installed, signed-in ZCode Desktop. Real end-to-end delegation is currently verified on Windows only.

## Install

In a dsh session (Creator mode or the plugin_manager tool):

1. Place this bundle directory on disk (clone the repository and use `plugins/dsh-zcode-bridge`, or install a published release archive).
2. Call `plugin_manager` with `action: install_bundle` and the absolute bundle directory as `target`.
3. Verify with `cordis_inspect_query` or by asking for the `mcp__zcode_bridge__zcode_doctor` tool output.
4. To enable the delegation skill, copy `skills/zcode-bridge/SKILL.md` from the bundle to `%USERPROFILE%\.dsh\skills\zcode-bridge\SKILL.md` (create the directory if needed). The dsh filesystem skill provider discovers user-level skills; the plugin bundle cannot install a global skill automatically.

The patch resolves the server path from `DSH_PROFILE_DIR`, which every profile-launched Harness provides. If activation fails with "DSH_PROFILE_DIR is not set", launch dsh with a profile, or edit `cordis.patch.yml` to hard-code the absolute path to `server/bridge.mjs` in your installation.

## Configuration

First run creates `%USERPROFILE%\.dsh\zcode-bridge\` for task data. Optional settings live in `%USERPROFILE%\.dsh\zcode-bridge\runtime-config.json` (create it manually if needed) using the same keys as the upstream Codex plugin: `ZCODE_BRIDGE_NODE`, `ZCODE_BRIDGE_ZCODE_CJS`, `ZCODE_HOME`, `ZCODE_BRIDGE_DATA_DIR`, `ZCODE_BRIDGE_DEFAULT_PROVIDER_ID`/`ZCODE_BRIDGE_DEFAULT_MODEL_ID`, `ZCODE_BRIDGE_MODE` (`yolo` default, `build` for ZCode approval rules), `ZCODE_BRIDGE_MAX_CONCURRENT_WORKERS` (1–8), and `ZCODE_BRIDGE_TIMEOUT_MS`.

`zcode_doctor` performs read-only setup checks without starting a ZCode session.

## Safety

The default `ZCODE_BRIDGE_MODE` is `yolo`: ZCode runs ordinary tool operations with the current operating system account's permissions, without approval prompts. Worktrees and `allowed_paths`/`forbidden_paths` are task constraints, not an OS sandbox. Set `ZCODE_BRIDGE_MODE` to `build` in `runtime-config.json` to use ZCode's approval rules; permission requests then surface through `zcode_events` and must be answered via `zcode_interaction_reply` only when the user explicitly authorized the action.

See [SECURITY.md](SECURITY.md) and the repository root README for the full threat model.
