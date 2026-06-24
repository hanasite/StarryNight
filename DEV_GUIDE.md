# 🔧 StarryNight 开发指南

面向想二次开发的同学，说明项目结构、常用改动点、静态/动态两部分的修改方法。

## 📂 项目总览

```
StarryNight/
├── Mizuki/                 # Astro 前端（Mizuki 主题魔改）
│   ├── src/
│   │   ├── config/         # 🔥 核心配置：导航栏、侧边栏、站点信息、Banner
│   │   ├── pages/          # 页面：ticker/blog/todo/gallery/guestbook/about...
│   │   ├── components/     # 组件：Banner、侧边栏 Widget、时间线卡片
│   │   ├── content/        # 静态内容：about.md、Markdown 博文、时间线数据
│   │   ├── data/           # 静态数据：timeline.ts（时间线条目）
│   │   ├── layouts/        # 布局：MainGridLayout（含 Banner + 侧边栏）
│   │   └── styles/         # CSS 样式
│   └── public/lib/         # 🔥 客户端 JS：动态数据获取、表单提交、渲染
├── docker-compose.yml      # Docker 编排
├── nginx.conf              # 反向代理 + 认证 + 缓存
├── dev-server.js           # 本地开发代理服务器
└── daily-banner.sh         # NAS 每日随机轮播脚本
```

## 🎨 静态部分（Mizuki Astro）

Mizuki 基于 Astro，提供完整的二次元 MD3 主题框架。静态内容在构建时生成。

### 修改站点信息

`src/config/siteConfig.ts` — 站点标题、副标题、语言、Banner 配置

```ts
title: "StarryNight",
subtitle: "...",
lang: "zh_CN",
banner: {
  src: { desktop: [...], mobile: [...] },
  carousel: { enable: true, interval: 3 },
  imageApi: { enable: false, url: "..." },  // 动态图片 API
}
```

### 修改导航栏

`src/config/navBarConfig.ts` — 增删导航项

```ts
{ name: "留言板", url: "/guestbook/", icon: "material-symbols:forum" }
```

### 修改侧边栏

`src/config/sidebarConfig.ts` — 控制左右侧边栏挂件

```ts
components: {
  left: ["profile", "announcement", "card-toc", "guestbook-link"],
  right: ["site-stats", "calendar", "categories", ...],
}
```

可用组件类型定义在 `src/types/config.ts` 的 `WidgetComponentType`。

### 新增侧边栏组件（以 guestbook-link 为例）

1. 创建组件 `src/components/widgets/xxx/Xxx.astro`
2. 注册到 `src/utils/widget-manager.ts` 的 `WIDGET_COMPONENT_MAP`
3. 添加类型到 `src/types/config.ts` 的 `WidgetComponentType`
4. 在 `src/components/layout/SidebarColumn.astro` 中 import 并加入 `componentMap`
5. 在 `src/config/sidebarConfig.ts` 中配置

### 主题色

`src/config/siteConfig.ts` 中 `themeColor.hue` — 修改色相值即可换主题色。

### 关于页面

`src/content/spec/about.md` — 直接编辑 Markdown。

### 时间线数据

`src/data/timeline.ts` — 静态历程条目，支持 education/work/project/achievement 四种类型。

### Markdown 博文

`src/content/posts/` — 放 `.md` 文件，前端格式：

```md
---
title: 文章标题
published: 2026-06-24
pinned: true
tags: [标签1, 标签2]
category: 分类
draft: false
---

文章正文（Markdown）
```

### Banner 轮播

- 静态图片：修改 `siteConfig.ts` 的 `banner.src`
- 动态 API：启用 `banner.imageApi` 指向图片接口
- 每日随机：见 `daily-banner.sh`，客户端注入 `public/lib/daily-banner.js`

### 特效开关

- 樱花飘落：`src/config/effectsConfig.ts` → `enable: true/false`
- 辉光管时钟：`src/components/widgets/nixie-clock/`，sidebarConfig 中控制
- 全屏壁纸：`src/config/backgroundWallpaper.ts`

## 🔄 动态部分（Memos REST API）

动态页面通过客户端 JS 调用 Memos API 获取数据。前端源码在 `public/lib/`。

### 数据流

```
浏览器 → Nginx :3000 → /api/* → Memos :5230
                        /api/guestbook → Memos :5230（免登录）
```

### 核心 JS 文件

| 文件 | 功能 |
|------|------|
| `public/lib/memos-client.js` | 获取 Memos 数据、渲染卡片、标签云、TODO checkbox |
| `public/lib/memo-form.js` | 创建/编辑/删除表单、FAB 按钮、MD 工具栏 |
| `public/lib/guestbook.js` | 留言板免登录提交 + 编辑/删除 |
| `public/lib/daily-banner.js` | 每日随机 Banner 注入 |
| `public/lib/todo-templates.js` | TODO 模板 |

### Memos API 参考

[Memos API 文档](https://github.com/usememos/memos)

```bash
# 创建 memo
POST /api/v1/memos
{"content": "内容 #ticker", "visibility": "PUBLIC"}

# 获取 memo 列表
GET /api/v1/memos?tag=ticker&limit=20

# 更新 memo
PATCH /api/v1/memos/{id}
{"content": "新内容 #ticker"}

# 删除 memo
DELETE /api/v1/memos/{id}
```

标签自动分类规则：

| 标签 | 页面 |
|------|------|
| `#ticker` | 碎碎念 |
| `#blog` | 博文 |
| `#todo` | 待办 |
| `#gallery` | 图床 |
| `#guestbook` | 留言板 |
| `#milestone` | 时间线动态区 |

### 新增动态页面

参考 `src/pages/ticker.astro` 模板：

1. 新建 `src/pages/xxx.astro`
2. 引入 `memos-client.js` + `memo-form.js`
3. 设置 `data-filter` 过滤条件（Memos tag 过滤语法）
4. 调用 `memosClient.init()` 初始化

### 认证体系

- **浏览器端**：设置 `memos_key` Cookie 即可获得编辑权限
- **Agent/API 端**：Bearer Token → Nginx 自动注入
- **留言板**：`/api/guestbook` 免 Cookie，Nginx 注入 Token

### AI Agent 推送

详见 [AI_AGENT_PUSH_GUIDE.md](AI_AGENT_PUSH_GUIDE.md) 和 `.claude/skills/memos-push/`

## 🐳 部署相关

### 本地开发

```bash
cd Mizuki && pnpm install && pnpm build
node ../dev-server.js  # 代理 /api/* → Memos
```

`dev-server.js` 的 `/lib/` 文件从 `public/` 直接读取，修改 JS 无需重建。

### 一键部署（Agent）

```bash
# PC 项目根目录，设置环境变量后一键推送
export MEMOS_TOKEN="memos_pat_xxx"
export COOKIE_KEY="your-secret-key"
bash deploy.sh
```

`deploy.sh` 自动完成：构建 → 上传 → 替换 token → 修权限 → 重启 nginx。

### NAS 手动部署

详见 [DEPLOY_TO_NAS.md](DEPLOY_TO_NAS.md)

### Nginx 配置关键点

- Cookie 认证写操作
- 每日 Banner JSON 短缓存
- 留言板独立端点 + 限流
- 静态资源长期缓存

## 📝 Mizuki 原文档

- [Mizuki 项目](https://github.com/LyraVoid/Mizuki)
- Mizuki 提供：Astro 静态生成、MD3 主题、响应式布局、多语言、Banner 系统、侧边栏 Widget 系统

## 🔗 Memos 参考

- [Memos 项目](https://github.com/usememos/memos)
- [Memos API 文档](https://usememos.com/docs/apis)
- Memos 提供：REST API、MCP 协议、SQLite 存储、标签系统

---

*欢迎 PR，一起让 StarryNight 更好 ✨*
