# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.15] - 2026-06-28

### Changed

- 升级启发式算法至 `1.3.0-heuristic`
- 新增复述型注释、空行规律性、catch 只 log 不抛等 P0 特征
- 新增 FIXME/debug 等人类痕迹降权，降低误报
- 新增仓库基线校准：相对项目常态偏离的文件获得加分

## [0.1.14] - 2026-06-28

### Changed

- 升级启发式算法至 `1.2.0-heuristic`，提高 AI 特征识别率
- 新增分节注释、逐步讲解式注释等 AI 常见模式
- 多特征共振加权：多个中等信号同时出现时抬高文件分数下限
- 项目 AI 率改为 45% 行加权 + 35% P85 + 20% Top25% 混合，减少被低分文件稀释

## [0.1.13] - 2026-06-28

### Fixed

- 修复 HTML 导出失败：打包时未包含 `default.hbs`，运行时找不到默认模板

## [0.1.12] - 2026-06-28

### Changed

- 扫描开始时自动打开 AI Rate 侧边栏；完成后再次聚焦，便于从命令面板触发后直接查看结果

## [0.1.11] - 2026-06-28

### Fixed

- Activity Bar 图标改回单色 SVG + `fill="currentColor"`（VS Code 将图标当作蒙版，硬编码 `#424242`/`#C5C5C5` 会被忽略导致纯白方块）

## [0.1.10] - 2026-06-28

### Fixed

- Activity Bar 图标改为 VS Code 官方推荐的 light/dark 双色 SVG，修复纯白方块

## [0.1.9] - 2026-06-28

### Changed

- 升级启发式算法至 `1.1.0-heuristic`：新增 AI 标记、结构规整度、现代 TS 类型等特征
- 项目 AI 率改为行级加权与文件 P75 混合，减少低估
- 支持 `.vue`、`.html`、`.css` 等文件的共享特征分析

## [0.1.7] - 2026-06-28

### Fixed

- 修复 Webview CSP 未允许加载 `main.js`，导致「开始扫描」按钮无响应
- 侧边栏按钮改为通过命令触发扫描，更可靠

## [0.1.6] - 2026-06-28

### Fixed

- 侧边栏 Webview 资源移至 `media/webview/`，修复打包后 `.vscodeignore` 排除 `src` 导致面板空白
- Activity Bar 改用单色 SVG 图标，修复彩色 PNG 显示为白块的问题

## [0.1.5] - 2026-06-28

### Changed

- 进一步降低 VS Code 最低版本要求至 `^1.70.0`，兼容更多旧版本

## [0.1.4] - 2026-06-28

### Fixed

- 降低 VS Code 最低版本要求（`^1.125.0` → `^1.85.0`），兼容 1.106.x 等版本

## [0.1.3] - 2026-06-28

### Changed

- 使用自定义扩展图标（128×128 PNG）
- 合并发布 Marketplace 所需的中英双语描述与图标配置

## [0.1.2] - 2026-06-28

### Fixed

- 添加 Marketplace 扩展图标（128×128 PNG，`package.json` 根级 `icon` 字段）
- Activity Bar 图标改为 PNG，确保各平台一致显示

## [0.1.1] - 2026-06-28

### Changed

- 完善 Marketplace 中英文双语 README（功能、原理、配置、免责声明）
- 更新扩展 displayName、description 与 keywords，便于搜索
- 添加 GitHub repository 链接

## [0.1.0] - 2026-06-28

### Added

- 工作区扫描与多语言启发式分析（TypeScript/JavaScript、Python、Java）
- 侧边栏 Webview 结果视图与状态栏指示
- JSON / CSV / HTML 报告导出，支持自定义模板与字段
- 可配置的 include/exclude 规则、高亮阈值、Top N 等选项
- 命令：Scan Workspace、Cancel Scan、Open Results、Export Report
- 打开工作区后可选自动扫描
