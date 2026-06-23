#!/bin/bash
# 每日随机 Banner 脚本
# 从素材库随机选取 5-6 张图片作为当天的首页轮播
# 在 NAS crontab 中设置：0 3 * * * /bin/bash /vol1/1000/kakunsblogweb/scripts/daily-banner.sh >> /vol1/1000/kakunsblogweb/logs/banner.log 2>&1

POOL="/vol1/1000/kakunsblogweb/banner-pool"
OUTDIR="/vol1/1000/kakunsblogweb/www/banner/daily"
JSON="/vol1/1000/kakunsblogweb/www/banner/daily.json"
LOG="/vol1/1000/kakunsblogweb/logs"

mkdir -p "$OUTDIR" "$LOG"
rm -f "$OUTDIR"/*

# 随机 5 或 6 张
COUNT=$(( RANDOM % 2 + 5 ))

if [ ! -d "$POOL" ]; then
    echo "[$(date)] ERROR: 素材库目录不存在: $POOL"
    exit 1
fi

# 收集所有图片路径到数组
IMGS=()
while IFS= read -r f; do
    IMGS+=("$f")
done < <(find "$POOL" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" -o -iname "*.avif" \) 2>/dev/null)

TOTAL=${#IMGS[@]}
if [ "$TOTAL" -eq 0 ]; then
    echo "[$(date)] ERROR: 素材库中没有图片"
    exit 1
fi

# 取 min(count, total)
if [ "$COUNT" -gt "$TOTAL" ]; then
    COUNT=$TOTAL
fi

# Fisher-Yates 洗牌前 COUNT 个（仅取需要的数量）
SELECTED=()
for ((i = 0; i < TOTAL && i < 100; i++)); do
    R=$(( RANDOM % TOTAL ))
    TMP="${IMGS[$i]}"
    IMGS[$i]="${IMGS[$R]}"
    IMGS[$R]="$TMP"
done

# 构建 JSON（纯 shell，不依赖 jq）
JSON_ARR=""
for ((i = 0; i < COUNT; i++)); do
    FNAME=$(basename "${IMGS[$i]}")
    cp "${IMGS[$i]}" "$OUTDIR/$FNAME" 2>/dev/null
    if [ $i -gt 0 ]; then
        JSON_ARR="$JSON_ARR, "
    fi
    JSON_ARR="$JSON_ARR\"\/banner\/daily\/$FNAME\""
done

# 写入 JSON 文件
cat > "$JSON" << EOF
{"desktop": [$JSON_ARR], "mobile": [$JSON_ARR]}
EOF

echo "[$(date)] Banner updated: $COUNT / $TOTAL images"
