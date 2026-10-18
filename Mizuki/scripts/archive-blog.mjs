#!/usr/bin/env node
/**
 * 把 Memos 中超过指定天数的 #blog 文章归档为静态 Astro 文章。
 *
 * 用法:
 *   node scripts/archive-blog.mjs                  # 归档 30 天前的文章
 *   node scripts/archive-blog.mjs --before 2026-09-18
 *   node scripts/archive-blog.mjs --dry-run        # 只预览，不写文件
 *
 * 说明:
 * - 通过 GET /api/v1/memos 公开读接口拉取，无需 token。
 * - 生成的文件写入 src/content/posts/，每篇带 `<!-- memos-id: ... -->` 标记，
 *   重复运行会跳过已归档的文章。导出的是个人内容，已被 .gitignore 忽略，
 *   只留在本地构建，不进入公开仓库。
 * - 运行后自动更新 src/pages/blog.astro 的 data-since，动态 /blog 页只显示
 *   截止时间之后的文章（与静态归档无缝衔接）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIZUKI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = path.join(MIZUKI_DIR, "src", "content", "posts");
const BLOG_ASTRO = path.join(MIZUKI_DIR, "src", "pages", "blog.astro");

const DRY_RUN = process.argv.includes("--dry-run");

function getArg(name) {
	const i = process.argv.indexOf(name);
	return i > -1 ? process.argv[i + 1] : undefined;
}

const API = (getArg("--api") || process.env.MEMOS_API || "http://192.168.101.133:3000").replace(/\/+$/, "");
const TZ = "Asia/Shanghai";

function localDate(d) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(d);
}

const defaultBefore = localDate(new Date(Date.now() - 30 * 86400000));
const beforeDate = getArg("--before") || process.env.ARCHIVE_BEFORE || defaultBefore;
if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeDate)) {
	console.error(`无效的截止日期: ${beforeDate}（应为 YYYY-MM-DD）`);
	process.exit(1);
}
const cutoff = new Date(`${beforeDate}T00:00:00+08:00`);
if (Number.isNaN(cutoff.getTime())) {
	console.error(`无效的截止日期: ${beforeDate}`);
	process.exit(1);
}
const since = `${beforeDate}T00:00:00+08:00`;

function cleanInline(text) {
	return text
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[*~`]+/g, "")
		.replace(/(^|\s)_+|_+(?=\s|$)/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
}

function removeMemoTags(text, tags) {
	const patterns = tags.map((tag) => {
		const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return new RegExp(`(^|[\\s(（])#${esc}(?=[\\s)）.。，,！!？?、]|$)`, "g");
	});
	let inFence = false;
	return text
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => {
			if (/^\s*(```|~~~)/.test(line)) {
				inFence = !inFence;
				return line;
			}
			if (inFence) return line;
			let s = line;
			for (const re of patterns) s = s.replace(re, "$1");
			// 只清理行尾孤立的 #（标签移除后的残留），不能碰行首的 Markdown 标题
			return s.replace(/(^|\s)#(?=\s*$)/g, "$1");
		})
		.join("\n");
}

function findTitle(memo, text) {
	const lines = text.split("\n");
	const pt = cleanInline((memo.property && memo.property.title) || "");
	let inFence = false;
	let heading = null;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const m = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*$/);
		if (m) {
			heading = { index: i, text: cleanInline(m[1].replace(/\s*#+\s*$/, "")) };
			break;
		}
	}

	if (pt) {
		// property.title 有值时，找与之对应的标题行/首行，正文里去掉重复标题
		if (heading && heading.text === pt) return { title: pt, removeIndex: heading.index };
		for (let i = 0; i < lines.length; i++) {
			if (!lines[i].trim()) continue;
			if (cleanInline(lines[i]) === pt) return { title: pt, removeIndex: i };
			break;
		}
		return { title: pt, removeIndex: -1 };
	}

	if (heading) return { title: heading.text || `归档 ${localDate(new Date(memo.createTime))}`, removeIndex: heading.index };

	for (let i = 0; i < lines.length; i++) {
		if (!lines[i].trim()) continue;
		const rest = lines.slice(i + 1).some((l) => l.trim());
		const title = cleanInline(lines[i]) || `归档 ${localDate(new Date(memo.createTime))}`;
		return { title, removeIndex: rest ? i : -1 };
	}
	return { title: `归档 ${localDate(new Date(memo.createTime))}`, removeIndex: -1 };
}

function slugify(title) {
	const slug = title
		.toLowerCase()
		.normalize("NFKC")
		.replace(/[^\p{Letter}\p{Number}]+/gu, "-")
		.replace(/^-+|-+$/g, "");
	return Array.from(slug).slice(0, 60).join("");
}

function rewriteUrls(text) {
	return text
		.replace(/https?:\/\/(?:192\.168\.101\.(?:133|31)|10\.1\.10\.226):3000\/blog-images\//g, "/blog-images/")
		.replace(/https?:\/\/(?:192\.168\.101\.(?:133|31)|10\.1\.10\.226):3000\/file\//g, "/file/");
}

function listMarkdownFiles(dir) {
	const out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...listMarkdownFiles(full));
		else if (/\.mdx?$/.test(entry.name)) out.push(full);
	}
	return out;
}

function convert(memo) {
	const id = memo.name.split("/")[1];
	const createTime = new Date(memo.createTime);
	const published = localDate(createTime);
	const tags = (memo.tags || []).filter((t) => t !== "blog");

	let body = removeMemoTags(memo.content || "", memo.tags || []);
	const { title, removeIndex } = findTitle(memo, body);
	if (removeIndex > -1) {
		const lines = body.split("\n");
		lines.splice(removeIndex, 1);
		body = lines.join("\n");
	}

	for (const a of memo.attachments || []) {
		if ((a.type || "").startsWith("image/") && a.filename) {
			body += `\n\n![](/file/${a.name}/${encodeURIComponent(a.filename)})`;
		}
	}

	body = rewriteUrls(body).replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
	body += `\n\n<!-- memos-id: ${id} -->`;

	const frontmatter = `${[
		"---",
		`title: ${JSON.stringify(title)}`,
		`published: ${published}`,
		`tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]`,
		`category: ${JSON.stringify("归档")}`,
		"draft: false",
		"---",
	].join("\n")}\n\n`;

	return { id, title, published, filename: `${published}-${slugify(title) || `memo-${id.slice(0, 8)}`}.md`, content: `${frontmatter}${body}\n` };
}

async function main() {
	const headers = {};
	if (process.env.MEMOS_COOKIE) headers.Cookie = process.env.MEMOS_COOKIE;

	console.log(`API: ${API}`);
	console.log(`截止: ${since}（此时间之前的 #blog 文章归档为静态）`);
	const res = await fetch(`${API}/api/v1/memos?pageSize=1000`, { headers });
	if (!res.ok) throw new Error(`拉取 memos 失败: HTTP ${res.status}`);
	const data = await res.json();

	const memos = (data.memos || []).filter(
		(m) => (m.tags || []).includes("blog") && new Date(m.createTime) < cutoff,
	);
	console.log(`待归档: ${memos.length} 篇`);

	const existingIds = new Set();
	const usedNames = new Set(fs.readdirSync(POSTS_DIR).filter((f) => /\.mdx?$/.test(f)));
	for (const file of listMarkdownFiles(POSTS_DIR)) {
		const match = fs.readFileSync(file, "utf8").match(/<!-- memos-id: ([^\s]+) -->/);
		if (match) existingIds.add(match[1]);
	}

	let written = 0;
	let skipped = 0;
	for (const memo of memos.sort((a, b) => a.createTime.localeCompare(b.createTime))) {
		const post = convert(memo);
		if (existingIds.has(post.id)) {
			skipped++;
			continue;
		}
		let filename = post.filename;
		if (usedNames.has(filename)) filename = filename.replace(/\.md$/, `-${post.id.slice(0, 6)}.md`);
		usedNames.add(filename);
		const full = path.join(POSTS_DIR, filename);
		console.log(`${DRY_RUN ? "[dry] " : ""}${post.published}  ${filename}  <- ${post.title}`);
		if (!DRY_RUN) fs.writeFileSync(full, post.content, "utf8");
		written++;
	}

	if (!DRY_RUN) {
		const src = fs.readFileSync(BLOG_ASTRO, "utf8");
		const updated = src.includes('data-since="')
			? src.replace(/data-since="[^"]*"/, `data-since="${since}"`)
			: src.replace('id="memo-list"', `id="memo-list" data-since="${since}"`);
		if (updated !== src) fs.writeFileSync(BLOG_ASTRO, updated, "utf8");
	}

	console.log(`完成: 新归档 ${written} 篇，跳过已归档 ${skipped} 篇`);
	if (!DRY_RUN) {
		console.log(`已更新 blog.astro: data-since="${since}"`);
		console.log("下一步: pnpm exec astro build，然后部署 dist 到 NAS www");
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
