# Contributing to AIChatLog

English | [简体中文](CONTRIBUTING.zh-CN.md)

Thanks for your interest in contributing! AIChatLog is in active early development and welcomes contributions.

## Getting Started

```bash
git clone https://github.com/aichatlog/aichatlog.git
cd aichatlog
```

### Server (Go)

```bash
cd server
CGO_CFLAGS="-DSQLITE_ENABLE_FTS5" go build -o aichatlog-server ./cmd/server
./aichatlog-server --port 8080
# Dashboard: http://localhost:8080
```

### Plugin (Python)

```bash
cd plugins/claude-code
pip install -e .
aichatlog install
aichatlog setup
```

### Verify

```bash
# Server builds
cd server && CGO_CFLAGS="-DSQLITE_ENABLE_FTS5" go build ./cmd/server

# Plugin syntax
python3 -c "import ast; ast.parse(open('plugins/claude-code/.claude-plugin/scripts/aichatlog.py').read())"
```

## Project Structure

```text
server/                     Go REST API + MCP server
  internal/api/             HTTP handlers
  internal/storage/         SQLite storage (6 tables + FTS5)
  internal/output/          Output adapters (Local, FNS, Webhook)
  internal/processor/       Background processing + extraction
  internal/llm/             LLM adapters (Anthropic, OpenAI)
  internal/mcp/             MCP server for AI assistant integration
  internal/config/          JSON config management
  web/                      Embedded dashboard

plugins/claude-code/        Python plugin (zero external deps)
  .claude-plugin/scripts/   Main engine + dashboard
  src/aichatlog/            pip distribution

protocol/                   ConversationObject v1/v2 spec
  conversation.schema.json  JSON Schema
  api.openapi.yaml          OpenAPI 3.1 spec
```

## How to Contribute

### New Output Adapter (Server)

1. Create `server/internal/output/yourname.go`
2. Implement the `Adapter` interface: `Name()`, `Push(path, content)`, `Test()`
3. Add config type and factory case in `adapter.go`
4. Add to `config.go` ServerConfig

### New Input Plugin

1. Parse your AI tool's conversation format
2. Map to ConversationObject (see `protocol/conversation.schema.json`)
3. POST to `POST /api/conversations` or `/api/conversations/sync`
4. The `source` field identifies your tool (e.g. `gemini`, `copilot`)

### New LLM Adapter

1. Create `server/internal/llm/yourname.go`
2. Implement `Adapter` interface: `Name()`, `Extract(system, user)`
3. Add config type and factory case in `adapter.go`

## Code Conventions

### Server (Go)

- Single external dependency: `github.com/mattn/go-sqlite3`
- Build requires: `CGO_CFLAGS="-DSQLITE_ENABLE_FTS5"`
- Error handling: `(result, error)` tuples, wrap with `fmt.Errorf`
- Database migrations: numbered in `migrate()`, one function per version

### Plugin (Python)

- **Zero external deps** — stdlib only in `aichatlog.py`
- `aichatlog.py` and `core.py` must stay in sync (`core.py` = `aichatlog.py` + install/uninstall)
- Function prefixes: `cmd_`, `db_`, `cfg_`, `parse_`, `format_`, `sync_`, `ingest_`

### Protocol

- ConversationObject v1: full payload, always includes messages
- ConversationObject v2: conditional sync (check/delta/full modes)
- Universal fields are top-level; source-specific data goes in `metadata` dict

## Pull Request Process

1. Fork and create a feature branch
2. Make your changes
3. Verify: `go build` (server) and syntax check (plugin)
4. Submit PR with a clear description of what and why

## Naming Conventions

For external repos/packages:

```text
aichatlog-plugin-{source}     # Input plugins (e.g. aichatlog-plugin-chatgpt)
aichatlog-adapter-{dest}      # Output adapters (e.g. aichatlog-adapter-notion)
aichatlog-template-{use-case} # Note templates
```

## License

AGPL-3.0 — see [LICENSE](LICENSE).
