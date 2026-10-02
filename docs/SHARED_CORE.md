# 共享核心接入与升级

本项目只维护 DeepSeek Harness 宿主适配，不再复制任务管理、存储、ZCode 协议和 MCP 工具实现。核心来自 `codex-zcode-bridge/core` 的公共导出。

`vendor/core-lock.json` 记录上游仓库、完整提交 SHA、核心包版本、tarball SHA-256、npm integrity 和编译模块哈希。核心是 private 包，暂不依赖 npm 发布：锁定的 tarball 随仓库保存，`npm ci` 在独立机器上安装它，esbuild 将其打进自包含 bundle。宿主版本与核心版本独立；同一个核心 package version 的不同提交使用不同文件名与校验值。

## 宿主边界

- `src/host/profile.ts`：dsh 身份、版本、instructions、配置路径和显式旧配置回退。
- `src/mcp/main.ts`：调用共享 `startBridge`，传入绝对 worker 入口；保留 realpath 判断，支持 profile 安装中的 junction/symlink。
- `src/worker/worker-main.ts`：校验 `dataRoot taskId attempt` 和传入的宿主 profile，调用共享 `runWorkerTask`。
- Cordis patch、bundle manifest、locale、安装文档、发布配置由 dsh 独立维护。

共享逻辑的修复先进入上游，再更新制品；不要在 dsh 添加公共模块副本或依赖核心内部路径。此前重复的核心单元测试也由上游维护，历史仍在 Git 中。dsh 测试覆盖公共入口的实际宿主组合与安装制品：stdio、junction、自包含启动、worker、续跑、权限往返、取消、项目/worktree 身份、配置回退、模型缓存和默认模型隔离。

## 配置与数据归属

canonical 配置、默认任务数据和模型缓存位于 `~/.dsh/zcode-bridge`。独立源码启动也使用该目录，避免把任务写入依赖包安装目录。旧 Codex `runtime-config.json` 只在 dsh 文件不存在时读取；存在但损坏的 dsh 文件报错，不回退到 yolo。首次修改默认模型会把旧设置完整复制到 dsh 并保留未知字段，不修改 Codex 文件。

不自动迁移 `.tasks` 或 Codex 模型缓存。若旧配置显式设置 `ZCODE_BRIDGE_DATA_DIR`，其优先级仍保留，可能指向旧任务目录；需要分开运行时应在 dsh 配置中明确指定独立 data root。共享调度锁只覆盖同一个 data root，不能跨两个独立任务目录协调同一可变工作区。

默认提供 12 个正式工具，实验性 `zcode_progress_probe` 不启用。安装包保持 MCP namespace `zcode_bridge` 与服务器名 `dsh-zcode-bridge`。

## 升级步骤

准备目标上游提交的干净 checkout，先在上游 `npm ci` 并运行共享回归，再在 dsh 执行：

```powershell
npm run core:update -- D:/codex-zcode-bridge FULL_UPSTREAM_COMMIT_SHA
npm ci
npm run typecheck
npm run build
npm test
npm run validate:bundle
git diff --check
```

`core:update` 核对 HEAD 与输入 SHA、拒绝有改动或未跟踪源码的输入，重建核心、生成并记录制品、更新依赖及 lockfile。升级后审查 vendor pin、npm lock、宿主测试和重建的两个 bundle；可删除不再被依赖引用的旧 tarball。无需合并整个上游仓库。构建后的 server/worker 随 dsh 的源码改动一起提交。

本轮通过临时配置和模拟 app-server 验证，不调用真实模型、不写真实 Desktop 数据。真实 Harness 安装、真实 ZCode 权限/UI 往返和 POSIX 进程组清理仍需现场验收。
