# AIChatLog

**记录你的 AI 对话，留住知识。**

[English](README.md) | 简体中文

AIChatLog 是一个开源的、可自托管的平台，从任何 AI 工具捕获对话，存储到中心数据库，并同步到你的知识库。

- **任意 AI 来源** — 目前支持 Claude Code，ChatGPT / Claude.ai / Copilot 即将到来。开放协议，任何工具都能接入。
- **任意输出目标** — Obsidian、本地 Markdown、Git 仓库，或你自己的服务器。输出适配器可插拔。
- **隐私优先** — 自托管。你的对话数据始终留在你的基础设施内。
- **无 AI 也能用，有 AI 更强大** — 核心的捕获 + 同步功能零 LLM 依赖。AI 驱动的知识提取是可选层。

## 架构

```text
              输入插件                         输出适配器
        ┌──────────────────┐             ┌──────────────────────┐
        │  Claude Code     │             │  Obsidian (FNS)      │
        │  (更多即将支持)   │             │  本地 .md 文件       │
        └────────┬─────────┘             │  Git (自动提交)      │
                 │                       │  Webhook (任意 URL)  │
    ConversationObject (开放协议)        └──────────┬───────────┘
                 │                                  │
                 ▼                                  │
        ┌────────────────────────────────┐          │
        │       aichatlog-server         │──────────┘
        │   SQLite + REST API + Web UI   │
        └────────────────────────────────┘
```

## 两种使用方式

### 轻量模式 — 无需服务器

插件直接通过输出适配器将对话同步到你的知识库。简单，零基础设施。

```text
Claude Code → 插件 → FNS / 本地 / Git
```

### 服务器模式 — 集中管理

多设备、多 AI 工具将对话推送到中心服务器。服务器负责存储、处理和输出。

```text
Claude Code (笔记本) ──┐
Claude Code (台式机) ─┤→ aichatlog-server → Obsidian / 本地 / Git / Webhook
(未来: ChatGPT) ──────┘
```

## 快速开始

### 轻量模式（仅插件）

```bash
# 安装
pip install git+https://github.com/aichatlog/aichatlog.git#subdirectory=plugins/claude-code

# 注册 Claude Code hook + 配置输出适配器
aichatlog install
aichatlog setup

# 验证
aichatlog status
```

每次 Claude Code 会话结束时，对话会自动被捕获。

```bash
# 打开 Web 管理面板
aichatlog web
```

### 服务器模式

```bash
# 1. 启动服务器
cd server && docker compose up -d

# 或从源码编译
cd server && go build -o aichatlog-server ./cmd/server
./aichatlog-server --port 8080 --token your-secret-token

# 2. 安装插件并指向服务器
pip install git+https://github.com/aichatlog/aichatlog.git#subdirectory=plugins/claude-code
aichatlog install
aichatlog setup --adapter server --url http://localhost:8080 --token your-secret-token
```

## 功能特性

### 插件（Claude Code）

| 功能 | 说明 |
| --- | --- |
| 自动捕获 | 每次会话结束后 Stop hook 自动触发，零人工操作 |
| 4 个输出适配器 | FNS (Obsidian)、本地 (.md)、Git (自动提交/推送)、服务器 |
| Web 管理面板 | 在 `localhost:8765` 浏览、搜索、过滤、同步、忽略对话 |
| 全文搜索 | 基于 FTS5 的标题和项目名搜索 |
| 批量导出 | `aichatlog export` 同步所有未同步的对话 |
| 多语言 | English、简体中文、繁體中文 |

### 服务器

| 功能 | 说明 |
| --- | --- |
| REST API | 接收、查询、过滤、统计 |
| SQLite + WAL | 零运维数据库，易于备份 |
| 去重 | 内容哈希防止重复同步 |
| Docker | 一条命令部署 |
| Bearer 认证 | 基于 Token 的 API 认证 |

## ConversationObject 协议

AIChatLog 使用开放的 JSON 协议进行对话传输。任何产出此格式的工具都能与服务器集成。

```json
{
  "version": 1,
  "source": "claude-code",
  "device": "macbook",
  "session_id": "abc-123",
  "title": "修复 Token 刷新竞态条件",
  "date": "2026-03-20",
  "project": "my-project",
  "project_path": "/Users/me/code/my-project",
  "message_count": 12,
  "word_count": 1500,
  "content_hash": "a1b2c3...",
  "messages": [
    {"role": "user", "content": "如何修复...", "seq": 0},
    {"role": "assistant", "content": "你可以使用...", "seq": 1}
  ]
}
```

## 项目结构

```text
aichatlog/
├── server/                  # Go REST API 服务器 (SQLite + 多源)
│   ├── cmd/server/          # 入口
│   ├── internal/api/        # HTTP 处理器、路由、认证
│   ├── internal/storage/    # SQLite 存储层
│   ├── Dockerfile           # 多阶段 Docker 构建
│   └── docker-compose.yml
├── plugins/
│   └── claude-code/         # Claude Code 捕获插件 (Python, 仅标准库)
│       ├── .claude-plugin/  # 插件发布 (hooks, skills, scripts)
│       └── src/aichatlog/   # pip 发布
├── docs/                    # 设计文档
│   ├── product-design.md    # 完整系统架构与愿景
│   ├── knowledge-extraction.md  # LLM 提取流水线设计
│   └── project-organization.md  # 仓库结构与阶段规划
└── README.md
```

## 路线图

| 版本 | 重点 | 状态 |
| --- | --- | --- |
| **v0.5** | 插件：4 个适配器、Web 面板、自动捕获 | ✅ 完成 |
| **v0.6** | 协议规范、服务器存储重构 (6 表 + FTS5) | ✅ 完成 |
| **v0.7** | 服务器输出适配器、处理流水线、v2 条件同步 | ✅ 完成 |
| **v0.8** | LLM 知识提取 (Anthropic/OpenAI, 原子笔记) | ✅ 完成 |
| **v0.9** | MCP Server、完整元数据采集 (模型/时间戳/Token) | ✅ 完成 |
| **v1.0** | 文档、CI/CD、CONTRIBUTING.md、稳定性 | ✅ 当前 |

**v1.0 之后：** Ollama 适配器（完全离线）、ChatGPT 浏览器扩展、周报/月报摘要、知识图谱、Notion 适配器。

## MCP 集成

通过 MCP Server 将 Claude Code 连接到你的对话历史：

```json
{
  "mcpServers": {
    "aichatlog": {
      "command": "aichatlog-server",
      "args": ["mcp", "--db", "/path/to/aichatlog.db"]
    }
  }
}
```

可用工具：`search_conversations`、`get_conversation`、`get_project_context`、`get_recent_work_log`。

## 文档

- [产品设计](docs/product-design.md) — 完整架构、数据模型、API 规范和愿景
- [知识提取](docs/knowledge-extraction.md) — LLM 提取流水线和 Prompt 设计
- [项目组织](docs/project-organization.md) — 仓库结构、标签、CI/CD、阶段规划
- [协议规范](protocol/README.zh-CN.md) — ConversationObject v1/v2 JSON Schema 和 API 规范
- [服务器文档](server/README.zh-CN.md) — API 参考和部署指南
- [插件文档](plugins/claude-code/README.zh-CN.md) — 安装和 CLI 命令
- [贡献指南](CONTRIBUTING.zh-CN.md) — 如何添加适配器、插件和参与贡献

## 参与贡献

参见 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md) 了解环境搭建、代码规范和贡献方式。

- **新输出适配器**（Notion、Logseq 等）
- **新输入插件**（ChatGPT、Claude.ai、Copilot）
- **新 LLM 适配器**（Ollama、Groq 等）
- **Bug 反馈和功能建议** 通过 [GitHub Issues](https://github.com/aichatlog/aichatlog/issues)

## 许可证

[AGPL-3.0](LICENSE)
