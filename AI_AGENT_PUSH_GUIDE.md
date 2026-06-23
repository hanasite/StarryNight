# AI Agent 推送指南

像 `git push` 一样简单：写 Markdown → 推送到 Memos API → 站点立即可见。

---

## 1. 获取 Token（首次）

```bash
curl -X POST http://<NAS_IP>:5230/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"你的密码"}'
```

返回 `{ "accessToken": "eyJ..." }`，保存此 Token。

---

## 2. 推送内容

### Ticker（碎碎念）
```bash
curl -X POST http://<NAS_IP>:5230/api/v1/memos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"今天阳光真好 ☀️  #ticker","visibility":"PUBLIC"}'
```

### TODO 清单
```bash
curl -X POST http://<NAS_IP>:5230/api/v1/memos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"## 本周计划\n- [ ] 更新 NAS\n- [x] 备份数据库\n- [ ] 整理照片 #todo","visibility":"PUBLIC"}'
```

### 博客文章
```bash
curl -X POST http://<NAS_IP>:5230/api/v1/memos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"# 我的 NAS 搭建记录\n\n## 硬件选择\n- CPU: N100\n- 内存: 16GB\n- 系统: 飞牛OS\n\n## 踩坑记录\n...\n #blog","visibility":"PUBLIC"}'
```

### 历程/里程碑
```bash
curl -X POST http://<NAS_IP>:5230/api/v1/memos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"## 2026.06\n- 完成自建站搭建 🎉\n- 配置 AI Agent 自动推送\n #milestone","visibility":"PUBLIC","pinned":true}'
```

---

## 3. MCP 集成（推荐）

Memos 内置 MCP endpoint，Claude Code 等 Agent 可直接调用：

### Claude Code 配置（settings.json）
```json
{
  "mcpServers": {
    "memos": {
      "url": "http://192.168.x.x:5230/mcp"
    }
  }
}
```

配置后 Agent 可调用 tool：
- **CreateMemo** — 创建内容
- **ListMemos** — 搜索/读取已有内容
- **UpdateMemo** — 修改内容
- **DeleteMemo** — 删除内容

---

## 4. 标签速查

| 标签 | 出现在 |
|------|--------|
| `#ticker` | `/ticker/` 碎碎念页面 |
| `#blog` | `/blog/` 动态博文页面 |
| `#milestone` | `/timeline/` 历程时间线 |
| `- [ ] 任务` | `/todo/` 自动识别 checklist |

---

## 5. PC 本地测试

```bash
# 1. 启动 Memos
docker run -d --name memos -p 5230:5230 -v ~/.memos:/var/opt/memos neosmemo/memos:stable

# 2. 访问 http://localhost:5230 创建管理员账号

# 3. 生成 Token 后测试推送
curl -X POST http://localhost:5230/api/v1/memos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content":"测试推送 #ticker","visibility":"PUBLIC"}'

# 4. 在 Mizuki 项目目录启动开发服务器
cd D:\kakunsBlog\Mizuki
pnpm dev

# 5. 访问 http://localhost:4321/ticker/ 查看效果
```

---

## 6. 部署到 NAS

```bash
# PC 上构建
cd D:\kakunsBlog\Mizuki
pnpm build

# 复制到 NAS
scp -r dist/* <NAS_USER>@<NAS_IP>:/volume1/docker/blog/www/
scp docker-compose.yml nginx.conf <NAS_USER>@<NAS_IP>:/volume1/docker/blog/

# NAS 上
cd /volume1/docker/blog
docker compose up -d
```
