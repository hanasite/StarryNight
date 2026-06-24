---
title: 🌟 Hello, StarryNight！
published: 2026-06-24
pinned: true
description: StarryNight 项目介绍 — Mizuki × Memos 二次元自建站
tags: [StarryNight, 开源, 自建站]
category: Project
draft: false
---

如果你也是那种
喜欢分享情绪和感受、随手记下某个瞬间的小孩；
如果你也想在抬头就能望见天花板的空间里，
造一座属于自己的小窝——
那些美好的、快乐的、不好的、悲伤的，
就把它们当作一颗颗星星，挂在这里吧……

> So everything that makes me whole  
> 今君に捧げよう  
> I'm Yours

## 这是什么？

**StarryNight** 是一个二次元风格的自建个人站点。基于 [Mizuki](https://github.com/LyraVoid/Mizuki)（Astro MD3 主题）的漂亮皮囊 + [Memos](https://github.com/usememos/memos)（Go 轻量后端）的灵动心脏，由 [Claude Code](https://claude.ai/code) 陪跑开发，从零拼凑而来。

## 能做什么？

| 页面 | 功能 |
|------|------|
| 🏠 首页 | 每日随机轮播横幅 |
| 💬 碎碎念 | 像朋友圈一样的短动态 |
| 📝 博文 | Markdown 长文章 |
| ✅ 待办 | Checklist 清单 |
| 🖼️ 图床 | 图片上传与展示 |
| ⏳ 时间线 | 个人历程 + 里程碑 |
| 💌 留言板 | 访客留言（免登录） |

所有动态内容通过标签自动归类，AI Agent 也可以通过 REST API / MCP 直接推送内容。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Astro · Mizuki 主题 · MD3 |
| 后端 | Go · Memos · SQLite |
| 反向代理 | Nginx (Alpine) |
| 运行环境 | Docker · Docker Compose |
| AI 联动 | MCP 协议 · REST API |

## 开源

本项目已开源在 GitHub：[hanasite/StarryNight](https://github.com/hanasite/StarryNight)

---

*用 ❤️ 制作 by Kakun*
