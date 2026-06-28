# Code AI Rate

Code AI Rate 是一款 VS Code 扩展，在本地对工作区代码进行启发式统计分析，汇总各文件的 AI 相关特征指标，并支持导出报告。

## 功能

- **工作区扫描** — 按 include/exclude 规则遍历文件，自动跳过 `.gitignore` 中的路径
- **多语言分析** — 支持 TypeScript/JavaScript、Python、Java（基于代码特征的启发式统计）
- **侧边栏视图** — 展示项目汇总、分数分布、Top 文件列表，可点击打开源文件
- **状态栏指示** — 显示当前扫描状态与项目 AI Rate 百分比
- **报告导出** — 支持 JSON、CSV、HTML 格式，可自定义模板与导出字段
- **可配置阈值** — 高亮显示超过指定分数的文件
- **自动扫描** — 可选在打开工作区后自动执行扫描

## 配置

| 设置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `codeAiRate.autoScanOnOpen` | boolean | `false` | 打开工作区后是否自动扫描 |
| `codeAiRate.includePatterns` | string[] | `["**/*"]` | 参与扫描的文件 glob 模式 |
| `codeAiRate.excludePatterns` | string[] | 见 package.json | 排除的文件 glob 模式 |
| `codeAiRate.highlightThreshold` | number | `70` | 侧边栏高亮阈值（0–100） |
| `codeAiRate.exportTemplate` | string | `""` | 自定义 Handlebars 导出模板路径 |
| `codeAiRate.exportFields` | string[] | `reportMeta`, `summary`, `topFiles`, `fileDetails` | 导出报告包含的字段 |
| `codeAiRate.disclaimerText` | string | 见 package.json | 导出报告中的免责声明文本 |
| `codeAiRate.maxFileSizeKB` | number | `1024` | 跳过的单文件大小上限（KB） |
| `codeAiRate.topN` | number | `20` | 报告中 Top 文件数量 |

在 VS Code 设置中搜索 **Code AI Rate** 即可修改上述选项。

## 命令

| 命令 | 说明 |
|------|------|
| `Code AI Rate: Scan Workspace` | 扫描当前工作区 |
| `Code AI Rate: Cancel Scan` | 取消进行中的扫描 |
| `Code AI Rate: Open Results` | 聚焦侧边栏结果视图 |
| `Code AI Rate: Export Report` | 导出扫描报告 |

## 免责声明

本扩展使用启发式规则对代码特征进行统计，输出结果**仅供参考**，不构成任何判定或结论依据。分数反映的是代码风格与结构特征，与代码的实际来源或编写方式无直接对应关系。

## 从 VSIX 安装

1. 获取 `code-ai-rate-0.1.0.vsix` 文件
2. 在 VS Code 中打开命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）
3. 运行 **Extensions: Install from VSIX...**
4. 选择 VSIX 文件并确认安装
5. 重新加载窗口后，活动栏会出现 **AI Rate** 图标

## 开发

### 前置要求

- Node.js 18+
- npm

### 本地运行

```bash
git clone <repo-url>
cd code-ai-rate
npm install
npm run compile
```

按 **F5**（或运行 **Run Extension** 启动配置）打开 Extension Development Host，在新窗口中加载扩展进行调试。

### 构建与打包

```bash
npm test          # 运行单元与集成测试
npm run compile   # 编译扩展
npm run package   # 编译并生成 .vsix
```

## 隐私

所有分析均在本地完成，不发送任何数据到外部网络。详见 [PRIVACY.md](./PRIVACY.md)。

## 许可证

[MIT](./LICENSE)
