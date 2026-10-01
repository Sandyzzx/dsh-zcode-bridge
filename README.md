# dsh-zcode-bridge

**Use ZCode as a coding worker inside DeepSeek Harness (dsh).**

Delegate coding tasks from your dsh agent to the local ZCode Agent. The dsh agent assigns tasks, monitors progress, reviews the resulting changes, and decides whether to accept the work or send it back for another iteration.

> **dsh delegates. ZCode codes. dsh reviews.**

[![CI](https://github.com/Sandyzzx/dsh-zcode-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/Sandyzzx/dsh-zcode-bridge/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22.18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows&logoColor=white)](#)

Forked from [codex-zcode-bridge](https://github.com/Sandyzzx/codex-zcode-bridge) (a Codex plugin); the Bridge core is unchanged and is now delivered as a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) bundle. See [Fork notes](#fork-notes).

[English](README.md) · [简体中文](README.zh-CN.md)

---

## How it works

```text
You
 │  "Implement this feature."
 ▼
dsh agent ── delegates task ──▶ dsh-zcode-bridge ── starts / monitors ──▶ ZCode Agent
 ▲                                                                          │
 └────────── reviews diff, verifies, accepts or continues ◀── reports ──────┘
```

The dsh agent remains responsible for task definition, architecture, review, and acceptance. ZCode handles bounded implementation work in the local development environment. The bundle connects them through an MCP server (registered via the shipped `@deepseek-ai/dsh-mcp-client`) and ZCode's local runtime.

MCP tools appear as `mcp__zcode_bridge__zcode_task`, `mcp__zcode_bridge__zcode_events`, `mcp__zcode_bridge__zcode_result`, and the other `zcode_*` tools. The server also publishes MCP instructions describing the delegation flow and review discipline.

## Features

- Submit, follow, continue, and cancel ZCode tasks from dsh.
- Run tasks across multiple projects concurrently; tasks sharing an execution directory are queued.
- Read the live ZCode model catalog and reasoning levels, select a provider/model per task, and get/set/clear a Bridge default model.
- At startup, report the project directory, execution directory, ZCode session, runtime-reported model and reasoning level, and execution mode.
- Group ZCode Desktop tasks under the delegating project directory; index sync failures do not stop task execution.

## Install

Requires Node.js 22.18+, Git, ZCode installed and signed in, and DeepSeek Harness. Real ZCode E2E has only been completed on Windows; macOS and Linux have not been verified.

### Install the bundle

1. Get the bundle directory `plugins/dsh-zcode-bridge` onto the machine running dsh (clone this repository, or download a release archive).
2. In a dsh session, call the `plugin_manager` tool with `action: install_bundle` and the absolute bundle directory as `target` (Creator mode can do this from a plain instruction such as "install the bundle at <path>").
3. After `application: applied`, verify the connection by calling `mcp__zcode_bridge__zcode_doctor`.

`install_bundle` copies the bundle into the profile's `node_modules`. The patch computes the server path from `DSH_PROFILE_DIR`, which every profile-launched Harness provides; if activation fails with "DSH_PROFILE_DIR is not set", launch dsh with a profile, or edit `cordis.patch.yml` to hard-code the absolute path to `server/bridge.mjs`. Tools appear to the model only after the MCP connection succeeds (`failOnStartupError: true` rejects activation on failure).

### Configuration

Task data lives in `%USERPROFILE%\.dsh\zcode-bridge\` (macOS/Linux: `~/.dsh/zcode-bridge/`). Optional settings go in `runtime-config.json` inside that directory (create it manually if needed). Keep the discovered path fields and change only the values you need:

- `ZCODE_BRIDGE_NODE`: absolute path to Node.js (only needed when `node` is not on PATH).
- `ZCODE_BRIDGE_ZCODE_CJS`: absolute path to the ZCode runtime.
- `ZCODE_BUILTIN_PROVIDER_CONFIG_FILE` and `ZCODE_PERSONAL_PROVIDER_CONFIG_FILE`: absolute paths to the builtin and personal provider config files.
- `ZCODE_HOME`: absolute path to the actual `.zcode` data directory.
- `ZCODE_BRIDGE_DATA_DIR`: absolute path to the Bridge task data directory.
- `ZCODE_BRIDGE_DEFAULT_PROVIDER_ID` and `ZCODE_BRIDGE_DEFAULT_MODEL_ID`: default provider and model IDs; set both.
- `ZCODE_BRIDGE_MODE`: initial execution mode: `plan`, `build`, `edit`, or `yolo`; defaults to `yolo`. `yolo` allows ordinary tool operations with the current operating-system account's permissions. Set it to `build` to use ZCode's approval rules.
- `ZCODE_BRIDGE_TIMEOUT_MS`: default wall-clock limit for one task attempt when `timeout_ms` is omitted; 60,000–14,400,000 milliseconds, default 3,600,000 (60 minutes).
- `ZCODE_BRIDGE_MAX_CONCURRENT_WORKERS`: parallel task limit, 1–8, default 8.

`ZCODE_HOME` must point to the `.zcode` directory, and the personal provider config must be at `v2/provider_config.json` inside it. Copy provider/model IDs from your ZCode configuration, and do not edit ZCode's provider files.

## Use

Describe the development task and its acceptance criteria. The dsh agent decides whether to prepare a worktree, then delegates the task to ZCode. ZCode runs in that worktree when provided, or directly in the project directory otherwise. ZCode does not automatically receive the full conversation, so the delegating agent must include any required project decisions and constraints with the task.

After execution, review the actual diff and run acceptance checks independently. `completed` means ZCode reported the task finished; it does not mean the changes are approved. If an unresolved decision could materially affect behavior, ZCode asks for direction before proceeding on that point.

In ZCode Desktop, find tasks in the Workspace view under the delegating project directory.

For installation or startup problems, call `mcp__zcode_bridge__zcode_doctor` for read-only setup diagnostics. Use `zcode_model_catalog` to read model IDs and reasoning levels, pass `provider_id`/`model_id` in `zcode_task.model` for one task, and manage the default with `zcode_set_default_model` / `zcode_default_model` / `zcode_clear_default_model`.

For richer delegation discipline (polling patterns, interaction replies, model-selection rules), see [docs/BRIDGE_WORKFLOW.zh-CN.md](docs/BRIDGE_WORKFLOW.zh-CN.md); you can adapt it into your `AGENTS.md`.

## Known issues

- The ZCode Desktop sidebar may not immediately show a new session. The Bridge best-effort syncs the local task index; Desktop controls when the list refreshes.
- ZCode Start Plan is currently unavailable through the Bridge.
- A worker gets a 10-second cold-start grace window (`workerStartGraceMs`): within it, a missing or just-exited pid does not immediately finalize `worker_lost`; later reconcile ticks re-check. This prevents several Bridge processes sharing one data root (for example separate Codex and dsh instances) from killing a task during the spawn window; there is still no global lock between processes, so do not submit conflicting tasks in parallel.

## Security and limitations

- The default execution mode is `yolo`. It allows ordinary tool operations with the current operating-system account's permissions; a worktree is not a sandbox. Set `ZCODE_BRIDGE_MODE` to `build` to use ZCode's approval rules. The Bridge has protocol tests for permission forwarding, but a real ZCode permission-approval roundtrip has not been verified.
- A Git worktree isolates the working directory; it is not an operating-system sandbox. `allowed_paths` and `forbidden_paths` describe task constraints but cannot prevent the process from accessing other files or running commands.
- The dsh agent decides whether to create a worktree. The Bridge uses the supplied project directory and optional worktree path; it does not create or remove worktrees.
- Parallel tasks use more local resources and provider capacity.
- The dsh-mcp-client scrubs credential-shaped ambient variables (`KEY|PASSWORD|SECRET|TOKEN`) and `DSH_*` names before spawning the Bridge; the Bridge needs none of them (ZCode reads its own provider config files). The Bridge stores prompts, status, logs, visible model output, events, and results locally in `~/.dsh/zcode-bridge/`. Do not include data in tasks or workspaces if it should not be sent to the selected model service or persisted locally.
- The Bridge uses the local ZCode app-server. Interactions and available events depend on the installed ZCode version. For AskUserQuestion replies, key `answers` by each full `questions[].question` text and use the selected or explicit answer as its value; do not use the header or option label as the key. Only allow permission requests when the user explicitly authorizes the action.

## Build from source

The repository includes TypeScript source for review and self-builds. With Node.js 22.18+:

```sh
npm ci
npm run build
npm run validate:bundle
```

The build writes the self-contained MCP server and worker into `plugins/dsh-zcode-bridge/{server,worker}`; both artifacts are committed so the bundle is installable without a build step.

## Fork notes

- Forked from `codex-zcode-bridge` at v1.0.0 and ported from a Codex marketplace plugin to a dsh bundle.
- Codex plugin surfaces (`.codex-plugin`, `plugin.json`, `mcp.json`, `hooks/`, `skills/`) were removed; dsh has no hook or skill channel, so first-run setup guidance moved to `zcode_doctor`, tool descriptions, and MCP server instructions.
- Bridge data moved from `~/.codex/codex-zcode-bridge/` to `~/.dsh/zcode-bridge/`; no data is migrated between them.
- The MCP server name is `dsh-zcode-bridge`; the dsh MCP server namespace is `zcode_bridge`.

## Acknowledgements and license

Process handling is adapted in part from [cc-plugin-codex](https://github.com/hex1n/cc-plugin-codex); ZCode Desktop task-index integration is adapted in part from [zcode-acp](https://github.com/william0wang/zcode-acp). Thanks to the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), [Zod](https://github.com/colinhacks/zod), the ZCode project, and the DeepSeek Harness team. See [NOTICE](NOTICE) for source and copyright details.

This project is licensed under [Apache License 2.0](LICENSE). Third-party components remain subject to their respective licenses.
