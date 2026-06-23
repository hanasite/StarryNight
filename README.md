# 🌟 StarryNight — Mizuki × Memos 二次元自建站

[中文](README.zh.md) | English

> 如果你也是那种  
> 喜欢分享情绪和感受、随手记下某个瞬间的小孩；  
> 如果你也想在抬头就能望见天花板的空间里，  
> 造一座属于自己的小窝——  
> 那些美好的、快乐的、不好的、悲伤的，  
> 就把它们当作一颗颗星星，挂在这里吧……  
> （未完待续）
>
> If you too are one of those  
> who love to share feelings and capture moments on a whim;  
> If you too want to build a little nest of your own  
> in that space where you look up and see nothing but the ceiling—  
> then let every beautiful, joyful, painful, or sorrowful moment  
> become a star, and hang it right here…  
> (to be continued)

> So everything that makes me whole  
> 今君に捧げよう  
> I'm Yours

A self-hosted anime-style personal site blending **static beauty + dynamic memos**.  
Built by stitching together [Mizuki](https://github.com/LyraVoid/Mizuki) (Astro theme) and [Memos](https://github.com/usememos/memos) (Go backend), with a sprinkle of AI Agent magic ✨

## 📸 Preview

<p align="center">
  <img src="images/homepage.png" alt="Homepage" width="45%">
  <img src="images/ticker.png" alt="Ticker" width="45%">
  <br>
  <img src="images/gallery.png" alt="Gallery" width="30%">
  <img src="images/timeline.png" alt="Timeline" width="30%">
  <img src="images/about.png" alt="About" width="30%">
</p>

## 🏗 Architecture

```
Browser → Nginx :3000 → Mizuki static files
                       → /api/* → Memos :5230
                       → /mcp  → Memos MCP (AI Agent)

AI Agent → Memos :5230/mcp   (MCP)
         → Memos :5230/api/v1/memos (REST)
```

## 📄 Pages

| Path | Content | Source |
|------|---------|--------|
| `/` | Home · banner carousel | static + daily random |
| `/ticker/` | 碎碎念 (thoughts) | Memos `#ticker` |
| `/blog/` | 博文 (posts) | Memos `#blog` |
| `/todo/` | 待办 (checklist) | Memos `#todo` |
| `/gallery/` | 图床 (images) | Memos `#gallery` |
| `/timeline/` | 历程 (milestones) | static + Memos `#milestone` |
| `/about/` | 关于 | static |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ / pnpm
- Docker & Docker Compose
- A NAS or server (tested on 飞牛OS)

### Local Dev

```bash
# 1. Start Memos
docker run -d --name memos -p 5230:5230 \
  -v ~/.memos:/var/opt/memos \
  neosmemo/memos:stable

# 2. Build & serve
cd Mizuki
pnpm install
pnpm build
node ../dev-server.js

# 3. Open http://localhost:3000
```

### Deploy to NAS

```bash
# 1. Build on PC
cd Mizuki && pnpm build

# 2. Copy to NAS
scp -r dist/* user@nas:/volume1/docker/blog/www/
scp docker-compose.yml nginx.conf user@nas:/volume1/docker/blog/

# 3. Edit nginx.conf → replace YOUR_MEMOS_TOKEN and YOUR_COOKIE_KEY

# 4. Start on NAS
cd /volume1/docker/blog
docker compose up -d
```

## 🤖 AI Agent Push

See [AI_AGENT_PUSH_GUIDE.md](AI_AGENT_PUSH_GUIDE.md) for detailed instructions.

### Quick REST API

```bash
curl -X POST http://NAS:5230/api/v1/memos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello World #ticker","visibility":"PUBLIC"}'
```

### Tag Reference

| Tag | Appears on |
|-----|-----------|
| `#ticker` | `/ticker/` |
| `#blog` | `/blog/` |
| `#todo` | `/todo/` |
| `#gallery` | `/gallery/` |
| `#milestone` | `/timeline/` |

## 🎨 Features

- **Mizuki** — beautiful MD3 anime-style Astro theme
- **Memos** — lightweight Go backend with REST API + MCP
- **Daily random banner** — picks 5-6 images from your pool via NAS cron
- **MD toolbar** — quick insert headers, bold, code, strikethrough, separator
- **Cookie auth** for browser · **PAT token** for agents
- **Nixie tube clock** widget (Steins;Gate style, optional)

## 📂 Project Structure

```
StarryNight/
├── Mizuki/                 # Astro frontend (forked & customized)
├── docker-compose.yml      # Nginx + Memos containers
├── nginx.conf              # Reverse proxy with auth
├── dev-server.js           # Local dev proxy + static server
├── daily-banner.sh         # NAS cron: daily random banner images
├── README.md
├── AI_AGENT_PUSH_GUIDE.md
└── DEPLOY_TO_NAS.md
```

## 🙏 Credits

- **[Mizuki](https://github.com/LyraVoid/Mizuki)** — the gorgeous Astro theme that started it all
- **[Memos](https://github.com/usememos/memos)** — the lightweight memo hub
- **[Claude Code](https://claude.ai/code)** — AI pair programming companion

---

<p align="center">
  <b>开源万岁！</b> 🌟<br>
  made with ❤️ by <a href="https://github.com/hanasite">hanasite</a>
</p>
