#!/usr/bin/env node
// Push Markdown content to Memos API via nginx
// Usage: echo "content" | node push_memo.js <type>
//        node push_memo.js <type> "content string"

const API = process.env.MEMOS_API || "http://YOUR_NAS_IP:3000/api/v1/memos";

const type = process.argv[2] || "ticker";
let content = process.argv[3] || "";

// Read from stdin if no argument
if (!content) {
  const chunks = [];
  const { stdin } = process;
  stdin.setEncoding("utf8");
  stdin.on("data", (d) => chunks.push(d));
  stdin.on("end", () => {
    doPush(chunks.join("").trim());
  });
  // stdin might already be ended
  if (stdin.isTTY) {
    console.error("Usage: echo 'content' | node push_memo.js <type>");
    process.exit(1);
  }
} else {
  doPush(content);
}

async function doPush(content) {
  // Map type to tag
  const tagMap = {
    ticker: "#ticker",
    blog: "#blog",
    todo: "#todo",
    gallery: "#gallery",
    milestone: "#milestone",
  };
  const tag = tagMap[type];
  if (!tag) {
    console.error(`Unknown type: ${type} (use: ${Object.keys(tagMap).join("|")})`);
    process.exit(1);
  }

  // Auto-append tag if not present
  if (!content.includes(tag)) {
    content = content + " " + tag;
  }

  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "memos_key=YOUR_COOKIE_KEY",
      },
      body: JSON.stringify({ content }),
    });

    if (resp.ok) {
      const data = await resp.json();
      console.log(`OK: Pushed ${tag}`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      const text = await resp.text();
      console.error(`ERROR: HTTP ${resp.status}`);
      console.error(text);
      process.exit(1);
    }
  } catch (e) {
    console.error("ERROR:", e.message);
    process.exit(1);
  }
}
