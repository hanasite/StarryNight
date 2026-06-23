// 简易开发服务器：Mizuki 静态文件 + Memos API 代理
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DIST = path.join(__dirname, "Mizuki", "dist");
const MEMOS = "http://localhost:5230";

const MIME = {
	".html": "text/html; charset=utf-8",
	".css": "text/css",
	".js": "application/javascript",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
};

function proxyToMemos(req, res) {
	const url = MEMOS + req.url;
	// 转发原始请求头（保留 Authorization）
	const headers = Object.assign({}, req.headers);
	delete headers.host; // node 会自动设置
	delete headers.connection;
	delete headers["accept-encoding"]; // 避免压缩问题

	if (req.method === "DELETE") {
		const opts = { method: "DELETE", headers: headers };
		const r = http.request(url, opts, (resp) => {
			res.writeHead(resp.statusCode, resp.headers);
			resp.pipe(res);
		});
		r.end();
	} else if (req.method === "POST" || req.method === "PATCH") {
		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			const opts = { method: req.method, headers: headers };
			const r = http.request(url, opts, (resp) => {
				res.writeHead(resp.statusCode, resp.headers);
				resp.pipe(res);
			});
			r.write(body);
			r.end();
		});
	} else {
		http.get(url, { headers: headers }, (resp) => {
			res.writeHead(resp.statusCode, resp.headers);
			resp.pipe(res);
		});
	}
}

const server = http.createServer((req, res) => {
	const url = new URL(req.url, "http://localhost");

	// API proxy to Memos
	if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/file/") || url.pathname.startsWith("/mcp")) {
		// 图片等静态文件需要认证 — 自动注入 token
		if (url.pathname.startsWith("/file/") && !req.headers.authorization) {
			req.headers.authorization = "Bearer YOUR_MEMOS_TOKEN";
		}
		return proxyToMemos(req, res);
	}

	// Static files — /lib/ 直接从 public/ 读取，修改立即生效
	let baseDir = url.pathname.startsWith("/lib/") ? path.join(__dirname, "Mizuki", "public") : DIST;
	let filePath = path.join(baseDir, url.pathname);
	if (url.pathname.endsWith("/")) filePath = path.join(filePath, "index.html");
	if (!path.extname(filePath)) filePath += "/index.html";

	const ext = path.extname(filePath);
	const mime = MIME[ext] || "application/octet-stream";

	fs.readFile(filePath, (err, data) => {
		if (err) {
			// SPA fallback: serve index.html for unknown routes
			fs.readFile(path.join(DIST, "404.html"), (e2, d2) => {
				res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
				res.end(d2 || "Not Found");
			});
			return;
		}
		res.writeHead(200, { "Content-Type": mime });
		res.end(data);
	});
});

server.listen(PORT, () => {
	console.log(`Dev server: http://localhost:${PORT}/`);
	console.log(`API proxy: /api/* -> ${MEMOS}`);
});
