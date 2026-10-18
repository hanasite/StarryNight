/**
 * Memos API 客户端 — 渲染 + 删除 + TODO checkbox
 */
(function (global) {
	"use strict";

	const DEFAULT_API = "/api/v1/memos";    // POST list
	const API_PREFIX = "/api/v1/";           // DELETE/PATCH (memoId 含 memos/)

	// 长内容折叠样式（注入一次，全站生效）
	(function () {
		const style = document.createElement("style");
		style.textContent = [
			".memo-content{position:relative}",
			".memo-content img{max-width:100%;max-height:min(60vh,480px);width:auto;height:auto;display:block;margin:.75rem auto;border-radius:.5rem}",
			".memo-content.collapsed{max-height:24rem;overflow:hidden}",
			".memo-content.collapsed::after{content:'';position:absolute;left:0;right:0;bottom:0;height:4.5rem;pointer-events:none;background:linear-gradient(to top,var(--card-bg,#fff),transparent)}",
			".memo-expand-btn{display:block;margin:.6rem auto 0;padding:.25rem 1.25rem;font-size:.8rem;line-height:1.6;border-radius:9999px;border:1px solid var(--primary);color:var(--primary);background:transparent;cursor:pointer;transition:opacity .2s}",
			".memo-expand-btn:hover{opacity:.7}",
		].join("\n");
		document.head.appendChild(style);
	})();

	// 检查编辑权限
	function hasPerm() { return document.cookie.indexOf("memos_key=") !== -1; }

	/* 长内容折叠：内容超过 384px 默认收起，点按钮展开/收起
	 * 检测用固定阈值（未加 collapsed 类时 clientHeight == scrollHeight，不能用两者比较）
	 * 图片懒加载会低估高度——图片 load 后重查（见 init 的捕获监听） */
	var COLLAPSE_LIMIT = 384;  // 与 CSS .memo-content.collapsed 的 max-height 一致
	function setupCollapse(root) {
		root.querySelectorAll(".memo-content").forEach(function (el) {
			if (el.dataset.userExpanded) return;             // 用户手动展开过：不再自动折叠
			if (el.scrollHeight <= COLLAPSE_LIMIT) return;   // 内容不超阈值不折叠
			if (!el.dataset.btnSet) {                        // 首次折叠时创建按钮
				el.dataset.btnSet = "1";
				var btn = document.createElement("button");
				btn.type = "button";
				btn.className = "memo-expand-btn";
				btn.textContent = "展开全文";
				btn.setAttribute("aria-expanded", "false");
				btn.onclick = function (e) {
					e.stopPropagation();
					var expanded = !el.classList.contains("collapsed");
					el.classList.toggle("collapsed", expanded);
					if (!expanded) el.dataset.userExpanded = "1";
					btn.textContent = expanded ? "展开全文" : "收起";
					btn.setAttribute("aria-expanded", String(!expanded));
				};
				el.after(btn);
			}
			el.classList.add("collapsed");
		});
	}

	function renderMD(text) {
		var html;
		if (typeof marked !== "undefined" && marked.parse) {
			html = marked.parse(text);
		} else {
			html = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
		}
		// 修复图片 URL 中的空格和中文（浏览器不会自动编码）
		html = html.replace(/src="(\/file\/[^"]+)"/g, function (match, url) {
			return 'src="' + url.replace(/ /g, "%20").replace(/[^\x00-\x7F]/g, function (c) { return encodeURIComponent(c); }) + '"';
		});
		// 内容图片统一约束（prose 的 img 规则没有 max-width，原图会撑爆容器）+ 懒加载
		html = html.replace(/<img /g, '<img loading="lazy" class="max-w-full h-auto rounded-lg" ');
		return html;
	}

	function escapeHtml(text) {
		const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
		return String(text).replace(/[&<>"']/g, function (c) { return map[c]; });
	}

	function formatRelative(dateStr, labels) {
		const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
		if (diff < 1) return labels.justNow || "just now";
		if (diff < 60) return diff + " " + (labels.minutes || "min ago");
		if (diff < 1440) return Math.floor(diff / 60) + " " + (labels.hours || "h ago");
		return Math.floor(diff / 1440) + " " + (labels.days || "d ago");
	}

	function transformMemos(raw, baseUrl) {
		const memos = raw.memos || raw || [];
		return memos.filter(function (m) { return m.state === "NORMAL"; }).map(function (m) {
			var images = (m.attachments || []).filter(function (a) { return (a.type || "").startsWith("image/"); }).map(function (a) { return (baseUrl || "") + "/file/" + a.name + "/" + encodeURIComponent(a.filename); });
			
			return { id: m.name, content: m.content || "", date: m.createTime, tags: m.tags || [], images: images.length ? images : undefined, location: m.location ? m.location.placeholder : undefined, pinned: !!m.pinned, hasTaskList: !!(m.property && m.property.hasTaskList) };
		}).sort(function (a, b) {
			if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
			return new Date(b.date) - new Date(a.date);
		});
	}

	// 归档过滤：blog 页只显示 since（ISO 时间）之后的 memo，更早的已归档为静态文章
	function filterBySince(moments, since) {
		if (!since) return moments;
		var t = new Date(since).getTime();
		if (isNaN(t)) return moments;
		return moments.filter(function (m) { return new Date(m.date).getTime() >= t; });
	}

	function renderMomentCard(moment, labels) {
		const time = formatRelative(moment.date, labels);
		return (
			'<div class="moment-card group relative bg-transparent rounded-xl border border-black/10 dark:border-white/10 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1" data-tags="' + (moment.tags || []).join(",") + '" data-memo-id="' + escapeHtml(moment.id) + '" data-memo-content="' + escapeHtml(moment.content) + '">' +
			'<div class="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">' +
			'<button class="memo-edit-btn w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 hover:bg-[var(--primary)] hover:text-white text-black/40 dark:text-white/40 flex items-center justify-center text-xs" title="Edit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
			'<button class="memo-delete-btn w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 hover:bg-red-500 hover:text-white text-black/40 dark:text-white/40 flex items-center justify-center text-xs" title="Delete">&times;</button>' +
			"</div>" +
			'<div class="p-5"><div class="text-sm md:text-base text-black/90 dark:text-white/90 leading-relaxed mb-3 memo-content prose prose-sm dark:prose-invert max-w-none">' + renderMD(moment.content) + "</div>" +
			renderImages(moment.images) + renderTags(moment.tags) +
			'<hr class="border-t border-black/5 dark:border-white/5 my-3" />' +
			'<div class="flex items-center justify-between text-xs text-black/50 dark:text-white/50 flex-wrap gap-2">' +
			'<div class="flex items-center gap-1.5"><iconify-icon icon="material-symbols:schedule" class="text-xs w-3.5 h-3.5"></iconify-icon><time>' + time + "</time></div>" +
			(moment.location ? '<span class="flex items-center gap-1"><iconify-icon icon="material-symbols:location-on" class="text-xs w-3.5 h-3.5"></iconify-icon>' + escapeHtml(moment.location) + "</span>" : "") +
			"</div></div>" +
			'<div class="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"></div></div>'
		);
	}

	function renderImages(images) {
		if (!images || !images.length) return "";
		var cls = images.length === 1 ? "diary-images-single" : images.length === 2 ? "diary-images-double" : images.length === 3 ? "diary-images-triple" : "diary-images-grid";
		return '<div class="diary-images grid gap-2 mb-3 ' + cls + '">' + images.map(function (s) { return '<div class="relative rounded-lg overflow-hidden aspect-square"><img src="' + escapeHtml(s) + '" alt="" class="w-full h-full object-cover" loading="lazy" /></div>'; }).join("") + "</div>";
	}

	function renderTags(tags) {
		if (!tags || !tags.length) return "";
		return '<div class="flex flex-wrap gap-1.5 mb-3">' + tags.map(function (t) { return '<span class="btn-regular h-6 text-xs px-2 rounded-lg">' + escapeHtml(t) + "</span>"; }).join("") + "</div>";
	}

	function renderTodoCard(memo) {
		const content = memo.content || "";
		const done = (content.match(/\[x\]/g) || []).length;
		const total = (content.match(/\[[ x]\]/g) || []).length;
		const progress = total > 0 ? Math.round((done / total) * 100) : 0;
		return (
			'<div class="todo-card group relative bg-transparent rounded-xl border border-black/10 dark:border-white/10 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 p-5" data-memo-id="' + escapeHtml(memo.id) + '" data-memo-content="' + escapeHtml(content) + '">' +
			'<div class="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">' +
			'<button class="memo-edit-btn w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 hover:bg-[var(--primary)] hover:text-white text-black/40 dark:text-white/40 flex items-center justify-center text-xs" title="Edit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
			'<button class="memo-delete-btn w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 hover:bg-red-500 hover:text-white text-black/40 dark:text-white/40 flex items-center justify-center text-xs" title="Delete">&times;</button>' +
			"</div>" +
			'<div class="flex items-center gap-3 mb-3"><div class="flex-1 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden"><div class="todo-progress h-full bg-[var(--primary)] rounded-full transition-all duration-500" style="width:' + progress + '%"></div></div><span class="todo-count text-xs text-black/50 dark:text-white/50 whitespace-nowrap">' + done + "/" + total + "</span></div>" +
			'<div class="text-sm text-black/80 dark:text-white/80 leading-relaxed todo-content prose prose-sm dark:prose-invert max-w-none">' + renderMD(content) + "</div>" +
			'<div class="flex items-center justify-between mt-3 text-xs text-black/40 dark:text-white/40"><time>' + formatRelative(memo.date, {}) + "</time>" + renderTags(memo.tags) + "</div>" +
			'<div class="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"></div></div>'
		);
	}

	function enableTodoCheckboxes(container, apiToken) {
		if (!container) return;
		container.querySelectorAll(".todo-content input[type=checkbox], .memo-content input[type=checkbox]").forEach(function (cb) {
			if (!hasPerm()) return;
			cb.disabled = false;
			cb.style.pointerEvents = "auto";
			cb.style.cursor = "pointer";
			cb.addEventListener("change", function () {
				const card = cb.closest("[data-memo-id]");
				if (!card) return;
				const memoId = card.getAttribute("data-memo-id");
				const oldContent = card.getAttribute("data-memo-content");
				if (!memoId || !oldContent) return;
				const lines = oldContent.split("\n");
				const parentLi = cb.closest("li");
				if (!parentLi) return;
				const liText = parentLi.textContent.trim().substring(0, 30);
				for (var i = 0; i < lines.length; i++) {
					if (lines[i].indexOf(liText) !== -1) { lines[i] = cb.checked ? lines[i].replace("[ ]", "[x]") : lines[i].replace("[x]", "[ ]"); break; }
				}
				const newContent = lines.join("\n");
				card.setAttribute("data-memo-content", newContent);
				const done = (newContent.match(/\[x\]/g) || []).length;
				const total = (newContent.match(/\[[ x]\]/g) || []).length;
				const bar = card.querySelector(".todo-progress");
				const count = card.querySelector(".todo-count");
				if (bar) bar.style.width = (total > 0 ? Math.round((done / total) * 100) : 0) + "%";
				if (count) count.textContent = done + "/" + total;
				fetch(API_PREFIX + memoId, { method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (apiToken || "") }, body: JSON.stringify({ content: newContent }) }).catch(function () {});
			});
		});
	}

	function init(opts) {
		const container = document.getElementById(opts.container || "memo-list");
		if (!container) return;
		const apiUrl = container.dataset.memosApi || DEFAULT_API;
		const apiToken = container.dataset.token || "";
		const baseUrl = apiUrl.replace(/\/api\/.*$/, "");
		const filter = opts.filter || container.dataset.filter || "";
		const labels = { justNow: container.dataset.justNow || "just now", minutes: container.dataset.minutesAgo || "min ago", hours: container.dataset.hoursAgo || "h ago", days: container.dataset.daysAgo || "d ago" };
		const mode = opts.mode || "moment";
		const since = opts.since || container.dataset.since || "";

		function fetchAndRender() {
			var f = filter;
			var activeTag = container.getAttribute("data-active-tag");
			if (activeTag) f = f ? f + ' && tags.exists(t,t=="' + activeTag + '")' : 'tags.exists(t,t=="' + activeTag + '")';
			var url = apiUrl + (f ? ((apiUrl.indexOf("?") === -1 ? "?" : "&") + "filter=" + encodeURIComponent(f)) : "");
			if (url.indexOf("pageSize") === -1) url += (url.indexOf("?") === -1 ? "?" : "&") + "pageSize=50";
			fetch(url).then(function (res) { return res.ok ? res.json() : Promise.reject(); }).then(function (data) {
				var moments = filterBySince(transformMemos(data, baseUrl), since);
				if (!moments.length) return;
				container.innerHTML = moments.map(function (m) { return mode === "todo" ? renderTodoCard(m) : renderMomentCard(m, labels); }).join("");
				var countEl = container.parentElement.querySelector(".memo-count");
				if (countEl) countEl.textContent = String(moments.length);
				setupCollapse(container);   // 长内容折叠（blog 长文）
				enableTodoCheckboxes(container, apiToken);
				// 删除按钮
				if (!hasPerm()) { container.querySelectorAll(".memo-delete-btn, .memo-edit-btn").forEach(function (b) { b.style.display = "none"; }); }
				container.querySelectorAll(".memo-delete-btn").forEach(function (btn) {
					btn.onclick = function (e) { e.stopPropagation(); var card = btn.closest("[data-memo-id]"); var mid = card ? card.getAttribute("data-memo-id") : ""; if (mid && typeof memoForm !== "undefined") memoForm.deleteMemo(mid).then(function (ok) { if (ok) fetchAndRender(); }); };
				});
				// 从 filter 提取当前页面标签
				var pageTag = "";
				var m = filter.match(/t=="(\w+)"/);
				if (m) pageTag = m[1];
				if (mode === "todo") pageTag = "todo";

				container.querySelectorAll(".memo-edit-btn").forEach(function (btn) {
					btn.onclick = function (e) { e.stopPropagation(); var card = btn.closest("[data-memo-id]"); var mid = card ? card.getAttribute("data-memo-id") : ""; var content = card ? (card.getAttribute("data-memo-content") || "") : ""; if (mid && typeof memoForm !== "undefined") memoForm.editMemo(mid, content, pageTag, function () { fetchAndRender(); }); };
				});
			}).catch(function () {});
		}

		container.__memosRefresh = fetchAndRender;
		fetchAndRender();
		document.addEventListener("swup:contentReplaced", fetchAndRender);
		// 图片懒加载会低估内容高度——任意图片加载完成后重查折叠（img load 不冒泡，用捕获）
		container.addEventListener("load", function () { setupCollapse(container); }, true);
	}

	// ─── 标签云 ──────────────────────────────────────────────

	function renderTagCloud(containerId, apiUrl, filter) {
		var container = document.getElementById(containerId);
		if (!container) return;
		var url = (apiUrl || DEFAULT_API) + "?pageSize=200";
		if (filter) url += "&filter=" + encodeURIComponent(filter);
		fetch(url).then(function (res) { return res.ok ? res.json() : Promise.reject(); }).then(function (data) {
			var listEl = document.getElementById("memo-list");
			var moments = filterBySince(transformMemos(data, ""), listEl ? listEl.dataset.since : "");
			var counts = {};
			var exclude = ["ticker", "blog", "todo", "milestone"];
			moments.forEach(function (m) {
				(m.tags || []).forEach(function (t) {
					if (exclude.indexOf(t) === -1) counts[t] = (counts[t] || 0) + 1;
				});
			});
			var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 10);
			if (!sorted.length) return;
			container.innerHTML = '<div class="flex gap-2 flex-wrap">' + sorted.map(function (t) {
				return '<span class="tag-chip btn-regular h-6 text-xs px-2 rounded-lg cursor-pointer hover:bg-[var(--primary)] hover:text-white transition-colors" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + ' <span class="opacity-50">' + counts[t] + '</span></span>';
			}).join("") + '</div>';
			// 点击标签过滤列表
			container.querySelectorAll(".tag-chip").forEach(function (chip) {
				chip.onclick = function () {
					var tag = chip.getAttribute("data-tag");
					var list = document.getElementById("memo-list");
					if (!list) return;
					var current = list.getAttribute("data-active-tag");
					if (current === tag) {
						// 取消筛选
						list.removeAttribute("data-active-tag");
						chip.classList.remove("bg-[var(--primary)]", "text-white");
					} else {
						container.querySelectorAll(".tag-chip").forEach(function (c) { c.classList.remove("bg-[var(--primary)]", "text-white"); });
						chip.classList.add("bg-[var(--primary)]", "text-white");
						list.setAttribute("data-active-tag", tag);
					}
					if (list.__memosRefresh) list.__memosRefresh();
				};
			});
		}).catch(function () {});
	}

	global.memosClient = { init: init, transform: transformMemos, renderCard: renderMomentCard, renderTagCloud: renderTagCloud };
})(typeof window !== "undefined" ? window : globalThis);
