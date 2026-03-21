# AIChatLog

Monorepo for AIChatLog — an open-source platform that captures AI conversations from any source and syncs them to your knowledge base.

## Project Structure

```
server/                          # Go REST API + MCP server
  cmd/server/main.go             # Entry point: HTTP server + "mcp" subcommand
  internal/api/handler.go        # HTTP handler, routing, auth, CORS, dashboard
  internal/storage/sqlite.go     # SQLite store (6 tables + FTS5), migrations v1-v2
  internal/output/               # Output adapters: Local, FNS, Webhook
  internal/processor/            # Background processor + LLM extraction pipeline
  internal/llm/                  # LLM adapters: Anthropic, OpenAI
  internal/mcp/                  # MCP server (JSON-RPC over stdio)
  internal/config/               # JSON config management
  web/dashboard.html             # Embedded web dashboard (vanilla JS)
  Dockerfile, docker-compose.yml # Docker deployment (FTS5 enabled)

protocol/                        # ConversationObject v1/v2 specification
  conversation.schema.json       # JSON Schema (v1 full, v2 conditional sync)
  api.openapi.yaml               # OpenAPI 3.1 spec for server API
  examples/                      # Sample conversations (claude-code, chatgpt)

plugins/claude-code/             # Claude Code capture plugin (Python)
  .claude-plugin/                # Plugin distribution
    scripts/aichatlog.py         # Main engine (~1600 lines, stdlib only)
    scripts/dashboard.html       # Plugin web UI (single-file HTML, vanilla JS)
    hooks/hooks.json             # Stop hook registration
    skills/aichatlog/SKILL.md    # Skill definition
    plugin.json, marketplace.json
    commands/web.md
  src/aichatlog/                 # pip distribution (mirrors scripts/)
    core.py                      # Same as aichatlog.py + install/uninstall
    __init__.py, dashboard.html
  pyproject.toml                 # Entry point: aichatlog → aichatlog.core:main

docs/                            # Product design documents
.github/workflows/              # CI/CD: server-ci, plugin-ci, release
```

## Build & Test

```bash
# Server (FTS5 required)
cd server && CGO_CFLAGS="-DSQLITE_ENABLE_FTS5" go build -o aichatlog-server ./cmd/server

# MCP mode (for Claude Code integration)
./aichatlog-server mcp --db /path/to/aichatlog.db

# Plugin syntax check
python3 -c "import ast; ast.parse(open('plugins/claude-code/.claude-plugin/scripts/aichatlog.py').read())"

# Plugin pip install (editable)
cd plugins/claude-code && pip install -e .
aichatlog status
```

## Key Conventions

### Server (Go)
- Single dependency: `github.com/mattn/go-sqlite3`
- Module path: `github.com/aichatlog/aichatlog/server`
- Build requires: `CGO_CFLAGS="-DSQLITE_ENABLE_FTS5"` for full-text search
- Env vars: `AICHATLOG_PORT`, `AICHATLOG_DB`, `AICHATLOG_DATA`, `AICHATLOG_TOKEN`
- Error handling: `(result, error)` tuples, wrap with `fmt.Errorf`
- SQL: dynamic query building with `?` placeholders
- Database: 6 tables (conversations, messages, tags, extractions, output_sync, process_queue) + FTS5
- Migration: numbered migrations via `schema_version` table (currently v2)
- Dedup key: `UNIQUE(source_type, device, session_id)`
- Dashboard: embedded via Go `embed` from `server/web/dashboard.html`
- MCP: `aichatlog-server mcp` subcommand, JSON-RPC 2.0 over stdin/stdout

### Plugin (Python)
- **Zero external deps** in aichatlog.py — stdlib only
- Section headers: `# ── Section Name ──` with dashes
- Function prefixes: `cmd_`, `db_`, `cfg_`, `parse_`, `format_`, `sync_`, `ingest_`
- Config: `~/.config/aichatlog/config.json`
- Database: `~/.config/aichatlog/aichatlog.db` (SQLite, WAL mode, schema v3)
- i18n: `STRINGS` dict with en/zh-CN/zh-TW, access via `t(key)`
- `aichatlog.py` and `core.py` must stay in sync. `core.py` adds `cmd_install()` / `cmd_uninstall()`
- Timestamps: stored as UTC ISO8601 with millisecond precision

### Output Adapters (Plugin)

All inherit from `OutputAdapter` with `write_note(path, content)` and `test_connection()`:
- **FNSAdapter** — POST to Fast Note Sync API
- **LocalAdapter** — Write .md files locally
- **GitAdapter** — Write + git commit/push
- **ServerAdapter** — POST ConversationObject to aichatlog-server (v2 sync protocol)

### Output Adapters (Server)

All implement `Adapter` interface with `Name()`, `Push(path, content)`, `Test()`:
- **LocalAdapter** — Write .md files to local directory
- **FNSAdapter** — POST to Fast Note Sync API
- **WebhookAdapter** — POST JSON to any URL

### ConversationObject Protocol

Transport format between plugins and server. Defined in `protocol/conversation.schema.json`.
- **v1**: Full payload, messages always included
- **v2**: Conditional sync — `check` (metadata only, ~500B), `delta` (new messages only), `full`
- Universal fields are top-level (model, timestamps, tokens); source-specific data in `metadata` dict
- Server deduplicates by `(source_type, device, session_id)` + `content_hash`
- Timestamps: UTC ISO8601 with millisecond precision

### LLM Extraction

- Adapters: Anthropic (Claude Haiku/Sonnet), OpenAI-compatible (GPT-4o, Groq, Together, vLLM)
- Extracts: tech_solutions, concepts, work_log, prompts
- Runs after sync in processor pipeline, skips short conversations
- Results stored in `extractions` table, pushed as atomic notes via output adapter

### MCP Server
- `aichatlog-server mcp --db path/to/db` — runs JSON-RPC over stdio
- Tools: `search_conversations`, `get_conversation`, `get_project_context`, `get_recent_work_log`
- Creates feedback loop: AI conversations → AIChatLog → AI context
