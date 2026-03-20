# AIChatLog — Knowledge Extraction Design

## Overview

The knowledge extraction layer runs inside AIChatLog Server. It takes raw
conversations from the database, calls a pluggable LLM to extract structured
knowledge, and writes the results back as both database records and output notes.

---

## Pipeline

```
Every 30 min (configurable)
       │
       ▼
  Scan conversations WHERE status = 'processed' AND word_count > threshold
       │
       ▼
  For each: select LLM model based on length
       │
       ▼
  Call LLM adapter with extraction prompt → structured JSON
       │
       ▼
  Parse → store in extractions table → generate notes → push via output adapters
```

---

## LLM Prompt Design

### System prompt

```
You are a knowledge extraction assistant. You analyze AI coding assistant
conversations and extract structured knowledge for a knowledge base.

Given a conversation between a user and an AI, extract the following
(only include types that are relevant — not every conversation has all types):

1. tech_solutions: Technical problems solved with code
2. concepts: New concepts, technologies, or mental models explained
3. work_log: A one-line summary of what was accomplished
4. prompts: Particularly effective prompts worth reusing

Respond ONLY with valid JSON, no markdown fences, no preamble.
```

### User prompt template

```
Analyze this conversation and extract knowledge.

Context:
- Source: {source_type}
- Project: {project_name}
- Device: {device_name}
- Date: {date}
- Time: {time}

Conversation:
{conversation_content (truncated to ~6000 tokens)}

Respond with this JSON structure:
{
  "summary": "One sentence summary",
  "work_log_entry": "Concise log: what was done, key decisions",
  "tech_solutions": [
    {
      "title": "Short title",
      "problem": "What problem was being solved",
      "solution": "How it was solved",
      "code": "Key code snippet (if any)",
      "gotchas": ["Important caveats"],
      "tags": ["relevant", "tags"]
    }
  ],
  "concepts": [
    {
      "title": "Concept name",
      "explanation": "Clear explanation in your own words",
      "why_it_matters": "Practical relevance",
      "related": ["related concept 1", "related concept 2"]
    }
  ],
  "prompts": [
    {
      "title": "Descriptive name",
      "prompt_text": "The actual prompt",
      "when_to_use": "Use case",
      "why_effective": "Why this works well"
    }
  ]
}

Rules:
- Only include sections genuinely present in the conversation
- tech_solutions: only if actual code/technical solution was provided
- concepts: only if a concept was explained in depth
- prompts: only if the user's prompt was notably effective (rare)
- work_log_entry: always include — even for short conversations
- Write in the same language as the conversation
- Keep explanations concise but standalone-useful
```

---

## Output Note Templates

### Tech solution → `AI-Knowledge/atomic/tech/<date>-<slug>.md`

```markdown
---
type: tech-solution
date: {{date}}
project: "[[{{project}}]]"
tags: [tech-solution, {{tags}}]
source: "[[{{source_note}}]]"
---

# {{title}}

## Problem
{{problem}}

## Solution
{{solution}}

## Key code
{{code}}

## Gotchas
{{gotchas}}

## Related
{{related}}
```

### Concept → `AI-Knowledge/atomic/concepts/<slug>.md`

```markdown
---
type: concept
date: {{date}}
tags: [concept, {{tags}}]
source: "[[{{source_note}}]]"
---

# {{title}}

{{explanation}}

## Why it matters
{{why_it_matters}}

## See also
{{related}}
```

### Prompt → `AI-Knowledge/atomic/prompts/<slug>.md`

```markdown
---
type: prompt-template
date: {{date}}
tags: [prompt, {{tags}}]
source: "[[{{source_note}}]]"
---

# {{title}}

## Prompt
{{prompt_text}}

## When to use
{{when_to_use}}

## Why it works
{{why_effective}}
```

### Work log → dual dimension

**Daily note** (`Daily/{{date}}.md`, appended under `## Work log`):
```
- {{time}} [{{project}}] {{work_log_entry}} [[source_note|details]]
```

**Project log** (`AI-Knowledge/projects/{{project}}/log.md`, appended under `## {{date}}`):
```
- {{work_log_entry}} [[source_note|details]]
```

---

## Cost Control

| Model | Avg cost/conversation | 20/day estimate |
|-------|----------------------|-----------------|
| Haiku 4.5 | ~$0.006 | $3.60/month |
| Sonnet 4 | ~$0.021 | $12.60/month |

Configuration options:
- `max_monthly_budget` — stops extraction when reached
- `min_conversation_words` — skip trivial conversations (default: 100)
- `model_upgrade_threshold` — words before using larger model (default: 4000)
- Cost tracked in database, visible in Web UI dashboard

---

## Dataview Queries (for Obsidian users)

### All tech solutions this week
```dataview
TABLE tags, date FROM "AI-Knowledge/atomic/tech"
WHERE date >= date("2026-03-10") SORT date DESC
```

### Project work log
```dataview
LIST work_log_entry FROM "AI-Knowledge/conversations"
WHERE contains(project, "my-project") SORT date DESC LIMIT 20
```

### Knowledge base index
```dataview
TABLE WITHOUT ID link(file.path, title) AS "Concept", date
FROM "AI-Knowledge/atomic/concepts" SORT file.name ASC
```
