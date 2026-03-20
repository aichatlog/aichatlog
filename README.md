# AIChatLog

Log your AI conversations. Keep the knowledge.

AIChatLog captures AI conversations from any source, stores them in a central database, and pushes them to your knowledge base.

## Architecture

```
                 ConversationObject (open protocol)
                              |
        +---------------------+---------------------+
        |                     |                     |
  claude-code plugin    (your plugin)          (curl/script)
        |                     |                     |
        +---------------------+---------------------+
                              |
                              v
                      aichatlog-server
                    (SQLite + REST API)
                              |
                   +----------+----------+
                   |          |          |
                  FNS       Local      Git
               (Obsidian)  (.md files) (auto-commit)
```

## Quick Start

### 1. Start the server

```bash
# Docker
cd server && docker compose up -d

# Or from source
cd server && go build -o aichatlog-server ./cmd/server
./aichatlog-server --port 8080 --token your-secret-token
```

### 2. Install the Claude Code plugin

```bash
pip install git+https://github.com/aichatlog/aichatlog.git#subdirectory=plugins/claude-code
aichatlog install
aichatlog setup
```

Conversations are automatically captured on every Claude Code session end.

## Project Structure

```
aichatlog/
├── server/              # Go REST API server (SQLite + multi-source)
├── plugins/
│   └── claude-code/     # Claude Code capture plugin (Python, stdlib only)
├── docs/                # Product design documents
└── README.md
```

## Documentation

- [Product Design](docs/product-design.md)
- [Knowledge Extraction](docs/knowledge-extraction.md)
- [Project Organization](docs/project-organization.md)

## License

MIT
