# AIChatLog

English | [简体中文](README.zh-CN.md)

**Log your AI conversations. Keep the knowledge.**

AIChatLog is an open-source, self-hosted platform that captures AI conversations from any source, stores them in a central database, and syncs them to your knowledge base.

- **Any AI source** — Claude Code today, ChatGPT / Claude.ai / Copilot tomorrow. Open protocol means any tool can plug in.
- **Any destination** — Obsidian, local markdown, git repo, or your own server. Output adapters are pluggable.
- **Privacy-first** — Self-hosted. Your conversations never leave your infrastructure.
- **Works without AI, better with AI** — Core capture + sync works with zero LLM dependency. AI-powered knowledge extraction is an optional layer.

## Architecture

```text
              Input Plugins                    Output Adapters
        ┌──────────────────┐             ┌──────────────────────┐
        │  Claude Code     │             │  Obsidian (FNS)      │
        │  (more coming)   │             │  Local .md files     │
        └────────┬─────────┘             │  Git (auto-commit)   │
                 │                       │  Webhook (any URL)   │
    ConversationObject (open protocol)   └──────────┬───────────┘
                 │                                  │
                 ▼                                  │
        ┌────────────────────────────────┐          │
        │       aichatlog-server         │──────────┘
        │   SQLite + REST API + Web UI   │
        └────────────────────────────────┘
```

## Two Ways to Use

### Lite Mode — No server needed

The plugin captures conversations and syncs directly to your knowledge base via output adapters. Simple, zero infrastructure.

```text
Claude Code → Plugin → FNS / Local / Git
```

### Server Mode — Centralized management

Multiple devices and AI tools push conversations to a central server. The server stores, processes, and outputs to any adapter.

```text
Claude Code (laptop) ──┐
Claude Code (desktop) ─┤→ aichatlog-server → Obsidian / Local / Git / Webhook
(future: ChatGPT) ─────┘
```

## Quick Start

### Lite Mode (plugin only)

```bash
# Install
pip install git+https://github.com/aichatlog/aichatlog.git#subdirectory=plugins/claude-code

# Register the Claude Code hook + configure output adapter
aichatlog install
aichatlog setup

# Verify
aichatlog status
```

Conversations are automatically captured every time a Claude Code session ends.

```bash
# Open the web dashboard
aichatlog web
```

### Server Mode

```bash
# 1. Start the server
cd server && docker compose up -d

# Or build from source
cd server && go build -o aichatlog-server ./cmd/server
./aichatlog-server --port 8080 --token your-secret-token

# 2. Install plugin and point it to the server
pip install git+https://github.com/aichatlog/aichatlog.git#subdirectory=plugins/claude-code
aichatlog install
aichatlog setup --adapter server --url http://localhost:8080 --token your-secret-token
```

## Features

### Plugin (Claude Code)

| Feature | Description |
| --- | --- |
| Auto-capture | Stop hook fires after every session — zero manual effort |
| 4 output adapters | FNS (Obsidian), Local (.md), Git (auto-commit/push), Server |
| Web dashboard | Browse, search, filter, sync, ignore conversations at `localhost:8765` |
| Full-text search | FTS5-powered search across titles and projects |
| Bulk export | `aichatlog export` syncs all unsynced conversations |
| i18n | English, 简体中文, 繁體中文 |

### Server

| Feature | Description |
| --- | --- |
| REST API | Ingest, query, filter, stats |
| SQLite + WAL | Zero-ops database, easy backup |
| Deduplication | Content hash prevents duplicate syncs |
| Docker | One-command deployment |
| Bearer auth | Token-based API authentication |

## ConversationObject Protocol

AIChatLog uses an open JSON protocol for conversation transport. Any tool that produces this format can integrate with the server.

```json
{
  "version": 1,
  "source": "claude-code",
  "device": "macbook",
  "session_id": "abc-123",
  "title": "Fix token refresh race condition",
  "date": "2026-03-20",
  "project": "my-project",
  "project_path": "/Users/me/code/my-project",
  "message_count": 12,
  "word_count": 1500,
  "content_hash": "a1b2c3...",
  "messages": [
    {"role": "user", "content": "How do I fix...", "seq": 0},
    {"role": "assistant", "content": "You can use...", "seq": 1}
  ]
}
```

## Project Structure

```text
aichatlog/
├── server/                  # Go REST API server (SQLite + multi-source)
│   ├── cmd/server/          # Entry point
│   ├── internal/api/        # HTTP handlers, routing, auth
│   ├── internal/storage/    # SQLite storage layer
│   ├── Dockerfile           # Multi-stage Docker build
│   └── docker-compose.yml
├── plugins/
│   └── claude-code/         # Claude Code capture plugin (Python, stdlib only)
│       ├── .claude-plugin/  # Plugin distribution (hooks, skills, scripts)
│       └── src/aichatlog/   # pip distribution
├── docs/                    # Design documents
│   ├── product-design.md    # Full system architecture & vision
│   ├── knowledge-extraction.md  # LLM extraction pipeline design
│   └── project-organization.md  # Repo structure & phasing
└── README.md
```

## Roadmap

| Version | Focus | Status |
| --- | --- | --- |
| **v0.5** | Plugin: 4 adapters, web dashboard, auto-capture | ✅ Done |
| **v0.6** | Protocol spec, server storage refactor (6 tables + FTS5) | ✅ Done |
| **v0.7** | Server output adapters, processing pipeline, v2 conditional sync | ✅ Done |
| **v0.8** | LLM knowledge extraction (Anthropic/OpenAI, atomic notes) | ✅ Done |
| **v0.9** | MCP Server, full metadata capture (model/timestamps/tokens) | ✅ Done |
| **v1.0** | Docs, CI/CD, CONTRIBUTING.md, stability | ✅ Current |

**Post-v1.0:** Ollama adapter (fully offline), ChatGPT browser extension, weekly summaries, knowledge graph, Notion adapter.

## MCP Integration

Connect Claude Code to your conversation history via the MCP server:

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

Available tools: `search_conversations`, `get_conversation`, `get_project_context`, `get_recent_work_log`.

## Documentation

- [Product Design](docs/product-design.md) — Full architecture, data model, API spec, and vision
- [Knowledge Extraction](docs/knowledge-extraction.md) — LLM extraction pipeline and prompt design
- [Project Organization](docs/project-organization.md) — Repo structure, labels, CI/CD, phasing
- [Protocol Spec](protocol/README.md) — ConversationObject v1/v2 JSON Schema and API spec
- [Server README](server/README.md) — API reference and deployment guide
- [Plugin README](plugins/claude-code/README.md) — Installation and CLI commands
- [Contributing](CONTRIBUTING.md) — How to add adapters, plugins, and contribute

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code conventions, and how to add adapters/plugins.

- **New output adapters** (Notion, Logseq, etc.)
- **New input plugins** (ChatGPT, Claude.ai, Copilot)
- **New LLM adapters** (Ollama, Groq, etc.)
- **Bug reports and feature requests** via [GitHub Issues](https://github.com/aichatlog/aichatlog/issues)

## License

[AGPL-3.0](LICENSE)
