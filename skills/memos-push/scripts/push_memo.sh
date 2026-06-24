#!/bin/bash
# Push Markdown content to Memos API via nginx
# Usage: echo "content" | bash push_memo.sh <type>
#        bash push_memo.sh <type> "content string"

API="${MEMOS_API:-http://YOUR_NAS_IP:3000/api/v1/memos}"
TYPE="${1:-ticker}"
CONTENT="${2:-$(cat)}"

# Map type to tag
case "$TYPE" in
  ticker)    TAG="#ticker" ;;
  blog)      TAG="#blog" ;;
  todo)      TAG="#todo" ;;
  gallery)   TAG="#gallery" ;;
  milestone) TAG="#milestone" ;;
  *)         echo "Unknown type: $TYPE (use: ticker|blog|todo|gallery|milestone)"; exit 1 ;;
esac

# Auto-append tag if not already present
if ! echo "$CONTENT" | grep -qF "$TAG"; then
  CONTENT="$CONTENT $TAG"
fi

# JSON escape: backslash, double-quote, newline, tab, carriage return
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  echo "$s"
}

BODY="{\"content\":\"$(json_escape "$CONTENT")\"}"

# Push to Memos (nginx requires cookie for write operations)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -b "memos_key=YOUR_COOKIE_KEY" \
  -H "Content-Type: application/json" \
  -d "$BODY" 2>&1)

HTTP_CODE=$(echo "$RESP" | tail -1)
RESP_BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "OK: Pushed $TAG"
  echo "$RESP_BODY"
else
  echo "ERROR: HTTP $HTTP_CODE"
  echo "$RESP_BODY"
  exit 1
fi
