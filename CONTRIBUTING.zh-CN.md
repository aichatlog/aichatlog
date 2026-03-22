# 参与贡献 AIChatLog

[English](CONTRIBUTING.md) | 简体中文

感谢你对项目的关注！AIChatLog 正处于活跃的早期开发阶段，欢迎贡献。

## 开始

```bash
git clone https://github.com/aichatlog/aichatlog.git
cd aichatlog
```

### 服务器 (Go)

```bash
cd server
CGO_CFLAGS="-DSQLITE_ENABLE_FTS5" go build -o aichatlog-server ./cmd/server
./aichatlog-server --port 8080
# 管理面板: http://localhost:8080
```

### 插件 (Python)

```bash
cd plugins/claude-code
pip install -e .
aichatlog install
aichatlog setup
```

### 验证

```bash
# 服务器编译
cd server && CGO_CFLAGS="-DSQLITE_ENABLE_FTS5" go build ./cmd/server

# 插件语法检查
python3 -c "import ast; ast.parse(open('plugins/claude-code/.claude-plugin/scripts/aichatlog.py').read())"
```

## 项目结构

```
server/                     Go REST API + MCP 服务器
  internal/api/             HTTP 处理器
  internal/storage/         SQLite 存储 (6 表 + FTS5)
  internal/output/          输出适配器 (Local, FNS, Git, Webhook)
  internal/processor/       后台处理 + 知识提取
  internal/llm/             LLM 适配器 (Anthropic, OpenAI, Ollama)
  internal/mcp/             MCP 服务器 (AI 助手集成)
  internal/config/          JSON 配置管理
  web/                      嵌入式管理面板

plugins/claude-code/        Python 插件 (零外部依赖)
  .claude-plugin/scripts/   主引擎 + 管理面板
  src/aichatlog/            pip 发布

protocol/                   ConversationObject v1/v2 规范
  conversation.schema.json  JSON Schema
  api.openapi.yaml          OpenAPI 3.1 规范
```

## 如何贡献

### 新增输出适配器（服务器端）

1. 创建 `server/internal/output/yourname.go`
2. 实现 `Adapter` 接口：`Name()`、`Push(path, content)`、`Test()`
3. 在 `adapter.go` 中添加配置类型和工厂分支
4. 在 `config.go` 的 ServerConfig 中添加配置

### 新增输入插件

1. 解析你的 AI 工具的对话格式
2. 映射为 ConversationObject（参见 `protocol/conversation.schema.json`）
3. POST 到 `POST /api/conversations` 或 `/api/conversations/sync`
4. `source` 字段标识你的工具（如 `gemini`、`copilot`）

### 新增 LLM 适配器

1. 创建 `server/internal/llm/yourname.go`
2. 实现 `Adapter` 接口：`Name()`、`Extract(system, user)`
3. 在 `adapter.go` 中添加配置类型和工厂分支

## 代码规范

### 服务器 (Go)

- 唯一外部依赖：`github.com/mattn/go-sqlite3`
- 编译需要：`CGO_CFLAGS="-DSQLITE_ENABLE_FTS5"`
- 错误处理：`(result, error)` 元组，用 `fmt.Errorf` 包装
- 数据库迁移：在 `migrate()` 中编号，每个版本一个函数

### 插件 (Python)

- `aichatlog.py` **零外部依赖** — 仅使用标准库
- `aichatlog.py` 和 `core.py` 必须保持同步（`core.py` = `aichatlog.py` + install/uninstall）
- 函数前缀：`cmd_`、`db_`、`cfg_`、`parse_`、`format_`、`sync_`、`ingest_`

### 协议

- ConversationObject v1：完整 payload，始终包含 messages
- ConversationObject v2：条件同步（check/delta/full 模式）
- 通用字段在顶层；源特有数据放在 `metadata` 字典中

## Pull Request 流程

1. Fork 并创建 feature 分支
2. 进行修改
3. 验证：`go build`（服务器）和语法检查（插件）
4. 提交 PR，清楚描述改了什么以及为什么

## 命名规范

外部仓库/包的命名：

```
aichatlog-plugin-{source}     # 输入插件 (如 aichatlog-plugin-chatgpt)
aichatlog-adapter-{dest}      # 输出适配器 (如 aichatlog-adapter-notion)
aichatlog-template-{use-case} # 笔记模板
```

## 许可证

MIT — 参见 [LICENSE](LICENSE)。
