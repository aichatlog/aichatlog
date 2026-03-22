# AIChatLog — Product Design Document

## Vision

**AIChatLog** is an open-source, self-hosted platform that captures AI conversations
from any source, processes them into structured knowledge, and pushes the results
to your preferred note-taking system.

**Tagline:** Log your AI conversations. Keep the knowledge.

**Problem:** Developers and knowledge workers have dozens of valuable AI
conversations daily — across Claude Code, ChatGPT, Claude.ai, Copilot, and more.
These conversations contain solutions, decisions, learnings, and reusable patterns.
But they're scattered across platforms, buried in chat history, and never become
part of your permanent knowledge base.

**Solution:** AIChatLog captures conversations from any AI tool, stores them in a
central database, uses AI to extract structured knowledge (tech solutions, concepts,
work logs, reusable prompts), and pushes the results to wherever you manage your
knowledge — Obsidian, Notion, Logseq, or anywhere else.

---

## Product Principles

1. **Self-hosted, privacy-first** — Your AI conversations stay on your infrastructure.
   No SaaS, no data leaves your control.

2. **Capture once, output everywhere** — One ingest API, unlimited output destinations.

3. **Works without AI, better with AI** — Core capture + storage + output works with
   zero LLM dependency. AI extraction is a powerful optional layer.

4. **Plugin ecosystem** — Input plugins capture from different AI tools. Output adapters
   push to different knowledge systems. Both are independently extensible.

5. **Convention over configuration** — Sane defaults for 80% of users. Everything is
   overridable for power users.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Input Plugins                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ CC Plugin│ │ ChatGPT  │ │Claude.ai │ │  Direct   │  │
│  │ (v0.1)   │ │ Browser  │ │ Browser  │ │  API      │  │
│  │          │ │ Ext      │ │ Ext      │ │           │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       └────────────┴────────────┴──────────────┘        │
│                          │                               │
│              POST /api/v1/conversations                   │
│              (Unified Ingest Protocol)                    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   AIChatLog Server                        │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Ingest   │ │ Storage  │ │Processor │ │ LLM       │  │
│  │ API      │ │ SQLite + │ │ Classify │ │ Engine    │  │
│  │ REST/WS  │ │ Files    │ │ Tag      │ │ (optional)│  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ Web UI   │ │ MCP      │ │ Output   │                │
│  │ Manage   │ │ Server   │ │ Engine   │                │
│  │ Browse   │ │ (search) │ │ Adapters │                │
│  └──────────┘ └──────────┘ └──────────┘                │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   Output Adapters                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Obsidian │ │ Notion   │ │ Logseq   │ │ Webhook   │  │
│  │ (FNS)    │ │ API      │ │ / Local  │ │ / Custom  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Data Model

### ConversationObject (Unified Ingest Format)

This is the contract between input plugins and the server.
All input plugins produce this format.

```json
{
  "version": "1",
  "source": {
    "type": "claude-code",
    "plugin_version": "0.1.0",
    "device": "macbook-pro",
    "device_id": "a1b2c3"
  },
  "conversation": {
    "id": "conv_2026-03-20_14-30-22_macbook",
    "external_id": "session-abc-123",
    "started_at": "2026-03-20T14:30:22Z",
    "ended_at": "2026-03-20T14:45:10Z",
    "model": "claude-sonnet-4",
    "project": {
      "name": "my-project",
      "path": "/Users/me/code/my-project"
    },
    "messages": [
      {
        "role": "user",
        "content": "How do I fix the token refresh race condition?",
        "timestamp": "2026-03-20T14:30:22Z"
      },
      {
        "role": "assistant",
        "content": "You can use an asyncio.Lock to serialize...",
        "timestamp": "2026-03-20T14:30:35Z"
      }
    ],
    "metadata": {
      "word_count": 1500,
      "message_count": 12,
      "has_code": true,
      "languages_detected": ["python"]
    }
  },
  "raw_content": "# Full markdown transcript\n\n..."
}
```

### Server-side Data Model (SQLite)

```sql
CREATE TABLE conversations (
    id              TEXT PRIMARY KEY,
    source_type     TEXT NOT NULL,
    device          TEXT NOT NULL,
    device_id       TEXT,
    external_id     TEXT,
    project         TEXT,
    project_path    TEXT,
    model           TEXT,
    started_at      DATETIME NOT NULL,
    ended_at        DATETIME,
    word_count      INTEGER,
    message_count   INTEGER,
    has_code        BOOLEAN DEFAULT FALSE,
    raw_content     TEXT,
    status          TEXT DEFAULT 'pending',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, device_id, external_id)
);

CREATE TABLE messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    timestamp       DATETIME,
    seq             INTEGER NOT NULL
);

CREATE TABLE tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    tag             TEXT NOT NULL,
    auto_generated  BOOLEAN DEFAULT TRUE
);

CREATE TABLE extractions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    metadata        TEXT,
    output_path     TEXT,
    extracted_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    model_used      TEXT
);

CREATE TABLE output_sync (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    adapter         TEXT NOT NULL,
    path            TEXT NOT NULL,
    content_hash    TEXT NOT NULL,
    synced_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    status          TEXT DEFAULT 'ok'
);

CREATE TABLE process_queue (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    task_type       TEXT NOT NULL,
    priority        INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'pending',
    attempts        INTEGER DEFAULT 0,
    last_error      TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at      DATETIME,
    completed_at    DATETIME
);

CREATE VIRTUAL TABLE conversations_fts USING fts5(
    id, project, raw_content,
    content=conversations,
    content_rowid=rowid
);
```

---

## Server API

### Authentication

```
Authorization: Bearer <server-api-token>
```

Token is generated during server setup and manageable via Web UI.

### Ingest API

**POST /api/v1/conversations** — Receive a conversation from an input plugin.

Request: ConversationObject JSON

Response:
```json
{
  "ok": true,
  "conversation_id": "conv_2026-03-20_14-30-22_macbook",
  "status": "accepted",
  "is_duplicate": false
}
```

Dedup: If `(source_type, device_id, external_id)` already exists with same
content hash → `is_duplicate: true`. If exists but content differs → update.

**POST /api/v1/conversations/batch** — Batch ingest.

### Query API

**GET /api/v1/conversations** — List with filtering.

Params: `source`, `device`, `project`, `since`, `until`, `search`, `status`, `limit`, `offset`

**GET /api/v1/conversations/:id** — Full detail with messages and extractions.

**GET /api/v1/extractions** — List extracted knowledge.

Params: `type` (tech_solution/concept/work_log/prompt), `project`, `since`, `until`, `search`

**GET /api/v1/projects** — All projects with counts and last activity.

**GET /api/v1/stats** — Dashboard statistics.

### Configuration API

**GET /api/v1/config** — Current server configuration.

**PUT /api/v1/config** — Update configuration.

### MCP Server Interface

Tools provided:
- `search_conversations(query, project?, since?)` — Full-text search
- `get_conversation(id)` — Get full conversation
- `get_project_context(project)` — Recent conversations + extractions for a project
- `get_recent_work_log(days?)` — Recent work log entries

---

## Server Components

### 1. Ingest Service
REST API receiving ConversationObjects. Validates, deduplicates, stores, enqueues.

### 2. Storage Layer
SQLite for structured data + file system for raw content. FTS5 for search.

### 3. Processor
Background worker:
- Step 1 — Classify (no LLM): project detection, auto-tagging, complexity scoring
- Step 2 — Extract (LLM, optional): call LLM adapter, parse JSON, store extractions
- Step 3 — Output: generate notes from templates, push via output adapters

### 4. LLM Engine
Pluggable adapters:
- `anthropic` — Claude API (Haiku/Sonnet/Opus)
- `openai` — OpenAI or compatible endpoints (GPT-4o, Groq, Together)
- `ollama` — Local models
- `disabled` — No LLM, classification only

### 5. Output Engine
Pluggable adapters (multiple can be active):
- `fns` — Fast Note Sync REST API
- `notion` — Notion API
- `local` — Write .md files to local directory
- `git` — Git repo with auto commit+push
- `webhook` — POST JSON to any URL

### 6. Web UI
React frontend served by the Go server:
- Dashboard — stats, recent activity, processing status
- Conversations — browse, search, filter, view full conversations
- Knowledge — browse extracted tech solutions, concepts, prompts
- Projects — per-project conversation and knowledge view
- Timeline — chronological work log across all projects
- Settings — configure output adapters, LLM, templates, API tokens

### 7. MCP Server
Model Context Protocol interface enabling Claude Code to search and retrieve
conversation history. Creates a feedback loop: AI conversations → AIChatLog → AI context.

---

## Template System

Templates use `{{variable}}` substitution. Users override by placing custom
files in a configured directory.

Built-in templates:
```
templates/
├── conversation.md.tpl
├── tech-solution.md.tpl
├── concept.md.tpl
├── prompt-template.md.tpl
├── daily-entry.tpl
├── work-log-entry.tpl
├── project-log.md.tpl
└── weekly-summary.md.tpl
```

---

## Input Plugin Spec

### aichatlog-cc (Claude Code Plugin)

Stop hook → parse JSONL → ConversationObject → POST to server.

Slash commands:
- `/aichatlog:setup` — Configure server URL and token
- `/aichatlog:push` — Manually push current conversation
- `/aichatlog:status` — Connection status and queue size
- `/aichatlog:search <query>` — Search past conversations via server

Offline resilience: queue ConversationObjects locally, flush on reconnect.

### Future plugins:
- ChatGPT browser extension (source.type = "chatgpt")
- Claude.ai browser extension (source.type = "claude-ai")
- Direct API client library (Python/JS)

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Server language | Go | Fast, single binary, same as FNS |
| Database | SQLite + FTS5 | Zero ops, easy backup |
| Web framework | Gin or Echo | Lightweight Go frameworks |
| Frontend | React (Vite) | Embedded in Go binary |
| MCP | Go MCP SDK | Native MCP server |
| Container | Docker | One-click deploy |
| CC Plugin | Python (zero deps) | Plugin distribution constraint |

---

## Deployment

```bash
# Docker (recommended)
docker run -d --name aichatlog \
  -p 8080:8080 \
  -v ~/aichatlog-data:/data \
  aichatlog/server:latest

# One-line install
curl -fsSL https://aichatlog.dev/install.sh | bash

# Binary
./aichatlog serve
```

First visit to http://localhost:8080:
1. Create admin account
2. Configure output adapter(s)
3. Get API token for plugins
4. (Optional) Configure LLM adapter

CC Plugin:
```
/plugin marketplace add https://github.com/aichatlog/aichatlog
/aichatlog:setup
```

---

## Knowledge Extraction

### LLM Prompt (one call, four output types)

System prompt extracts: tech_solutions, concepts, work_log, prompts.
Returns structured JSON. Only includes types that are genuinely present.

### Cost
- Haiku: ~$0.006/conversation → ~$3.60/month at 20 convos/day
- Sonnet: ~$0.021/conversation (auto-upgrade for long conversations)
- Budget control: configurable monthly limit, minimum conversation length filter

### Extraction outputs

| Type | Location | Description |
|------|----------|-------------|
| Tech solution | `AI-Knowledge/atomic/tech/` | Problem → solution → code → gotchas |
| Concept note | `AI-Knowledge/atomic/concepts/` | One concept per note, cross-linked |
| Work log | `Daily/` + `projects/*/log.md` | Dual-dimension: timeline + project |
| Prompt template | `AI-Knowledge/atomic/prompts/` | Effective prompts worth reusing |

---

## Roadmap

### v0.1 — Foundation
- Server: ingest API, SQLite storage, FTS5 search, local + FNS output, minimal Web UI, Docker
- CC Plugin: capture, ConversationObject, POST to server, offline queue, /aichatlog:setup

### v0.2 — Knowledge extraction
- LLM adapter interface + Anthropic/OpenAI adapters
- Extraction prompt, JSON parsing, atomic note generation
- Template system with user overrides
- Work log dual-dimension, cost tracking

### v0.3 — Multi-output + MCP
- Notion, Git, Webhook output adapters
- MCP Server for Claude Code integration
- Web UI: knowledge browser, project view, timeline

### v0.4 — Multi-input
- ChatGPT browser extension
- Claude.ai browser extension
- Import from exported data (ChatGPT/Claude export zips)

### v1.0 — Stable release
- Comprehensive docs, marketplace listing
- 3+ output adapters, 2+ LLM adapters, 2+ input plugins tested
- Community contributions guide, template gallery

### Future
- Weekly/monthly summary generation
- Knowledge graph visualization
- Team mode (multi-user)
- Cross-conversation insight detection
- Ollama adapter for fully offline operation

---

## Repository Structure

```
github.com/aichatlog/aichatlog
├── server/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── api/
│   │   ├── storage/
│   │   ├── processor/
│   │   ├── llm/
│   │   ├── output/
│   │   ├── mcp/
│   │   └── web/
│   ├── templates/
│   ├── migrations/
│   ├── Dockerfile
│   └── docker-compose.yml
├── plugins/
│   └── claude-code/
│       ├── .claude-plugin/plugin.json
│       ├── commands/
│       ├── hooks/hooks.json
│       ├── skills/aichatlog/SKILL.md
│       └── scripts/aichatlog.py
├── protocol/
│   ├── conversation.schema.json
│   ├── api.openapi.yaml
│   └── examples/
├── docs/
├── README.md
├── LICENSE (AGPL-3.0)
└── CONTRIBUTING.md
```

---

## Success Metrics

1. **Adoption** — GitHub stars, plugin installs, Docker pulls
2. **Retention** — Users running the server after 1 week
3. **Contribution** — PRs for new adapters, plugins, templates
4. **Ecosystem** — Third-party plugins and integrations

First milestone: **One user (you) using it daily across 3 devices for 2 weeks
with conversations flowing from CC → Server → Obsidian.**
