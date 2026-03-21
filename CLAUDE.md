# AIChatLog

Monorepo for AIChatLog — an open-source platform that captures AI conversations from any source and syncs them to your knowledge base.

## Project Structure

```
server/                          # Go REST API server
  cmd/server/main.go             # Entry point, flag parsing, embed dashboard
  internal/api/handler.go        # HTTP handler, routing, auth, CORS, dashboard
  internal/storage/sqlite.go     # SQLite store (6 tables + FTS5), migrations
  web/dashboard.html             # Embedded web dashboard (vanilla JS)
  web/embed.go                   # Go embed for dashboard.html
  Dockerfile, docker-compose.yml # Docker deployment (FTS5 enabled)

protocol/                        # ConversationObject v1 specification
  conversation.schema.json       # JSON Schema
  api.openapi.yaml               # OpenAPI 3.1 spec for server API
  examples/                      # Sample conversations (claude-code, chatgpt)

plugins/claude-code/             # Claude Code capture plugin (Python)
  .claude-plugin/                # Plugin distribution
    scripts/aichatlog.py         # Main engine (~1400 lines, stdlib only)
    scripts/dashboard.html       # Web UI (single-file HTML, vanilla JS)
    hooks/hooks.json             # Stop hook registration
    skills/aichatlog/SKILL.md    # Skill definition
    plugin.json, marketplace.json
    commands/web.md
  src/aichatlog/                 # pip distribution (mirrors scripts/)
    core.py                      # Same as aichatlog.py + install/uninstall
    __init__.py, dashboard.html
  pyproject.toml                 # Entry point: aichatlog → aichatlog.core:main

docs/                            # Product design documents
```

## Build & Test

```bash
# Server (FTS5 required)
cd server && CGO_CFLAGS="-DSQLITE_ENABLE_FTS5" go build -o aichatlog-server ./cmd/server

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
- Migration: numbered migrations via `schema_version` table
- Dedup key: `UNIQUE(source_type, device, session_id)`
- Dashboard: embedded via Go `embed` from `server/web/dashboard.html`

### Plugin (Python)
- **Zero external deps** in aichatlog.py — stdlib only
- Section headers: `# ── Section Name ──` with dashes
- Function prefixes: `cmd_`, `db_`, `cfg_`, `parse_`, `format_`, `sync_`, `ingest_`
- Config: `~/.config/aichatlog/config.json`
- Database: `~/.config/aichatlog/aichatlog.db` (SQLite, WAL mode, schema v2)
- i18n: `STRINGS` dict with en/zh-CN/zh-TW, access via `t(key)`
- `aichatlog.py` and `core.py` must stay in sync. `core.py` adds `cmd_install()` / `cmd_uninstall()`

### Output Adapters
All inherit from `OutputAdapter` with `write_note(path, content)` and `test_connection()`:
- **FNSAdapter** — POST to Fast Note Sync API
- **LocalAdapter** — Write .md files locally
- **GitAdapter** — Write + git commit/push
- **ServerAdapter** — POST ConversationObject to aichatlog-server

### ConversationObject Protocol
Transport format between plugins and server. Defined in `protocol/conversation.schema.json`.
- `source` field identifies the AI tool origin (e.g. `claude-code`, `chatgpt`)
- Server deduplicates by `(source_type, device, session_id)` + `content_hash`
- Any tool producing this JSON can integrate with the server
