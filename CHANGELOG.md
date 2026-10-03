# 更新日志

本文件记录面向用户的变更。版本号遵循语义化版本，并由 Release Please 根据 Conventional Commits 生成发布记录：`fix:` 升补丁号，`feat:` 升次版本号，`BREAKING CHANGE:` 升主版本号。

仓库当前版本基线为 `0.4.0`。提交推送到 `master` 后，Release Please 会在有待发布变更时创建发布 PR，并同步更新版本文件与本日志；合并发布 PR 后会生成对应 Git tag 和 GitHub Release。

## [1.1.0](https://github.com/Sandyzzx/dsh-zcode-bridge/compare/dsh-zcode-bridge-v1.0.1...dsh-zcode-bridge-v1.1.0) (2026-10-03)


### Features

* ship ZCode Bridge delegation skill ([#9](https://github.com/Sandyzzx/dsh-zcode-bridge/issues/9)) ([bac49bf](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/bac49bf626651f04f329a3ca8de0fe6b50552d85))

## [1.0.1](https://github.com/Sandyzzx/dsh-zcode-bridge/compare/dsh-zcode-bridge-v1.0.0...dsh-zcode-bridge-v1.0.1) (2026-10-03)


### Bug Fixes

* adapt reliability repair from shared core ([19b2ba5](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/19b2ba52143fdc00399821f33302d0523b949253))
* sync missed event recovery from shared core ([c64a361](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/c64a3610ac859b496269d274707c49fd1e303243))

## [1.0.0](https://github.com/Sandyzzx/dsh-zcode-bridge/compare/dsh-zcode-bridge-v1.0.0...dsh-zcode-bridge-v1.0.0) (2026-10-03)


### ⚠ BREAKING CHANGES

* port codex-zcode-bridge fork to a DeepSeek Harness (dsh) bundle

### Features

* add model catalog controls and refresh plugin branding ([9ac27e2](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/9ac27e2b654bd6cc11dd99981e134ae9671d838f))
* add setup diagnostics and task reliability coverage ([fbcf756](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/fbcf75663811e2a59aabdb49b6feaf224b3d8448))
* add setup diagnostics and task reliability coverage ([14a8654](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/14a865485c33eb78964f6350a783636e8ba57a00))
* add setup diagnostics and task reliability coverage ([#3](https://github.com/Sandyzzx/dsh-zcode-bridge/issues/3)) ([fbcf756](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/fbcf75663811e2a59aabdb49b6feaf224b3d8448))
* configure marketplace plugin icons ([b0fbf0b](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/b0fbf0b80181c8adbead69c57b596025b21156bf))
* consume pinned shared bridge core ([0c31abf](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/0c31abfa57dd25ba1c8208bcab894a948783f4af))
* **manager:** respawn a worker that dies before writing any task state ([995e476](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/995e47635166d9cf5a843c277ed3c4041f9cf2ff))
* port codex-zcode-bridge fork to a DeepSeek Harness (dsh) bundle ([d6909c3](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/d6909c3537cd95642599a80a3f60b512e46f0f39))
* relay ZCode interaction requests to Codex ([fd6b1b3](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/fd6b1b35d86acfe43591e769900dbd75ba5ef5a5))
* report active reasoning level at task startup ([2697c58](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/2697c582c7c86bf1eaf25a14c1a0f27345cf9374))
* save runtime settings and automate releases ([4f09416](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/4f094167bee3e8924a03458347e4d30437c8432e))


### Bug Fixes

* avoid double-prefixing account provider IDs ([6175e45](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/6175e45f2c8dc9825d08d109517cf23aa6f59f15))
* **bundle:** survive junction installs and non-profile launches ([cc1e221](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/cc1e221345c3540b251c5de53da23cd65d57cfa7))
* **ci:** verify committed bridge bundle ([ed4dead](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/ed4deadf7719682fcc534ce38d003ef4c1619143))
* compare worktree roots independent of path aliases ([d25739c](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/d25739c9bbf49baef124cda334aaf033360c78fb))
* include loader asset in test build ([28cfb72](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/28cfb7201c9174a0907667eee80be0995e9ba444))
* **manager:** cold-start grace window before finalizing worker_lost ([5ca5875](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/5ca5875a0eb40e5d6749ee7f20c80deee032b766))
* **plugin:** avoid false shell injection finding ([909a428](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/909a4285fce9df26816c8071abf9b95d274fe379))
* **plugin:** prepare scanner-ready marketplace bundle ([26d18ff](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/26d18ffa8e7ec528693eb1830332acb46c33aeb0))
* **scripts:** accept process.execPath command form in bundle validation ([d5412e5](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/d5412e52e3e4d774fc7de784306ac94cd8eb33b0))
* sync cooperative worker cancellation from shared core ([dcf48bc](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/dcf48bcc211e6bf500f676ca3d01796af491a377))
* sync plugin version for 0.7.0 release ([2a76674](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/2a76674e6af90dd489e570549a32ea7095d3a35a))
* sync retry-safe scheduling from shared core ([f7997db](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/f7997db45fb7f807bc7b1a2bcc8f3665bef84bb5))
* update codex plugin manifest on release ([f2af48c](https://github.com/Sandyzzx/dsh-zcode-bridge/commit/f2af48c3b425376fd3d66490b06ab34190c07c7e))

## [1.0.0](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.10.1...codex-zcode-bridge-v1.0.0) (2026-09-30)


### Bug Fixes

* **ci:** verify committed bridge bundle ([ed4dead](https://github.com/Sandyzzx/codex-zcode-bridge/commit/ed4deadf7719682fcc534ce38d003ef4c1619143))
* **plugin:** avoid false shell injection finding ([909a428](https://github.com/Sandyzzx/codex-zcode-bridge/commit/909a4285fce9df26816c8071abf9b95d274fe379))

## [0.10.1](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.10.0...codex-zcode-bridge-v0.10.1) (2026-09-30)


### Bug Fixes

* **plugin:** prepare scanner-ready marketplace bundle ([26d18ff](https://github.com/Sandyzzx/codex-zcode-bridge/commit/26d18ffa8e7ec528693eb1830332acb46c33aeb0))

## [0.10.0](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.9.0...codex-zcode-bridge-v0.10.0) (2026-09-30)


### Features

* configure marketplace plugin icons ([b0fbf0b](https://github.com/Sandyzzx/codex-zcode-bridge/commit/b0fbf0b80181c8adbead69c57b596025b21156bf))

## [0.9.0](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.8.0...codex-zcode-bridge-v0.9.0) (2026-09-30)


### Features

* report active reasoning level at task startup ([2697c58](https://github.com/Sandyzzx/codex-zcode-bridge/commit/2697c582c7c86bf1eaf25a14c1a0f27345cf9374))

## [0.8.0](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.7.2...codex-zcode-bridge-v0.8.0) (2026-09-30)


### Features

* add model catalog controls and refresh plugin branding ([9ac27e2](https://github.com/Sandyzzx/codex-zcode-bridge/commit/9ac27e2b654bd6cc11dd99981e134ae9671d838f))

## [0.7.2](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.7.1...codex-zcode-bridge-v0.7.2) (2026-09-29)


### Bug Fixes

* update codex plugin manifest on release ([f2af48c](https://github.com/Sandyzzx/codex-zcode-bridge/commit/f2af48c3b425376fd3d66490b06ab34190c07c7e))

## [0.7.1](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.7.0...codex-zcode-bridge-v0.7.1) (2026-09-29)


### Bug Fixes

* avoid double-prefixing account provider IDs ([6175e45](https://github.com/Sandyzzx/codex-zcode-bridge/commit/6175e45f2c8dc9825d08d109517cf23aa6f59f15))

## [0.7.0](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.6.0...codex-zcode-bridge-v0.7.0) (2026-09-29)


### Features

* add setup diagnostics and task reliability coverage ([fbcf756](https://github.com/Sandyzzx/codex-zcode-bridge/commit/fbcf75663811e2a59aabdb49b6feaf224b3d8448))
* add setup diagnostics and task reliability coverage ([14a8654](https://github.com/Sandyzzx/codex-zcode-bridge/commit/14a865485c33eb78964f6350a783636e8ba57a00))
* add setup diagnostics and task reliability coverage ([#3](https://github.com/Sandyzzx/codex-zcode-bridge/issues/3)) ([fbcf756](https://github.com/Sandyzzx/codex-zcode-bridge/commit/fbcf75663811e2a59aabdb49b6feaf224b3d8448))


### Bug Fixes

* compare worktree roots independent of path aliases ([d25739c](https://github.com/Sandyzzx/codex-zcode-bridge/commit/d25739c9bbf49baef124cda334aaf033360c78fb))
* include loader asset in test build ([28cfb72](https://github.com/Sandyzzx/codex-zcode-bridge/commit/28cfb7201c9174a0907667eee80be0995e9ba444))

## [0.6.0](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.5.0...codex-zcode-bridge-v0.6.0) (2026-09-28)


### Features

* relay ZCode interaction requests to Codex ([fd6b1b3](https://github.com/Sandyzzx/codex-zcode-bridge/commit/fd6b1b35d86acfe43591e769900dbd75ba5ef5a5))

## [0.5.0](https://github.com/Sandyzzx/codex-zcode-bridge/compare/codex-zcode-bridge-v0.4.0...codex-zcode-bridge-v0.5.0) (2026-09-28)


### Features

* save runtime settings and automate releases ([4f09416](https://github.com/Sandyzzx/codex-zcode-bridge/commit/4f094167bee3e8924a03458347e4d30437c8432e))

## [Unreleased]
