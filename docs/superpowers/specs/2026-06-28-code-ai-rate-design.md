# Code AI Rate — VS Code 扩展设计规格

**作者:** Cursor Agent  
**日期:** 2026-06-28  
**状态:** 已批准，待实现

---

## 1. 概述

### 1.1 产品定位

Code AI Rate 是一款可上架 VS Code Marketplace 的扩展，通过**纯本地启发式分析**，统计工作区代码的 AI 生成特征占比，帮助团队了解代码来源构成，支持企业合规审计与归档。

### 1.2 核心原则

- **纯本地**：代码不出本机，零网络请求，零遥测
- **中性表述**：统计与可见性，不做价值判断；不使用「高风险」「疑似作弊」等措辞
- **可审计**：扫描结果与导出报告包含完整审计字段与算法版本
- **辅助参考**：明确标注启发式统计仅供参考，非判定依据

### 1.3 目标用户

团队/企业管理者 — 用于合规审计、统计项目/仓库的 AI 特征代码占比。

### 1.4 MVP 范围

**包含：**
- 工作区级扫描（JS/TS、Python、Java）
- 分层指标：行级占比、文件级分布、AI 占比较高文件 Top 列表
- 侧边栏 UI + 命令面板 + 状态栏
- 本地导出 JSON / CSV / HTML，可配置模板
- 手动扫描 + 可配置的工作区打开自动扫描

**不包含（v1.0）：**
- 本地 ML 模型
- 云端 API / 团队后台
- Git diff / commit 级扫描
- PDF 导出（HTML 打印替代）
- CLI 独立包

---

## 2. 架构

### 2.1 方案选择

采用**模块化单包 VS Code 扩展**（方案 1）：一个 Marketplace 条目，内部模块边界清晰，便于测试与后续扩展。

### 2.2 目录结构

```
code-ai-rate/
├── src/
│   ├── extension.ts              # 入口：注册命令、侧边栏、配置
│   ├── scanner/
│   │   ├── workspaceScanner.ts   # 工作区遍历、过滤、分块调度
│   │   └── fileFilter.ts         # include/exclude、.gitignore
│   ├── analyzers/
│   │   ├── baseAnalyzer.ts       # 通用接口 + 共享特征
│   │   ├── typescriptAnalyzer.ts # JS/TS
│   │   ├── pythonAnalyzer.ts
│   │   └── javaAnalyzer.ts
│   ├── aggregator/
│   │   └── metricsAggregator.ts  # 行级/文件级/Top 文件聚合
│   ├── reporter/
│   │   ├── reportBuilder.ts      # 审计字段组装
│   │   └── templateEngine.ts     # JSON/CSV/HTML 模板渲染
│   └── ui/
│       ├── sidebarProvider.ts    # Webview 侧边栏
│       └── webview/              # 结果展示页面
├── media/                        # 图标、webview 静态资源
├── package.json
└── README.md
```

### 2.3 数据流

```
用户触发扫描
  → WorkspaceScanner（遍历 + 过滤）
  → 按扩展名路由至语言 Analyzer
  → MetricsAggregator（行级加权 + 分布 + Top 列表）
  → Sidebar Webview 展示
  → ReportBuilder → 本地文件导出
```

### 2.4 激活策略

- `activationEvents`: `onStartupFinished` + `onView:codeAiRate.sidebar`
- 扫描在 Extension Host 内异步执行，支持 `CancellationToken` 取消
- 单次扫描结果缓存在内存；工作区切换时清空
- 文件 `mtime` 未变则复用上次分数（增量扫描）

### 2.5 配置项

| 配置键 | 默认值 | 说明 |
|--------|--------|------|
| `codeAiRate.autoScanOnOpen` | `false` | 打开工作区是否自动扫描 |
| `codeAiRate.includePatterns` | `["**/*"]` | 扫描包含 glob |
| `codeAiRate.excludePatterns` | 见 2.6 | 排除 glob |
| `codeAiRate.highlightThreshold` | `70` | 文件 AI 分数 ≥ 此值在 Top 列表优先展示（非告警） |
| `codeAiRate.exportTemplate` | 内置默认 | 自定义 HTML 模板路径（Handlebars `.hbs`） |
| `codeAiRate.exportFields` | 全部审计字段 | 可选导出字段列表 |
| `codeAiRate.disclaimerText` | 内置中英文 | 报告免责声明 |
| `codeAiRate.maxFileSizeKB` | `1024` | 超大文件采样上限 |
| `codeAiRate.topN` | `20` | Top 文件列表条数 |

### 2.6 默认排除

`node_modules/**`, `dist/**`, `build/**`, `.git/**`, `**/*.min.js`, `**/package-lock.json`, `**/yarn.lock`, `**/pnpm-lock.yaml`

---

## 3. 检测规则

### 3.1 输出定义

每个文件输出 **AI 特征分数 0–100**。分数越高，表示越符合常见 AI 生成代码的统计特征，**不等于**「是 AI 写的」。

### 3.2 项目级指标

1. **行级占比（项目 AI 率）**：`Σ(文件行数 × fileScore) / 总代码行数`
2. **文件级分布**：0–30 / 31–60 / 61–100 各段文件数量
3. **AI 占比较高文件**：按 fileScore 降序 Top N，达到 `highlightThreshold` 的文件优先展示

### 3.3 通用特征（权重约 40%）

| 特征 | 检测方式 |
|------|----------|
| 注释密度 | 注释行 / 代码行 |
| 命名泛化度 | `data`、`result`、`item`、`temp` 等通用名占比 |
| 结构均匀性 | 函数长度、缩进、空行分布方差 |
| 样板代码比例 | 重复 import、重复 try-catch 等模式 |

### 3.4 语言特化规则（各约 60%）

**JS/TS：** JSDoc 覆盖率偏高；过多 TODO/FIXME；类型完整但实现极简；统一 async/await + 完整 error handling。

**Python：** docstring 与 type hint 覆盖率偏高；函数间 `# ---` 分隔；过多 `if __name__ == "__main__"` 样板；推导式使用过于规整。

**Java：** Javadoc 完整且格式统一；过多无业务逻辑的 getter/setter；catch 后仅 log；严格 `XxxService` / `XxxImpl` 命名模式。

### 3.5 分数计算

```
fileScore = clamp(Σ(feature_i × weight_i), 0, 100)
```

- 每个特征贡献可解释（导出与 UI 可附「主要特征」）
- `analyzerVersion` 随规则集版本 bump（如 `1.0.0-heuristic`）

### 3.6 不扫描

二进制、图片、锁文件、minified 文件、不支持的语言扩展名。

---

## 4. UI 与交互

### 4.1 侧边栏（主界面）

Activity Bar 图标「AI Rate」，Webview 面板包含：

- 操作栏：开始扫描 / 导出报告 / 设置
- 项目 AI 率（行级加权）进度条
- 扫描概况：文件数、代码行数、已分析/跳过
- 分数分布：0–30 / 31–60 / 61–100
- AI 占比较高文件列表（可跳转文件）
- 固定免责声明

扫描中：进度条 + 已分析 N/M + 取消。分数用数字 + 淡色条，不用红绿告警色。

### 4.2 文件详情（展开）

- AI 特征分数
- 主要贡献特征列表
- 按函数/代码块的分段分数（折叠）

### 4.3 命令

| 命令 | 说明 |
|------|------|
| `Code AI Rate: Scan Workspace` | 手动全工作区扫描 |
| `Code AI Rate: Export Report` | 导出报告 |
| `Code AI Rate: Cancel Scan` | 取消扫描 |
| `Code AI Rate: Open Results` | 打开侧边栏 |

### 4.4 状态栏

- 扫描中：`AI Rate: 扫描中 N%`
- 完成 5 秒：`AI Rate: XX.X%`（点击打开侧边栏）
- 空闲：不显示

### 4.5 自动扫描

- 默认关闭；开启后工作区加载完成 3 秒后台扫描
- 文件数 >5000：提示建议手动扫描或收紧 include

---

## 5. 报告导出

### 5.1 格式

| 格式 | 用途 |
|------|------|
| JSON | 系统对接、完整存档 |
| CSV | Excel 文件级明细 |
| HTML | 人读报告，可打印；支持 logo |

### 5.2 审计字段（reportMeta）

`generatedAt`, `workspaceName`, `workspacePath`, `extensionVersion`, `analyzerVersion`, `scanDurationMs`, `scanConfig`（配置快照）, `disclaimer`

### 5.3 工作区模板配置

路径：`.vscode/code-ai-rate.json`

```json
{
  "export": {
    "companyName": "Acme Corp",
    "logoPath": "./assets/logo.png",
    "topN": 20,
    "includeFileDetails": true,
    "fields": ["reportMeta", "summary", "topFiles", "fileDetails"],
    "customHeader": "代码 AI 特征统计报告",
    "customFooter": "内部使用 · 非判定依据"
  }
}
```

### 5.4 HTML 模板

Handlebars；内置默认 + `exportTemplate` 自定义。页眉 logo（base64）、摘要、分布条、明细表、页脚免责声明与算法版本。

### 5.5 导出流程

Quick Pick 选格式 → 系统保存对话框 → 写入 → 通知成功路径。

---

## 6. 错误处理

| 场景 | 处理 |
|------|------|
| 无工作区 | 提示先打开文件夹 |
| 读文件失败 | 跳过，记入 skipped + 原因 |
| 单文件解析失败 | 跳过，继续扫描 |
| 取消扫描 | 保留部分结果，`scanStatus: cancelled` |
| 导出无权限 | 报错，不部分写入 |
| 自定义模板失败 | 回退默认 + Warning |

错误日志：Output Channel `Code AI Rate`。

---

## 7. 性能

- 分块：每批 50 文件，`setImmediate` 让出事件循环
- 单文件 >`maxFileSizeKB`：采样前 500 行
- mtime 缓存增量
- 目标：1000 文件 / 10 万行，<30 秒

---

## 8. 测试

| 层级 | 内容 |
|------|------|
| 单元 | Analyzer 分数、Aggregator 加权、ReportBuilder 字段 |
| 集成 | fixture 小项目全扫描快照 |
| E2E | `@vscode/test-electron` 命令与侧边栏 |
| Fixture | JS/TS、Python、Java 各 5–10 个人工 vs AI 风格样本 |

CI：test + lint + `vsce package`。

---

## 9. Marketplace 上架

| 项 | 值 |
|----|-----|
| 名称 | Code AI Rate — 代码 AI 特征统计 |
| ID | `{publisher}.code-ai-rate` |
| License | MIT |
| 文档 | README, CHANGELOG, PRIVACY.md（零收集、零网络） |

**描述要点：** 本地启发式统计 AI 特征占比；代码不离开机器；结果仅供参考。

**避免用词：** risk, cheating, plagiarism, suspicious, 高风险。

**发布：** Azure DevOps Publisher + PAT + `vsce publish`。

---

## 10. 术语表

| 术语 | 含义 |
|------|------|
| AI 特征分数 | 0–100，启发式特征匹配度，非判定 |
| 项目 AI 率 | 行级加权平均分数 |
| AI 占比较高文件 | Top 列表，按分数排序 |
| highlightThreshold | 优先展示阈值，非质量告警 |

---

## 11. 后续版本（非 MVP）

- v1.1：PDF 导出、Git diff 扫描
- v2.0：可选本地 ML、CLI 包、更多语言
