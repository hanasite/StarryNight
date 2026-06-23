# 🌟 StarryNight — Mizuki × Memos 二次元自建站

> So everything that makes me whole  
> 今君に捧げよう  
> I'm Yours

基于 [Mizuki](https://github.com/LyraVoid/Mizuki) 主题 + [Memos](https://github.com/usememos/memos) 后端缝合而来的二次元风格个人站点。支持 AI Agent 自动推送 ✨

## 🏗 架构

```
浏览器 → Nginx :3000 → Mizuki 静态文件
                       → /api/* → Memos :5230
                       → /mcp  → Memos MCP（AI Agent 调用）

AI Agent → Memos :5230/mcp   (MCP 协议)
         → Memos :5230/api/v1/memos (REST 接口)
```

## 📄 页面

| 路径 | 功能 | 数据来源 |
|------|------|----------|
| `/` | 首页 · 横幅轮播 | 静态 + 每日随机图 |
| `/ticker/` | 碎碎念 | Memos `#ticker` |
| `/blog/` | 博文 | Memos `#blog` |
| `/todo/` | 待办清单 | Memos `#todo` |
| `/gallery/` | 图床 | Memos `#gallery` |
| `/timeline/` | 历程时间线 | 静态 + Memos `#milestone` |
| `/about/` | 关于本站 | 静态 |

## 🚀 快速开始

### 环境要求
- Node.js 18+ / pnpm
- Docker & Docker Compose
- 一台 NAS 或服务器（已测试：飞牛OS）

### 本地开发

```bash
# 1. 启动 Memos
docker run -d --name memos -p 5230:5230 \
  -v ~/.memos:/var/opt/memos \
  neosmemo/memos:stable

# 2. 构建并启动
cd Mizuki
pnpm install
pnpm build
node ../dev-server.js

# 3. 浏览器打开 http://localhost:3000
```

### 部署到 NAS

```bash
# 1. PC 上构建
cd Mizuki && pnpm build

# 2. 复制到 NAS
scp -r dist/* user@nas:/volume1/docker/blog/www/
scp docker-compose.yml nginx.conf user@nas:/volume1/docker/blog/

# 3. 编辑 nginx.conf → 替换 YOUR_MEMOS_TOKEN 和 YOUR_COOKIE_KEY

# 4. NAS 上启动
cd /volume1/docker/blog
docker compose up -d
```

## 🤖 AI Agent 推送

详细指南见 [AI_AGENT_PUSH_GUIDE.md](AI_AGENT_PUSH_GUIDE.md)。

### REST 接口速查

```bash
curl -X POST http://NAS地址:5230/api/v1/memos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"今天天气真好 #ticker","visibility":"PUBLIC"}'
```

### 标签速查

| 标签 | 对应页面 |
|-----|-----------|
| `#ticker` | `/ticker/` |
| `#blog` | `/blog/` |
| `#todo` | `/todo/` |
| `#gallery` | `/gallery/` |
| `#milestone` | `/timeline/` |

## 🎨 特性

- **Mizuki** 二次元 Astro 主题，Material Design 3 风格
- **Memos** 轻量 Go 后端，REST API + MCP 双通道
- **每日随机轮播** — NAS 定时从素材库随机抽取图片
- **Markdown 工具栏** — 快捷插入标题、粗体、代码、删除线、分割线
- **Cookie 认证** 浏览器端 · **PAT Token** Agent 端
- **辉光管时钟** Steins;Gate 风格（可选）

## 📂 项目结构

```
StarryNight/
├── Mizuki/                 # Astro 前端（魔改自 Mizuki 主题）
├── docker-compose.yml      # Docker 编排（Nginx + Memos）
├── nginx.conf              # 反向代理配置（含认证）
├── dev-server.js           # 本地开发代理服务器
├── daily-banner.sh         # NAS 每日随机轮播脚本
├── README.md               # 英文说明
├── README.zh.md            # 中文说明（本文件）
├── AI_AGENT_PUSH_GUIDE.md  # AI Agent 推送指南
└── DEPLOY_TO_NAS.md        # NAS 部署指南
```

## 🙏 致谢

- **[Mizuki](https://github.com/LyraVoid/Mizuki)** — 超棒的 Astro 二次元主题
- **[Memos](https://github.com/usememos/memos)** — 轻量自建备忘录
- **[Claude Code](https://claude.ai/code)** — AI 编程搭子，全程陪跑

---

<p align="center">
  <b>开源万岁！</b> 🌟<br>
  made with ❤️ by <a href="https://github.com/hanasite">hanasite</a>
</p>
