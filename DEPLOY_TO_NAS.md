# NAS Agent 部署指令

## 任务：将 PC 上的站部署到飞牛OS NAS

PC 路径：`D:\kakunsBlog\`
NAS 路径：`/vol1/1000/kakunsblogweb/`
NAS IP：`192.168.101.10`
目标 URL：`http://192.168.101.10:3000`

---

## 1. 在 NAS 上创建目录

```bash
mkdir -p /vol1/1000/kakunsblogweb/www
mkdir -p /vol1/1000/kakunsblogweb/memos-data
```

## 2. 从 PC 传输文件到 NAS

将以下 PC 端文件复制到 NAS 对应路径：

| PC 源 | NAS 目标 |
|-------|----------|
| `D:\kakunsBlog\Mizuki\dist\*` （所有内容） | `/vol1/1000/kakunsblogweb/www/` |
| `D:\kakunsBlog\nginx.conf` | `/vol1/1000/kakunsblogweb/nginx.conf` |
| `D:\kakunsBlog\docker-compose.yml` | `/vol1/1000/kakunsblogweb/docker-compose.yml` |

## 3. 修改 nginx.conf

编辑 `/vol1/1000/kakunsblogweb/nginx.conf`，将 `{MEMOS_TOKEN}` 替换为：
```
memos_pat_YOUR_TOKEN_HERE
```

## 4. 启动 Docker

```bash
cd /vol1/1000/kakunsblogweb
docker compose up -d
```

## 5. 验证

- 浏览器打开 http://192.168.101.10:3000 → 看到首页（横幅轮播）
- http://192.168.101.10:3000/ticker/ → ticker 列表
- http://192.168.101.10:3000/blog/ → 博文列表
- http://192.168.101.10:3000/todo/ → TODO 列表
- http://192.168.101.10:5230 → Memos Web UI

## 6. 如果 Memos 是第一次启动

访问 http://192.168.101.10:5230 创建管理员账户（admin / 你的密码），然后生成 PAT Token，更新 nginx.conf 中的 token 并重启：

```bash
cd /vol1/1000/kakunsblogweb
docker compose restart nginx
```

---

## 文件结构确认

部署完成后 NAS 上的结构：
```
/vol1/1000/kakunsblogweb/
├── docker-compose.yml
├── nginx.conf
├── memos-data/          ← Memos SQLite 数据库（自动生成）
└── www/                 ← Mizuki 静态站点
    ├── index.html
    ├── ticker/
    ├── blog/
    ├── todo/
    ├── gallery/
    ├── timeline/
    ├── lib/
    └── ...
```
