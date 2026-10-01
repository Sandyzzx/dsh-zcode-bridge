# dsh-zcode-bridge

DeepSeek Harness（dsh）插件与本地 MCP 服务，用于把明确授权的开发任务交给本机 ZCode Agent 执行。dsh agent 可派发任务、查看进度、选择模型、审查改动并决定是否接收。

> **dsh 派发，ZCode 干活，dsh 审查。**

本项目 fork 自 [codex-zcode-bridge](https://github.com/Sandyzzx/codex-zcode-bridge)（原 Codex 插件），Bridge 核心未变，交付形态改为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) bundle。英文说明见 [README.md](README.md)。

## 工作方式

```text
你
 │  "实现这个功能。"
 ▼
dsh agent ── 派发任务 ──▶ dsh-zcode-bridge ── 启动 / 跟进 ──▶ ZCode Agent
 ▲                                                            │
 └────────── 审查 diff、验证、接收或继续 ◀── 汇报 ──────────────┘
```

bundle 通过 dsh 自带的 `@deepseek-ai/dsh-mcp-client` 注册本地 MCP 服务器，工具以 `mcp__zcode_bridge__zcode_task`、`mcp__zcode_bridge__zcode_events`、`mcp__zcode_bridge__zcode_result` 等 `zcode_*` 名称暴露给模型；服务器还会下发 MCP instructions 说明委派流程与审查纪律。

## 功能

- 在 dsh 中派发、跟踪、续作和取消 ZCode 任务。
- 支持多个项目任务并行；共享执行目录的任务会排队。
- 读取 ZCode 模型目录与思考档位，按任务指定 provider/model，也可配置默认模型。
- 任务启动时报告项目目录、实际执行目录、ZCode session、runtime 报告的模型、思考档位和执行模式。
- ZCode Desktop 任务按项目目录归类；索引同步失败不会中断任务。

## 安装

需要 Node.js 22.18+、Git、已安装并登录的 ZCode，以及 DeepSeek Harness。目前只在 Windows 完成真实 ZCode E2E；macOS 和 Linux 尚未验证。

1. 把本仓库的 `plugins/dsh-zcode-bridge` bundle 目录放到运行 dsh 的机器上（克隆仓库或下载发布包）。
2. 在 dsh 会话中调用 `plugin_manager` 工具，`action: install_bundle`，`target` 传 bundle 目录的绝对路径（Creator 模式下直接说"安装 <路径> 的 bundle"即可）。
3. `application: applied` 后，调用 `mcp__zcode_bridge__zcode_doctor` 验证连接。

`install_bundle` 会把 bundle 复制进 profile 的 node_modules；patch 通过 `DSH_PROFILE_DIR` 计算服务器路径（profile 启动的 Harness 都会提供）。若激活报 "DSH_PROFILE_DIR is not set"，请用 profile 启动 dsh，或把 `cordis.patch.yml` 中的路径改为 `server/bridge.mjs` 的绝对路径。`failOnStartupError: true` 保证 Bridge 启动失败时拒绝激活，而不是静默注册空工具集。

## 配置

任务数据目录为 `%USERPROFILE%\.dsh\zcode-bridge\`（macOS/Linux 为 `~/.dsh/zcode-bridge/`）。可选设置写在该目录的 `runtime-config.json`（不存在可手动创建），键与上游一致：

- `ZCODE_BRIDGE_NODE`：Node.js 绝对路径（仅当 `node` 不在 PATH 时需要）。
- `ZCODE_BRIDGE_ZCODE_CJS`：ZCode runtime 绝对路径。
- `ZCODE_BUILTIN_PROVIDER_CONFIG_FILE` 与 `ZCODE_PERSONAL_PROVIDER_CONFIG_FILE`：builtin 和个人 provider 配置文件绝对路径。
- `ZCODE_HOME`：实际 `.zcode` 数据目录绝对路径。
- `ZCODE_BRIDGE_DATA_DIR`：任务数据目录绝对路径。
- `ZCODE_BRIDGE_DEFAULT_PROVIDER_ID` 与 `ZCODE_BRIDGE_DEFAULT_MODEL_ID`：默认 provider 和 model，必须成对填写。
- `ZCODE_BRIDGE_MODE`：初始执行模式 `plan`/`build`/`edit`/`yolo`，默认 `yolo`；如需 ZCode 审批规则设为 `build`。
- `ZCODE_BRIDGE_TIMEOUT_MS`：单次执行时限，60,000–14,400,000 毫秒，默认 3,600,000。
- `ZCODE_BRIDGE_MAX_CONCURRENT_WORKERS`：并行任务上限 1–8，默认 8。

`ZCODE_HOME` 必须指向 `.zcode` 目录，个人 provider 配置须位于其 `v2/provider_config.json`。请从 ZCode 配置复制 provider/model ID，不要改写 ZCode 的 provider 文件。

## 使用

描述开发任务与验收条件。是否准备 worktree 由 dsh agent 决定：传入 `worktree_path` 则任务在该目录执行，否则直接在项目目录执行。ZCode 不会自动获得完整对话，项目决定和约束应随任务提供。

任务完成后应检查实际 diff 并独立运行验收。`completed` 只表示 ZCode 已报告执行结束，不代表改动已通过审查。若任务遇到影响重要行为的未决事项，ZCode 会先请求指示。

ZCode Desktop 的 Workspace 视图按项目目录归类任务。安装或启动问题可调用 `zcode_doctor` 获取只读诊断。

更完整的委派纪律（轮询模式、交互回复、模型选择规则）见 [docs/BRIDGE_WORKFLOW.zh-CN.md](docs/BRIDGE_WORKFLOW.zh-CN.md)，可改编进你的 `AGENTS.md`。

## 已知问题

- ZCode Desktop 侧栏可能不会立即刷新显示新会话；Bridge 会尽力同步本机任务索引，刷新时机由 Desktop 决定。
- 目前无法通过 Bridge 使用 ZCode Start Plan。

## 安全与限制

- 默认执行模式为 `yolo`：普通工具操作以当前操作系统账户权限运行、不经审批；worktree 不是沙箱。如需 ZCode 审批规则，将 `ZCODE_BRIDGE_MODE` 设为 `build`。权限请求只应在用户明确授权后通过 `zcode_interaction_reply` 放行；真实权限审批往返尚未验证。
- `allowed_paths` 和 `forbidden_paths` 是任务约束说明，不能阻止进程访问其他文件。
- 并行任务会增加本机资源占用和 provider 并发使用。
- dsh-mcp-client 启动 Bridge 前会清洗环境变量中形似凭据的名字（`KEY|PASSWORD|SECRET|TOKEN`）和 `DSH_*`；Bridge 不依赖这些变量（ZCode 读取自己的 provider 配置文件）。Bridge 将 prompt、状态、日志、可见模型输出、事件和结果保存在 `~/.dsh/zcode-bridge/`；请勿在任务或工作区中放入不应发送给模型服务或持久化到本机的数据。
- AskUserQuestion 的 `answers` 以每个问题的完整 `question` 原文为键、答案为值，不能用表头或选项标签作键。

## 源码构建

```sh
npm ci
npm run build
npm run validate:bundle
```

构建产物写入 `plugins/dsh-zcode-bridge/{server,worker}` 并随仓库提交，安装 bundle 无需本地构建。

## Fork 说明

- fork 自 `codex-zcode-bridge` v1.0.0，从 Codex marketplace 插件移植为 dsh bundle。
- Codex 插件面（`.codex-plugin`、`plugin.json`、`mcp.json`、`hooks/`、`skills/`）已移除；dsh 无 hook/skill 通道，首启检查改由 `zcode_doctor`、工具描述和 MCP server instructions 承担。
- 数据目录从 `~/.codex/codex-zcode-bridge/` 迁移到 `~/.dsh/zcode-bridge/`；两者之间不做数据迁移。
- MCP 服务器名为 `dsh-zcode-bridge`；dsh 侧 MCP 命名空间为 `zcode_bridge`。

## 致谢与许可证

进程管理部分参考并改编自 [cc-plugin-codex](https://github.com/hex1n/cc-plugin-codex)；ZCode Desktop 任务索引部分参考并改编自 [zcode-acp](https://github.com/william0wang/zcode-acp)。感谢 [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)、[Zod](https://github.com/colinhacks/zod)、ZCode 项目与 DeepSeek Harness 团队。来源与版权说明见 [NOTICE](NOTICE)。

本项目采用 [Apache License 2.0](LICENSE)。第三方组件仍受其各自许可证约束。
