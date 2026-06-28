# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
