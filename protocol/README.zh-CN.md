# ConversationObject 协议 v1

[English](README.md) | 简体中文

ConversationObject 是输入插件和 aichatlog-server 之间使用的开放传输格式。任何产出此 JSON 格式的工具都能与 AIChatLog 集成。

## Schema

完整 JSON Schema 定义参见 [conversation.schema.json](conversation.schema.json)。

## 快速参考

```json
{
  "version": 1,
  "source": "claude-code",
  "device": "macbook",
  "session_id": "unique-id",
  "title": "对话标题",
  "date": "2026-03-20",
  "project": "project-name",
  "project_path": "/path/to/project",
  "model": "claude-sonnet-4",
  "message_count": 4,
  "word_count": 320,
  "content_hash": "md5-or-sha256-hex",
  "messages": [
    {"role": "user", "content": "...", "time_str": "14:30", "is_context": false, "seq": 0},
    {"role": "assistant", "content": "...", "time_str": "14:31", "is_context": false, "seq": 1}
  ]
}
```

## 必填字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `version` | integer | 始终为 `1` |
| `source` | string | AI 工具标识：`claude-code`、`chatgpt`、`claude-ai` 等 |
| `session_id` | string | 源工具中的唯一对话 ID |
| `title` | string | 对话标题 |
| `date` | string | `YYYY-MM-DD` 格式 |
| `messages` | array | 至少一条消息 |

## 去重

服务器通过 `(source_type, device, session_id)` 元组去重。如果相同键的对话以不同的 `content_hash` 到达，将被视为更新。

## 服务器 API

完整 OpenAPI 规范参见 [api.openapi.yaml](api.openapi.yaml)。

主要端点：
- `POST /api/conversations` — 接收单个 ConversationObject
- `POST /api/conversations/batch` — 批量接收 ConversationObject 数组
- `POST /api/conversations/sync` — v2 条件同步（check/delta/full 模式）
- `GET /api/conversations` — 列表查询，支持过滤、搜索 (FTS5) 和分页
- `GET /api/conversations/:id?full=true` — 获取对话及消息
- `GET /api/conversations/:id/messages` — 仅获取消息
- `GET /api/stats` — 按状态统计对话数量

## 示例

- [claude-code-conversation.json](examples/claude-code-conversation.json)
- [chatgpt-conversation.json](examples/chatgpt-conversation.json)

## 构建插件

为新的 AI 工具构建输入插件：

1. 解析该工具的对话格式
2. 映射为 ConversationObject JSON
3. POST 到服务器的 `/api/conversations` 端点
4. 服务器负责去重、存储、FTS 索引和输出

`source` 字段应为你的工具的小写标识符（如 `gemini`、`copilot`、`cursor`）。
