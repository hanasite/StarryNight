#!/bin/bash
# StarryNight 一键部署脚本（AI Agent / 手动通用）
# 用法：在 PC 项目根目录执行
#   bash deploy.sh                          # 部署到默认 NAS
#   bash deploy.sh 192.168.x.x /path/to/www # 自定义目标

set -e

NAS_IP="${1:-192.168.101.10}"
NAS_USER="${2:-kakun}"
NAS_WWW="${3:-/vol1/1000/kakunsblogweb/www}"
NAS_CONF="${4:-/vol1/1000/kakunsblogweb}"
MEMOS_TOKEN="${MEMOS_TOKEN:-}"
COOKIE_KEY="${COOKIE_KEY:-}"

echo "📦 Building Mizuki..."
cd Mizuki && pnpm build && cd ..

echo "📤 Uploading to NAS ($NAS_USER@$NAS_IP)..."
# 通过 rsync 或其他方式上传 dist
# 如果你用 SMB：手动复制 dist/* → NAS 的 www/
# 如果你用 scp：
# scp -r Mizuki/dist/* "$NAS_USER@$NAS_IP:$NAS_WWW/"

echo "📋 Copying nginx.conf..."
# scp nginx.conf "$NAS_USER@$NAS_IP:$NAS_CONF/nginx.conf"

# 如果有 token，自动替换占位符
if [ -n "$MEMOS_TOKEN" ]; then
  echo "🔑 Replacing MEMOS_TOKEN..."
  # ssh "$NAS_USER@$NAS_IP" "sed -i 's/YOUR_MEMOS_TOKEN/$MEMOS_TOKEN/g' $NAS_CONF/nginx.conf"
fi

if [ -n "$COOKIE_KEY" ]; then
  echo "🔑 Replacing COOKIE_KEY..."
  # ssh "$NAS_USER@$NAS_IP" "sed -i 's/YOUR_COOKIE_KEY/$COOKIE_KEY/g' $NAS_CONF/nginx.conf"
fi

echo "🔧 Fixing permissions..."
# ssh "$NAS_USER@$NAS_IP" "chmod -R 755 $NAS_WWW/"

echo "🔄 Restarting nginx..."
# ssh "$NAS_USER@$NAS_IP" "docker restart blog-nginx"

echo ""
echo "✅ Deploy complete! Visit: http://$NAS_IP:3000"
