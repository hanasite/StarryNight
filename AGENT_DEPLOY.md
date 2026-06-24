# 🤖 AI Agent 一键部署 StarryNight

> 复制全文发给你的 AI Agent（Claude Code / Cursor / 任意），让他帮你部署。

## 前置条件

- PC 上有 Node.js 18+、pnpm、Git
- NAS 运行 Docker，已创建目录：
  ```bash
  mkdir -p /vol1/1000/kakunsblogweb/{www,scripts,banner-pool,logs}
  ```
- Memos PAT Token（在 Memos WebUI 设置里生成）
- 你自定义的 Cookie Key（任意字符串，用于登录）

## 步骤

### 1. 克隆仓库

```bash
# 国内加速
git clone https://gh-proxy.com/https://github.com/hanasite/StarryNight.git
# 或直连
git clone https://github.com/hanasite/StarryNight.git
cd StarryNight
```

### 2. 安装依赖 & 构建

```bash
cd Mizuki
pnpm install
pnpm build
cd ..
```

### 3. 替换敏感信息

```bash
# 替换为你的 Memos PAT Token
sed -i 's/YOUR_MEMOS_TOKEN/你的真实token/g' nginx.conf
# 替换为你的 Cookie Key
sed -i 's/YOUR_COOKIE_KEY/你的自定义key/g' nginx.conf
```

### 4. 上传到 NAS

```bash
# 根据你的环境选择一种方式：

# 方式 A：SMB 共享（Windows）
# 文件管理器打开 \\你的NAS\kakunsblogweb\www\
# 把 Mizuki/dist/* 全部拖进去

# 方式 B：scp（Linux/Mac）
scp -r Mizuki/dist/* kakun@你的NAS_IP:/vol1/1000/kakunsblogweb/www/
scp nginx.conf docker-compose.yml kakun@你的NAS_IP:/vol1/1000/kakunsblogweb/

# 方式 C：rsync
rsync -avz Mizuki/dist/ kakun@你的NAS_IP:/vol1/1000/kakunsblogweb/www/
```

### 5. NAS 上启动

```bash
ssh kakun@你的NAS_IP
cd /vol1/1000/kakunsblogweb
chmod -R 755 www/
docker compose up -d
```

### 6. 设置每日随机轮播（可选）

```bash
# NAS 上执行
mkdir -p /vol1/1000/kakunsblogweb/banner-pool
# 把你的图片放进 banner-pool/
chmod +x /vol1/1000/kakunsblogweb/scripts/daily-banner.sh
bash /vol1/1000/kakunsblogweb/scripts/daily-banner.sh  # 手动跑一次
# 添加 cron：每天凌晨 3:00 换图
echo '0 3 * * * /bin/bash /vol1/1000/kakunsblogweb/scripts/daily-banner.sh >> /vol1/1000/kakunsblogweb/logs/banner.log 2>&1' | crontab -
```

### 7. 验证

浏览器打开 `http://你的NAS_IP:3000`：
- 首页能看到 Banner 轮播
- `/ticker/` `/blog/` `/todo/` `/gallery/` `/guestbook/` 正常显示
- 访问 `/login/` 输入 Cookie Key 登录后可编辑
- AI Agent 可通过 REST API / MCP 推送内容

## 完成 ✅

你现在拥有了一个完整的二次元自建站！
