---
name: memos-push
description: Push Markdown content to Kakun's blog via Memos API. Supports ticker (碎碎念), blog (博文), todo (待办), gallery (图床), milestone (里程碑). Use when the user wants to post, push, send, or publish content to their blog, ticker, todo list, gallery, or milestones. Trigger on: 发博客, 发碎碎念, 加待办, 推送到博客, post to blog, push memo.
---

# Memos Push

Push Markdown content to the self-hosted Memos blog via REST API.

## Quick reference

| Type | Tag | Page |
|------|-----|------|
| ticker | `#ticker` | `/ticker` |
| blog | `#blog` | `/blog` |
| todo | `#todo` | `/todo` |
| gallery | `#gallery` | `/gallery` |
| milestone | `#milestone` | `/timeline` |

## API

```
POST http://YOUR_NAS_IP:3000/api/v1/memos
Authorization: Bearer YOUR_MEMOS_TOKEN
Content-Type: application/json
Body: {"content": "markdown content with #tag"}
```

## Script

Use `scripts/push_memo.js` (Node.js, no dependencies) for reliable, token-efficient pushes:

```bash
# From stdin:
echo "今天学会了 Rust" | node push_memo.js ticker

# From argument:
node push_memo.js blog "## My Post Title\n\nContent here..."

# Multi-line (heredoc):
cat << 'EOF' | node push_memo.js todo
## 本周计划
- [ ] 重构 API
- [ ] 写文档
- [ ] Code Review
EOF
```

Or the bash version `scripts/push_memo.sh` for Linux/Mac environments.
Both auto-append the correct `#tag` to content if missing.

## Content guidelines

- All content is Markdown format
- ticker: short, single-line thoughts (碎碎念)
- blog: full articles with `## title`, paragraphs, code blocks
- todo: checklists with `- [ ]` syntax
- gallery: image-focused, can include description
- milestone: achievement/project entries for the timeline
