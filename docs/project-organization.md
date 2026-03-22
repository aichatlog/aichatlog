# AIChatLog — Project Organization Guide

## GitHub Organization

**Create:** github.com/aichatlog

---

## Phase 1: Monorepo (start here)

### Repository: aichatlog/aichatlog

```
aichatlog/
├── README.md
├── LICENSE (AGPL-3.0)
├── CONTRIBUTING.md
├── CHANGELOG.md
│
├── protocol/
│   ├── README.md
│   ├── conversation.schema.json
│   ├── api.openapi.yaml
│   ├── extraction.schema.json
│   └── examples/
│       ├── claude-code-conversation.json
│       ├── chatgpt-conversation.json
│       └── extraction-result.json
│
├── server/
│   ├── README.md
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── Makefile
│   ├── go.mod
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── api/
│   │   ├── storage/
│   │   ├── processor/
│   │   ├── llm/
│   │   │   ├── adapter.go
│   │   │   ├── anthropic.go
│   │   │   ├── openai.go
│   │   │   └── ollama.go
│   │   ├── output/
│   │   │   ├── adapter.go
│   │   │   ├── local.go
│   │   │   ├── fns.go
│   │   │   ├── notion.go
│   │   │   ├── git.go
│   │   │   └── webhook.go
│   │   ├── mcp/
│   │   └── web/
│   ├── templates/
│   ├── migrations/
│   └── web/src/
│
├── plugins/
│   ├── README.md
│   └── claude-code/
│       ├── .claude-plugin/plugin.json
│       ├── commands/
│       │   ├── setup.md
│       │   ├── status.md
│       │   ├── push.md
│       │   └── search.md
│       ├── hooks/hooks.json
│       ├── skills/aichatlog/SKILL.md
│       ├── scripts/aichatlog.py
│       └── README.md
│
├── docs/
│   ├── getting-started.md
│   ├── server-setup.md
│   ├── cc-plugin-setup.md
│   ├── output-adapters.md
│   ├── llm-adapters.md
│   ├── template-guide.md
│   ├── plugin-development.md
│   ├── api-reference.md
│   └── architecture.md
│
└── .github/
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.md
    │   ├── feature_request.md
    │   └── plugin_request.md
    ├── workflows/
    │   ├── server-ci.yml
    │   ├── plugin-ci.yml
    │   └── release.yml
    └── PULL_REQUEST_TEMPLATE.md
```

---

## Labels

```
component/server
component/plugin-cc
component/protocol
component/web-ui
component/docs

type/bug
type/feature
type/enhancement
type/plugin-request

adapter/llm-anthropic
adapter/llm-openai
adapter/llm-ollama
adapter/output-fns
adapter/output-notion
adapter/output-git

priority/high
priority/medium
priority/low

status/needs-design
status/ready-to-build
status/in-progress
```

## Milestones

```
v0.1 — Foundation
v0.2 — Knowledge extraction
v0.3 — Multi-output + MCP
v0.4 — Multi-input
v1.0 — Stable release
```

---

## Phase 2: Split (when ready)

```
aichatlog/
├── aichatlog-server
├── aichatlog-protocol
├── aichatlog-plugin-cc
├── aichatlog-docs
└── awesome-aichatlog
```

---

## Phase 3: Open ecosystem

Official:
```
aichatlog/aichatlog-plugin-cc
aichatlog/aichatlog-plugin-chatgpt
aichatlog/aichatlog-plugin-claude-ai
```

Community:
```
user/aichatlog-plugin-gemini
user/aichatlog-plugin-copilot
user/aichatlog-adapter-joplin
```

Naming convention:
```
aichatlog-plugin-{source}
aichatlog-adapter-{destination}
aichatlog-template-{use-case}
```

---

## Branching & CI

Phase 1: `main` + `feature/xxx` branches. Tag releases `v0.1.0`.

CI triggers:
- `server/**` or `protocol/**` → Go build + test + Docker build
- `plugins/claude-code/**` or `protocol/**` → plugin validation
- Tags `v*` → build binaries + Docker image + GitHub Release

---

## Quick Start

1. Create GitHub org: **aichatlog**
2. Create repo: **aichatlog/aichatlog**
3. Initialize structure, copy design docs to `docs/`
4. Create v0.1 milestone issues:
   - [ ] Define ConversationObject JSON Schema
   - [ ] Server: Go project scaffold
   - [ ] Server: ingest API endpoint
   - [ ] Server: SQLite storage layer
   - [ ] Server: local file output adapter
   - [ ] Server: minimal Web UI
   - [ ] Server: Docker deployment
   - [ ] CC Plugin: produce ConversationObject
   - [ ] CC Plugin: POST to server API
   - [ ] CC Plugin: offline queue
   - [ ] CC Plugin: /aichatlog:setup command
   - [ ] Docs: getting started guide
5. Start building: `protocol/` → `server/` → `plugins/claude-code/`
