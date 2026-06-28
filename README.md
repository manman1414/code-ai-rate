# Code AI Rate / 代码 AI 特征统计

**English** | Analyze AI-style code characteristics across your entire workspace — locally, offline, and with exportable compliance reports.

**中文** | 在本地、离线扫描整个工作区，统计代码的 AI 生成特征指标，并导出可用于合规归档的报告。

---

## Overview / 概述

### English

**Code AI Rate** is a VS Code extension designed for **teams and enterprises** that need visibility into the composition of their codebase. It scans your workspace and produces **neutral, statistical metrics** about how closely each file matches common patterns found in AI-generated code — without sending a single byte off your machine.

This is **not** a plagiarism detector or a cheating tool. Scores are **heuristic estimates for reference only** and should never be used as sole evidence for any decision.

**Ideal for:**
- Compliance audits and internal reporting
- Understanding AI-assisted development trends in a repository
- Generating archived reports with audit metadata (timestamp, config snapshot, analyzer version)

**Supported languages (v0.1.x):** TypeScript, JavaScript, Python, Java

---

### 中文

**Code AI Rate** 面向需要了解代码构成、进行合规统计的**团队与企业**。扩展在本地扫描工作区，输出关于各文件与常见 AI 生成代码模式匹配程度的**中性统计指标**，全程**不上传任何代码或数据**。

本工具**不是**抄袭检测器或作弊判定工具。所有分数均为**启发式参考值**，不应作为任何决策的唯一依据。

**适用场景：**
- 合规审计与内部报告
- 了解仓库中 AI 辅助开发的占比趋势
- 导出带审计元数据的归档报告（时间戳、配置快照、算法版本）

**支持语言（v0.1.x）：** TypeScript、JavaScript、Python、Java

---

## Key Features / 核心功能

| Feature / 功能 | English | 中文 |
|----------------|---------|------|
| **Workspace scan** | Scan all matching files in the opened folder with include/exclude globs and `.gitignore` support | 按 include/exclude 规则扫描工作区，尊重 `.gitignore` |
| **Layered metrics** | Line-weighted project AI rate, score distribution (0–30 / 31–60 / 61–100), Top files list | 行级加权项目 AI 率、分数段分布、AI 占比较高文件 Top 列表 |
| **Sidebar UI** | Activity bar panel with progress, summary, distribution chart, clickable file list | 活动栏侧边栏：进度、汇总、分布图、可点击文件列表 |
| **Status bar** | Shows scan progress and final project rate (tap to open results) | 状态栏显示扫描进度与结果（点击打开侧边栏） |
| **Report export** | JSON, CSV, HTML with audit fields; customizable template via `.vscode/code-ai-rate.json` | 导出 JSON / CSV / HTML，含审计字段；支持工作区模板配置 |
| **Auto-scan** | Optional scan 3 seconds after workspace opens (off by default) | 可选：打开工作区 3 秒后自动扫描（默认关闭） |
| **100% local** | No network requests, no telemetry, no cloud API | 零网络请求、零遥测、无云端 API |

---

## How It Works / 工作原理

### English

Each file receives an **AI Feature Score (0–100)** based on local heuristic rules:

**Shared signals (~40%)**
- Comment density
- Generic identifier names (`data`, `result`, `item`, …)
- Structural uniformity (line length variance)
- Boilerplate patterns (repeated imports, try/catch blocks)

**Language-specific signals (~60%)**
- **JS/TS:** JSDoc coverage, async/await + error handling, TODO density
- **Python:** Docstrings, type hints, section separators, `__main__` boilerplate
- **Java:** Javadoc, getter/setter pairs, catch-and-log-only, Service/Impl naming

**Project AI Rate** = line-weighted average of per-file scores.

Every export includes `analyzerVersion`, scan config snapshot, and a configurable disclaimer.

---

### 中文

每个文件会得到 **AI 特征分数（0–100）**，由本地启发式规则计算：

**通用特征（约 40%）**
- 注释密度
- 泛化命名（`data`、`result`、`item` 等）
- 结构均匀性（行长度方差）
- 样板代码（重复 import、try/catch 等）

**语言特化特征（约 60%）**
- **JS/TS：** JSDoc 覆盖率、async/await + 错误处理、TODO 密度
- **Python：** Docstring、type hint、分隔注释、`__main__` 样板
- **Java：** Javadoc、getter/setter、仅 log 的 catch、Service/Impl 命名

**项目 AI 率** = 各文件分数按代码行数加权平均。

每次导出均包含 `analyzerVersion`、扫描配置快照及可配置免责声明。

---

## Quick Start / 快速开始

### English

1. Install **Code AI Rate** from the Marketplace
2. Open a folder (workspace) containing code
3. Click the **AI Rate** icon in the Activity Bar
4. Press **开始扫描 / Scan** (or run `Code AI Rate: Scan Workspace` from the Command Palette)
5. Review metrics in the sidebar; export a report when ready

### 中文

1. 从 Marketplace 安装 **Code AI Rate**
2. 打开包含代码的文件夹（工作区）
3. 点击活动栏 **AI Rate** 图标
4. 点击 **开始扫描**（或命令面板运行 `Code AI Rate: Scan Workspace`）
5. 在侧边栏查看统计结果，需要时导出报告

---

## Commands / 命令

| Command | English | 中文 |
|---------|---------|------|
| `Code AI Rate: Scan Workspace` | Start a full workspace scan | 扫描当前工作区 |
| `Code AI Rate: Cancel Scan` | Cancel an in-progress scan | 取消进行中的扫描 |
| `Code AI Rate: Open Results` | Focus the sidebar results panel | 打开/聚焦结果侧边栏 |
| `Code AI Rate: Export Report` | Export JSON, CSV, or HTML report | 导出 JSON / CSV / HTML 报告 |

---

## Configuration / 配置

Search **Code AI Rate** in VS Code Settings.

| Setting | Default | English | 中文 |
|---------|---------|---------|------|
| `codeAiRate.autoScanOnOpen` | `false` | Auto-scan after workspace opens | 打开工作区后自动扫描 |
| `codeAiRate.includePatterns` | `["**/*"]` | Files to include (glob) | 参与扫描的文件 glob |
| `codeAiRate.excludePatterns` | `node_modules`, `dist`, … | Files to exclude | 排除的路径 |
| `codeAiRate.highlightThreshold` | `70` | Top-list highlight threshold (not an alert) | Top 列表优先展示阈值（非告警） |
| `codeAiRate.topN` | `20` | Number of top files in reports | 报告中 Top 文件数量 |
| `codeAiRate.maxFileSizeKB` | `1024` | Skip files larger than this (KB) | 超大文件跳过阈值 |
| `codeAiRate.exportTemplate` | `""` | Custom Handlebars HTML template path | 自定义 HTML 导出模板 |
| `codeAiRate.exportFields` | all fields | Fields included in export | 导出包含的字段 |
| `codeAiRate.disclaimerText` | built-in | Disclaimer text in reports | 报告免责声明 |

### Workspace export template / 工作区导出模板

Create `.vscode/code-ai-rate.json`:

```json
{
  "export": {
    "companyName": "Your Company",
    "logoPath": "./assets/logo.png",
    "topN": 20,
    "includeFileDetails": true,
    "fields": ["reportMeta", "summary", "topFiles", "fileDetails"],
    "customHeader": "Code AI Feature Statistics Report",
    "customFooter": "Internal use only · Not a determination of authorship"
  }
}
```

---

## Privacy / 隐私

### English

All analysis runs **entirely on your machine**. No source code, metrics, or usage data is transmitted over the network. See [PRIVACY.md](./PRIVACY.md).

### 中文

所有分析**完全在本地执行**，源代码、统计结果和使用数据均不会通过网络传输。详见 [PRIVACY.md](./PRIVACY.md)。

---

## Disclaimer / 免责声明

### English

Results are produced by **heuristic statistical analysis** and are provided **for reference only**. They do **not** determine whether code was written by a human, an AI, or any specific tool. Do not use scores as the sole basis for employment, academic, legal, or compliance decisions.

### 中文

结果由**启发式统计分析**生成，**仅供参考**。分数**不能**判定代码是否由人工、AI 或特定工具编写。请勿将分数作为用工、学术、法律或合规决策的唯一依据。

---

## Development / 开发

```bash
git clone https://github.com/manman1414/code-ai-rate.git
cd code-ai-rate
npm install
npm test
npm run compile
```

Press **F5** to launch the Extension Development Host.

```bash
npm run package   # Build .vsix
```

## License / 许可证

[MIT](./LICENSE)
