# 🌟 StarryNight — Mizuki × Memos 二次元自建站

[中文](README.zh.md) | English

> 如果你也是那种  
> 喜欢分享情绪和感受、随手记下某个瞬间的小孩；  
> 如果你也想在抬头就能望见天花板的空间里，  
> 造一座属于自己的小窝——  
> 那些美好的、快乐的、不好的、悲伤的，  
> 就把它们当作一颗颗星星，挂在这里吧……  

> So everything that makes me whole  
> 今君に捧げよう  
> I'm Yours

**StarryNight** is an anime-style self-hosted personal site that blends **static pages with dynamic memos**. Built with [Mizuki](https://github.com/LyraVoid/Mizuki) (Astro MD3 theme) + [Memos](https://github.com/usememos/memos) (Go backend), plus AI Agent integration via MCP protocol.

**Project meaning:** Turn every joyful, sorrowful, and tiny moment of life into stars, storing them in your own little nest ✨

## 📸 Preview

<p align="center">
  <img src="images/homepage.png" alt="Homepage" width="45%">
  <img src="images/ticker.png" alt="Ticker" width="45%">
  <br>
  <img src="images/editor.png" alt="Editor" width="45%">
  <img src="images/timeline.png" alt="Timeline" width="45%">
  <br>
  <img src="images/gallery.png" alt="Gallery" width="30%">
  <img src="images/about.png" alt="About" width="30%">
</p>

## 🏗 Architecture

```
Browser → Nginx :3000 → Mizuki static files
                       → /api/* → Memos :5230 (REST API)
                       → /mcp  → Memos :5230 (MCP for AI Agent)

AI Agent → REST API /api/v1/memos  (curl, scripts)
         → MCP Protocol /mcp       (AI native interface)
```

**Key components:**

| Component | Role | Tech |
|-----------|------|------|
| **Mizuki** | Frontend static theme | Astro, MD3 design, anime style |
| **Memos** | Backend data service | Go, REST API, MCP, SQLite |
| **Nginx** | Reverse proxy & static serving | Routes traffic, injects auth |
| **daily-banner.sh** | Cron task | Random banner rotation |

## 📄 Pages & Content Sources

Content is automatically categorized by Memos tags — no manual sorting needed:

| Path | Page | Tag |
|------|------|-----|
| `/` | Home · Banner carousel | Static + daily random |
| `/ticker/` | 碎碎念 (Thoughts) | `#ticker` |
| `/blog/` | 博文 (Posts) | `#blog` |
| `/todo/` | 待办清单 (Todo) | `#todo` |
| `/gallery/` | 图库 (Gallery) | `#gallery` |
| `/timeline/` | 时间历程 (Timeline) | Static + `#milestone` |
| `/guestbook/` | 留言板 (Guestbook) | Memos `#guestbook` |
| `/about/` | 关于我 (About) | Static |

## ✨ Features

- **Anime MD3 UI** — Beautiful Material Design 3 visuals with anime aesthetic
- **Markdown editor** — Quick toolbar (headings, bold, code, dividers, etc.)
- **Lightweight self-hosted** — Run on NAS, VPS, or any Linux server
- **Daily random banner** — Optional 《Steins;Gate》-style digital clock widget
- **Dual auth** — Browser Cookie for web, Bearer Token for API/AI
- **AI Agent integration** — MCP protocol allows AI to read/write Memos automatically
- **REST API** — Full CRUD via curl, scripts, or any HTTP client

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ / pnpm
- Docker & Docker Compose
- A NAS or Linux server

### Local Dev

```bash
# 1. Start Memos backend
docker run -d --name memos -p 5230:5230 \
  -v ~/.memos:/var/opt/memos \
  neosmemo/memos:stable

# 2. Build & serve frontend
cd Mizuki
pnpm install
pnpm run build
pnpm run preview
```

### NAS Production Deploy

See [DEPLOY_TO_NAS.md](DEPLOY_TO_NAS.md) for full deployment guide.

```bash
# Quick deploy with docker-compose
docker compose up -d
```

### AI Agent Push

See [AI_AGENT_PUSH_GUIDE.md](AI_AGENT_PUSH_GUIDE.md) for AI integration docs.

```bash
# Push a ticker via API
echo "Hello StarryNight! #ticker" | curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @- http://localhost:5230/api/v1/memos
```

## 🎯 Target Audience

Perfect for anyone who:
- Loves journaling, photography, todo lists, and random thoughts
- Wants a fully private, self-hosted anime-style blog
- Doesn't want to rely on third-party platforms
- Has a NAS or server and enjoys DIY tech

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Astro, Mizuki Theme, MD3 |
| Backend | Go, Memos, SQLite |
| Proxy | Nginx (Alpine) |
| Runtime | Docker, Docker Compose |
| Automation | Bash, MCP Protocol |

## 🔧 Developer Guide

See [DEV_GUIDE.md](DEV_GUIDE.md) for architecture, customization, and APIs.

## 📜 License

MIT

---

*Made with ❤️ by [Kakun](https://github.com/hanasite)*
