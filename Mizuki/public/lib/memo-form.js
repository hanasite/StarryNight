/**
 * Memo 创建/编辑/删除 — 弹出表单 + API 调用
 */
(function (global) {
	"use strict";

	const API_CREATE = "/api/v1/memos";
	const API_PREFIX = "/api/v1/";

	function getToken() {
		const el = document.getElementById("memo-list");
		return el ? el.dataset.token || "" : "";
	}

	async function createMemo(content, extra) {
		const token = getToken();
		if (!token) { alert("Token not set"); return null; }
		const body = { content: content, visibility: "PUBLIC" };
		if (extra) Object.assign(body, extra);
		const res = await fetch(API_CREATE, {
			method: "POST",
			headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
			body: JSON.stringify(body),
		});
		return res.ok ? res.json() : null;
	}

	async function deleteMemo(memoId) {
		const token = getToken();
		if (!token) { alert("Token not set"); return false; }
		if (!confirm("确定删除？")) return false;
		const res = await fetch(API_PREFIX + memoId, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
		return res.ok;
	}

	async function editMemo(memoId, oldContent, pageTag, onSuccess) {
		const token = getToken();
		if (!token) { alert("Token not set"); return; }
		openForm({
			title: "编辑",
			placeholder: "...",
			submitLabel: "保存",
			content: oldContent,
			showImage: true,
			onSubmit: async function (content) {
				// 自动追加标签（如果缺失）
				if (pageTag && content.indexOf("#" + pageTag) === -1) {
					content += "\n#" + pageTag;
				}
				const res = await fetch(API_PREFIX + memoId, {
					method: "PATCH",
					headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
					body: JSON.stringify({ content: content }),
				});
				if (res.ok && onSuccess) onSuccess();
				return res.ok;
			},
		});
	}

	// ─── Modal ─────────────────────────────────────────────────

	function openForm(opts) {
		const overlay = document.createElement("div");
		overlay.className = "fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4";
		overlay.id = "memo-form-overlay";
		overlay.onclick = function (e) { if (e.target === overlay) closeForm(); };

		const box = document.createElement("div");
		box.className = "bg-[var(--card-bg)] rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-black/10 dark:border-white/10";
		box.onclick = function (e) { e.stopPropagation(); };

		const titleEl = document.createElement("h3");
		titleEl.className = "text-lg font-bold text-black/90 dark:text-white/90 mb-4";
		titleEl.textContent = opts.title || "New Memo";

		// ─── MD 工具栏 ──────────────────────────────────────
		const toolbar = document.createElement("div");
		toolbar.className = "flex flex-wrap gap-1 mb-3";
		const btns = [
				["H2", "## "],
				["H3", "### "],
				["Todo", "- [ ] "],
				["B", "**", "**"],
				["Code", "`", "`"],
				["Quote", "> "],
				["Del", "~~", "~~"],
				["---", "\n----------\n", ""],
				["Link", "[", "](url)"],
				["Img", "![", "](url)"],
		];
		btns.forEach(function (b) {
			var btn = document.createElement("button");
			btn.type = "button";
			btn.textContent = b[0];
			btn.title = b[0];
			btn.className = "px-2 py-0.5 text-xs rounded-md bg-black/5 dark:bg-white/10 hover:bg-[var(--primary)] hover:text-white text-black/60 dark:text-white/60 transition-colors";
			btn.onclick = function (e) { e.preventDefault(); insertMD(b[1], b[2] || ""); };
			toolbar.appendChild(btn);
		});

		function insertMD(prefix, suffix) {
			var start = textarea.selectionStart;
			var end = textarea.selectionEnd;
			var sel = textarea.value.substring(start, end);
			var txt = prefix + sel + suffix;
			textarea.value = textarea.value.substring(0, start) + txt + textarea.value.substring(end);
			textarea.focus();
			var pos = start + prefix.length + sel.length + (suffix ? 0 : 0);
			if (!sel && suffix) { pos = start + prefix.length; textarea.setSelectionRange(pos, pos + (suffix === "**" ? 0 : 0)); }
			textarea.selectionStart = textarea.selectionEnd = prefix.length + start + sel.length;
		}

		const textarea = document.createElement("textarea");
		textarea.className = "w-full h-40 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black/90 dark:text-white/90 resize-none mb-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";
		textarea.placeholder = opts.placeholder || "Write...";
		if (opts.content) textarea.value = opts.content;

		// 图片上传（base64 → JSON body）
		let fileInput;
		if (opts.showImage) {
			fileInput = document.createElement("input");
			fileInput.type = "file"; fileInput.accept = "image/*"; fileInput.multiple = true;
			fileInput.className = "w-full text-sm text-black/60 dark:text-white/60 mb-3 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-[var(--primary)] file:text-white file:cursor-pointer";
			fileInput.onchange = async function () {
				const files = Array.from(fileInput.files);
				if (!files.length) return;
				fileInput.disabled = true;
				const token = getToken();
				for (const file of files) {
					try {
						const base64 = await new Promise(function (resolve, reject) {
							const reader = new FileReader();
							reader.onload = function (e) { resolve(e.target.result.split(",")[1]); };
							reader.onerror = reject;
							reader.readAsDataURL(file);
						});
						const res = await fetch("/api/v1/attachments", {
							method: "POST",
							headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
							body: JSON.stringify({ filename: file.name, content: base64, type: file.type }),
						});
						if (res.ok) {
							const data = await res.json();
							const mdImg = "\n![](" + "/file/" + data.name + "/" + encodeURIComponent(data.filename) + ")";
							// 插入到光标位置
							const start = textarea.selectionStart;
							const end = textarea.selectionEnd;
							textarea.value = textarea.value.substring(0, start) + mdImg + textarea.value.substring(end);
							textarea.selectionStart = textarea.selectionEnd = start + mdImg.length;
						}
					} catch (e) {}
				}
				fileInput.disabled = false;
				fileInput.value = "";
			};
		}

		let templateSelect;
		if (opts.templates && opts.templates.length) {
			templateSelect = document.createElement("select");
			templateSelect.className = "w-full p-2 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black/70 text-sm mb-3";
			templateSelect.innerHTML = '<option value="">-- 选择模板 --</option>';
			opts.templates.forEach(function (t, i) {
				var o = document.createElement("option"); o.value = i; o.textContent = t.name; templateSelect.appendChild(o);
			});
			templateSelect.onchange = function () { var i = parseInt(this.value); if (i >= 0 && opts.templates[i]) textarea.value = opts.templates[i].content; };
		}

		const btnRow = document.createElement("div");
		btnRow.className = "flex gap-2 justify-end";

		const cancelBtn = document.createElement("button");
		cancelBtn.className = "px-4 py-2 rounded-lg text-sm text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5";
		cancelBtn.textContent = "取消"; cancelBtn.onclick = closeForm;

		const submitBtn = document.createElement("button");
		submitBtn.className = "px-4 py-2 rounded-lg text-sm text-white bg-[var(--primary)] hover:opacity-90 font-medium";
		submitBtn.textContent = opts.submitLabel || "发布";
		submitBtn.onclick = async function () {
			const content = textarea.value.trim();
			if (!content) return;
			submitBtn.disabled = true;
			submitBtn.textContent = "处理中...";
			if (opts.onSubmit) {
				const ok = await opts.onSubmit(content);
				if (ok) closeForm();
				else { submitBtn.disabled = false; submitBtn.textContent = opts.submitLabel || "保存"; }
			} else {
				var finalContent = content;
				if (opts.autoTag) finalContent += " #" + opts.autoTag;
				const result = await createMemo(finalContent, opts.extra);
				if (result) {
					closeForm();
					if (opts.onSuccess) opts.onSuccess(result);
					var list = document.getElementById("memo-list");
					if (list && list.__memosRefresh) list.__memosRefresh();
				} else {
					submitBtn.disabled = false;
					submitBtn.textContent = opts.submitLabel || "发布";
				}
			}
		};

		btnRow.appendChild(cancelBtn); btnRow.appendChild(submitBtn);
		box.appendChild(titleEl); box.appendChild(toolbar); box.appendChild(textarea);
		if (fileInput) box.appendChild(fileInput);
		if (templateSelect) box.appendChild(templateSelect);
		box.appendChild(btnRow);
		overlay.appendChild(box);
		document.body.appendChild(overlay);
	}

	function closeForm() { var o = document.getElementById("memo-form-overlay"); if (o) o.remove(); }

	// 检查是否有编辑权限
	function hasPermission() {
		return document.cookie.indexOf("memos_key=") !== -1;
	}

	function addFAB(opts) {
		if (!hasPermission()) return; // 无 cookie 不显示创建按钮
		var fab = document.createElement("button");
		fab.className = "fixed bottom-6 right-6 z-[99] w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center text-2xl font-bold";
		fab.textContent = "+"; fab.title = opts.title || "Create";
		fab.onclick = function () { openForm(opts); };
		document.body.appendChild(fab);
	}

	global.memoForm = { createMemo, deleteMemo, editMemo, openForm, closeForm, addFAB };
})(typeof window !== "undefined" ? window : globalThis);
