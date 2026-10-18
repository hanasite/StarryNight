# Banner Pet (Clawd) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在横幅图片与正文的分界线上加入一只可自动走动、水平拖动、点击互动、侧边隐藏的 Clawd 宠物。

**Architecture:** 纯前端实现。Codex 8×9 图集由 CSS `background-position` 逐帧播放，原生 JS 状态机负责走动/拖动/反应/隐藏；Astro 组件挂在 `MainGridLayout` 的相对容器中，`bottom:100%` 自动贴合横幅与正文的分界线。无第三方运行时。

**Tech Stack:** Astro 6 / 原生 JS (ESM) / CSS / Node `node:test`。

## Global Constraints

- 不引入新 npm 依赖。
- 个人博文内容不进公开仓库；本功能只新增主题代码与公开宠物素材。
- 所有新增源码默认 ASCII 注释；已有中文注释的文件按原风格。
- 宠物只在 `body.enable-banner:not(.fullscreen-banner)` 时显示；全屏/无横幅模式自动隐藏。
- 尊重 `prefers-reduced-motion`：停止自动走动与滑动过渡。
- 构建命令使用 `pnpm exec astro build`（跳过会联网的 `update-anime`）。

---

## File Structure

- `Mizuki/public/assets/pets/clawd/spritesheet.webp` — Codex 图集（1536×1872）。
- `Mizuki/public/assets/pets/clawd/pet.json` — petdex 元数据。
- `Mizuki/public/assets/pets/clawd/README.md` — 素材来源与图集说明。
- `Mizuki/src/scripts/banner-pet-core.js` — 纯函数：帧数、地面偏移、夹紧、随机选择。
- `Mizuki/src/scripts/banner-pet.js` — DOM 控制器与状态机。
- `Mizuki/src/components/misc/BannerPet.astro` — 标记、样式、脚本引用。
- `Mizuki/src/layouts/MainGridLayout.astro` — 插入 `<BannerPet />`。
- `Mizuki/tests/banner-pet-core.test.mjs` — 纯函数测试。

---

### Task 1: 纯函数核心 + 测试

**Files:**
- Create: `Mizuki/src/scripts/banner-pet-core.js`
- Test: `Mizuki/tests/banner-pet-core.test.mjs`

**Interfaces:**
- Produces:
  - `PET_FRAME_W = 192`, `PET_FRAME_H = 208`
  - `PET_ROWS`：`{ [name]: { row, frames, duration, loop } }`
  - `ROW_GROUND_OFFSET`：`{ [row]: number }`
  - `REACTIONS`：`[{ row, lines }]`
  - `clamp(value, min, max)`
  - `clampX(x, layerWidth, petWidth, margin = 8)`
  - `groundOffsetForRow(row)`
  - `frameCountForRow(row)`
  - `pickIndex(length, random, exclude = -1)`
  - `directionForMove(fromX, toX)`
  - `easeOutCubic(t)`

- [ ] **Step 1: 写失败的测试**

```js
// Mizuki/tests/banner-pet-core.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	PET_ROWS,
	clamp,
	clampX,
	directionForMove,
	easeOutCubic,
	frameCountForRow,
	groundOffsetForRow,
	pickIndex,
} from "../src/scripts/banner-pet-core.js";

describe("clamp / clampX", () => {
	it("clamps into the range", () => {
		assert.equal(clamp(5, 0, 10), 5);
		assert.equal(clamp(-1, 0, 10), 0);
		assert.equal(clamp(11, 0, 10), 10);
	});

	it("keeps the pet inside the content width with margin", () => {
		assert.equal(clampX(0, 1000, 100), 8);
		assert.equal(clampX(500, 1000, 100), 500);
		assert.equal(clampX(999, 1000, 100), 892);
	});

	it("centers when the content is narrower than the pet", () => {
		assert.equal(clampX(50, 80, 100), 0);
	});
});

describe("sprite row metadata", () => {
	it("knows the frame count of each used row", () => {
		assert.equal(frameCountForRow(0), 6);
		assert.equal(frameCountForRow(1), 8);
		assert.equal(frameCountForRow(3), 4);
		assert.equal(frameCountForRow(5), 8);
		assert.equal(frameCountForRow(8), 6);
		assert.equal(frameCountForRow(9), 0);
	});

	it("has a ground offset for every animation row", () => {
		for (const spec of Object.values(PET_ROWS)) {
			assert.equal(typeof groundOffsetForRow(spec.row), "number");
			assert.ok(groundOffsetForRow(spec.row) >= 0);
		}
		assert.equal(groundOffsetForRow(0), 42);
		assert.equal(groundOffsetForRow(1), 50);
		assert.equal(groundOffsetForRow(7), 9);
	});
});

describe("pickIndex", () => {
	it("never repeats the excluded index when there is a choice", () => {
		assert.equal(pickIndex(4, 0, 0), 1);
		assert.equal(pickIndex(4, 0.99, 3), 0);
	});

	it("returns -1 for an empty list", () => {
		assert.equal(pickIndex(0, 0.5), -1);
	});
});

describe("movement helpers", () => {
	it("picks the run row from the direction", () => {
		assert.equal(directionForMove(10, 20), "runRight");
		assert.equal(directionForMove(20, 10), "runLeft");
		assert.equal(directionForMove(10, 10), "runRight");
	});

	it("eases from 0 to 1", () => {
		assert.equal(easeOutCubic(0), 0);
		assert.equal(easeOutCubic(1), 1);
		assert.ok(easeOutCubic(0.5) > 0.5);
	});
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:

```bash
cd Mizuki
node --test tests/banner-pet-core.test.mjs
```

Expected: FAIL，报 `Cannot find module .../banner-pet-core.js`。

- [ ] **Step 3: 实现核心模块**

```js
// Mizuki/src/scripts/banner-pet-core.js
/**
 * Pure helpers for the banner pet controller.
 * DOM-free so it can be unit tested with node:test.
 */

export const PET_FRAME_W = 192;
export const PET_FRAME_H = 208;

export const PET_ROWS = {
	idle: { row: 0, frames: 6, duration: 1100, loop: true },
	runRight: { row: 1, frames: 8, duration: 900, loop: true },
	runLeft: { row: 2, frames: 8, duration: 900, loop: true },
	wave: { row: 3, frames: 4, duration: 700, loop: false },
	jump: { row: 4, frames: 5, duration: 650, loop: false },
	failed: { row: 5, frames: 8, duration: 900, loop: false },
	sleep: { row: 6, frames: 6, duration: 1500, loop: true },
	work: { row: 7, frames: 6, duration: 1200, loop: true },
	review: { row: 8, frames: 6, duration: 1000, loop: false },
};

// Unscaled pixels to shift a frame down so its visible feet sit on the boundary.
export const ROW_GROUND_OFFSET = {
	0: 42,
	1: 50,
	2: 50,
	3: 26,
	4: 9,
	5: 9,
	6: 53,
	7: 9,
	8: 9,
};

export const REACTIONS = [
	{ row: "wave", lines: ["呀哈喽！", "今天也要加油鸭", "写博客中…"] },
	{ row: "jump", lines: ["跳一下！", "嘿嘿", "别戳啦～"] },
	{ row: "work", lines: ["敲代码中，勿扰", "正在生成博文…", "Claude Code 启动！"] },
	{ row: "review", lines: ["让我看看…", "检查一下排版", "嗯，不错。"] },
];

export function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

export function clampX(x, layerWidth, petWidth, margin = 8) {
	const min = margin;
	const max = layerWidth - petWidth - margin;
	if (max <= min) {
		return Math.max(0, (layerWidth - petWidth) / 2);
	}
	return clamp(x, min, max);
}

export function groundOffsetForRow(row) {
	return ROW_GROUND_OFFSET[row] ?? 0;
}

const frameCounts = new Map(
	Object.values(PET_ROWS).map((spec) => [spec.row, spec.frames]),
);

export function frameCountForRow(row) {
	return frameCounts.get(row) ?? 0;
}

export function pickIndex(length, random, exclude = -1) {
	if (length <= 0) {
		return -1;
	}
	if (length === 1) {
		return 0;
	}
	let index = Math.floor(random * length) % length;
	if (index === exclude) {
		index = (index + 1) % length;
	}
	return index;
}

export function directionForMove(fromX, toX) {
	return toX >= fromX ? "runRight" : "runLeft";
}

export function easeOutCubic(t) {
	const k = clamp(t, 0, 1);
	return 1 - (1 - k) ** 3;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:

```bash
cd Mizuki
node --test tests/banner-pet-core.test.mjs
```

Expected: PASS，全部 8 个测试通过。

- [ ] **Step 5: 提交**

```bash
cd ..
git add Mizuki/src/scripts/banner-pet-core.js Mizuki/tests/banner-pet-core.test.mjs
git commit -m "feat(pet): add banner pet core helpers and tests

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 素材与 Astro 组件外壳

**Files:**
- Create: `Mizuki/public/assets/pets/clawd/spritesheet.webp`
- Create: `Mizuki/public/assets/pets/clawd/pet.json`
- Create: `Mizuki/public/assets/pets/clawd/README.md`
- Create: `Mizuki/src/components/misc/BannerPet.astro`

**Interfaces:**
- Consumes: 无。
- Produces: DOM 节点 `#clawd-pet`、`#clawd-pet-root`、`#clawd-pet-scale`、`#clawd-pet-sprite`、`#clawd-pet-bubble`、`#clawd-pet-hide`、`#clawd-pet-handle`、`#clawd-pet-handle-sprite`；CSS 变量 `--clawd-scale`、`--clawd-ground`。

- [ ] **Step 1: 复制素材**

```bash
mkdir -p Mizuki/public/assets/pets/clawd
cp /c/Users/kakun/AppData/Local/Temp/clawd_pet/spritesheet.webp Mizuki/public/assets/pets/clawd/spritesheet.webp
cp /c/Users/kakun/AppData/Local/Temp/clawd_pet/pet.json Mizuki/public/assets/pets/clawd/pet.json
```

- [ ] **Step 2: 写素材说明**

```md
# Clawd pet

Codex-format pixel pet used by the banner.

- Source: https://petdex.dev/pets/clawd-4
- Author: fecet
- Package: https://assets.petdex.dev/pets/clawd-68cf9f39524c/zip.zip
- Atlas: 1536×1872, 8 columns × 9 rows, 192×208 per cell
- Rows: idle, run-right, run-left, wave, jump, error, sleep, work, review

The spritesheet is used as-is; no modification.
```

- [ ] **Step 3: 创建组件**

```astro
---
// Banner pet (Clawd). Visible only in banner wallpaper mode.
// The controller lives in src/scripts/banner-pet.js.
---
<div
	id="clawd-pet"
	class="clawd-pet-layer"
	data-sprite="/assets/pets/clawd/spritesheet.webp"
>
	<div id="clawd-pet-root" class="clawd-pet-root">
		<button
			id="clawd-pet-hide"
			class="clawd-pet-hide"
			type="button"
			aria-label="隐藏 Clawd"
			title="隐藏 Clawd"
		>
			<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M9 6l6 6-6 6"></path>
			</svg>
		</button>
		<div id="clawd-pet-scale" class="clawd-pet-scale">
			<div
				id="clawd-pet-sprite"
				class="clawd-pet-sprite"
				role="button"
				tabindex="0"
				aria-label="和 Clawd 互动"
			></div>
		</div>
		<div id="clawd-pet-bubble" class="clawd-pet-bubble" role="status" aria-live="polite"></div>
	</div>
	<button
		id="clawd-pet-handle"
		class="clawd-pet-handle"
		type="button"
		aria-label="显示 Clawd"
		title="显示 Clawd"
	>
		<span id="clawd-pet-handle-sprite" class="clawd-pet-handle-sprite" aria-hidden="true"></span>
	</button>
</div>

<script is:inline>
	try {
		if (localStorage.getItem("clawdPetHidden") === "1") {
			document.documentElement.classList.add("clawd-pet-hidden-early");
		}
	} catch (e) {}
</script>
<script>
	import "../../scripts/banner-pet.js";
</script>

<style>
	.clawd-pet-layer {
		--clawd-scale: 0.6;
		position: absolute;
		left: 0;
		right: 0;
		bottom: 100%;
		height: 0;
		z-index: 40;
		pointer-events: none;
		display: none;
	}

	body.enable-banner:not(.fullscreen-banner) .clawd-pet-layer {
		display: block;
	}

	@media (max-width: 1279px) {
		body:has(#banner-wrapper.mobile-hide-banner) .clawd-pet-layer {
			display: none;
		}
	}

	.clawd-pet-root {
		position: absolute;
		left: 0;
		bottom: 0;
		width: calc(192px * var(--clawd-scale));
		height: calc(208px * var(--clawd-scale));
		opacity: 1;
		will-change: transform, opacity;
	}

	.clawd-pet-scale {
		position: absolute;
		left: 0;
		bottom: 0;
		width: 192px;
		height: 208px;
		transform: scale(var(--clawd-scale));
		transform-origin: bottom left;
	}

	.clawd-pet-sprite {
		position: absolute;
		inset: 0;
		background-image: url("/assets/pets/clawd/spritesheet.webp");
		background-repeat: no-repeat;
		background-size: 1536px 1872px;
		image-rendering: pixelated;
		transform: translateY(var(--clawd-ground, 0px));
		cursor: grab;
		pointer-events: auto;
		touch-action: pan-y;
		user-select: none;
		-webkit-user-select: none;
	}

	.clawd-pet-sprite.is-dragging {
		cursor: grabbing;
	}

	.clawd-pet-bubble {
		position: absolute;
		left: 50%;
		bottom: calc(100% + 6px);
		transform: translate(-50%, 4px);
		max-width: 180px;
		padding: 6px 10px;
		border-radius: 10px;
		background: var(--card-bg);
		color: var(--deep-text);
		border: 1px solid var(--line-color);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
		font-size: 12px;
		line-height: 1.4;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.18s ease,
			transform 0.18s ease;
		z-index: 3;
	}

	.clawd-pet-bubble.is-visible {
		opacity: 1;
		transform: translate(-50%, 0);
	}

	.clawd-pet-bubble::after {
		content: "";
		position: absolute;
		left: 50%;
		top: 100%;
		width: 8px;
		height: 8px;
		background: inherit;
		border-right: 1px solid var(--line-color);
		border-bottom: 1px solid var(--line-color);
		transform: translateX(-50%) rotate(45deg) translateY(-4px);
	}

	:root.dark .clawd-pet-bubble {
		color: oklch(0.92 0.01 var(--hue));
	}

	.clawd-pet-hide {
		position: absolute;
		right: -10px;
		top: 18%;
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: var(--card-bg);
		color: var(--btn-content);
		border: 1px solid var(--line-color);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		opacity: 0;
		pointer-events: none;
		transform: scale(0.9);
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
		z-index: 4;
		cursor: pointer;
	}

	.clawd-pet-root:hover .clawd-pet-hide,
	.clawd-pet-hide:focus-visible {
		opacity: 0.95;
		pointer-events: auto;
		transform: scale(1);
	}

	@media (hover: none) {
		.clawd-pet-hide {
			opacity: 0.7;
			pointer-events: auto;
			transform: scale(1);
		}
	}

	.clawd-pet-handle {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 46px;
		height: 72px;
		padding: 0;
		border-radius: 14px 0 0 14px;
		border: 1px solid var(--line-color);
		border-right: none;
		background: var(--card-bg-transparent);
		backdrop-filter: blur(6px);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
		overflow: hidden;
		opacity: 0;
		pointer-events: none;
		cursor: pointer;
		transition:
			opacity 0.2s ease,
			width 0.2s ease;
		z-index: 5;
	}

	.clawd-pet-layer.is-hidden .clawd-pet-handle {
		opacity: 1;
		pointer-events: auto;
	}

	.clawd-pet-handle:hover {
		width: 56px;
	}

	.clawd-pet-handle-sprite {
		position: absolute;
		left: -4px;
		bottom: -10px;
		width: 192px;
		height: 208px;
		transform: scale(0.45);
		transform-origin: bottom left;
		background-image: url("/assets/pets/clawd/spritesheet.webp");
		background-repeat: no-repeat;
		background-size: 1536px 1872px;
		background-position: 0 0;
		image-rendering: pixelated;
	}

	.clawd-pet-root.is-user-hidden {
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
	}

	html.clawd-pet-hidden-early .clawd-pet-root {
		opacity: 0 !important;
		visibility: hidden !important;
		pointer-events: none !important;
	}

	html.clawd-pet-hidden-early .clawd-pet-handle {
		opacity: 1 !important;
		pointer-events: auto !important;
	}

	@media (max-width: 767px) {
		.clawd-pet-layer {
			--clawd-scale: 0.45;
		}

		.clawd-pet-handle {
			width: 40px;
			height: 64px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.clawd-pet-bubble,
		.clawd-pet-hide,
		.clawd-pet-handle {
			transition: none;
		}
	}
</style>
```

- [ ] **Step 4: 在布局中插入组件**

在 `Mizuki/src/layouts/MainGridLayout.astro` 顶部加入 import：

```astro
import BannerPet from "@components/misc/BannerPet.astro";
```

在 `MainGridLayout.astro` 的以下位置（`<div class="relative max-w-(--page-width) mx-auto pointer-events-auto">` 之后、`<div id="main-grid"` 之前）插入：

```astro
			<BannerPet />
```

- [ ] **Step 5: 构建验证**

```bash
cd Mizuki
pnpm exec astro build
```

Expected: `Complete!`，构建成功；`dist/index.html` 中包含 `id="clawd-pet"`。

- [ ] **Step 6: 提交**

```bash
cd ..
git add Mizuki/public/assets/pets/clawd Mizuki/src/components/misc/BannerPet.astro Mizuki/src/layouts/MainGridLayout.astro
git commit -m "feat(pet): add Clawd banner pet markup and styles

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 控制器与交互

**Files:**
- Create: `Mizuki/src/scripts/banner-pet.js`

**Interfaces:**
- Consumes: Task 1 的 `banner-pet-core.js`；Task 2 的 DOM 节点。
- Produces: 完整交互；`localStorage` 键 `clawdPetHidden`、`clawdPetX`。

- [ ] **Step 1: 实现控制器**

```js
// Mizuki/src/scripts/banner-pet.js
import {
	PET_FRAME_H,
	PET_FRAME_W,
	PET_ROWS,
	REACTIONS,
	clamp,
	clampX,
	directionForMove,
	easeOutCubic,
	groundOffsetForRow,
	pickIndex,
} from "./banner-pet-core.js";

const HIDDEN_KEY = "clawdPetHidden";
const X_KEY = "clawdPetX";
const BUBBLE_MS = 2200;
const REACT_COOLDOWN_MS = 400;
const DRAG_THRESHOLD = 4;

function safeGet(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function safeSet(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// private mode / storage disabled
	}
}

function initBannerPet() {
	const layer = document.getElementById("clawd-pet");
	const root = document.getElementById("clawd-pet-root");
	const sprite = document.getElementById("clawd-pet-sprite");
	const bubble = document.getElementById("clawd-pet-bubble");
	const hideBtn = document.getElementById("clawd-pet-hide");
	const handle = document.getElementById("clawd-pet-handle");
	if (!layer || !root || !sprite || !bubble || !hideBtn || !handle) {
		return;
	}
	if (layer.dataset.ready === "1") {
		return;
	}
	layer.dataset.ready = "1";

	document.documentElement.classList.remove("clawd-pet-hidden-early");

	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const state = {
		x: 0,
		mode: "idle",
		animName: "idle",
		frame: 0,
		frameStarted: performance.now(),
		onAnimEnd: null,
		behaviorAt: Number.POSITIVE_INFINITY,
		targetX: 0,
		busyUntil: 0,
		userHidden: false,
		savedX: 0,
		tween: null,
		lastReaction: -1,
		lastReactAt: 0,
		bubbleTimer: 0,
		dragging: false,
		dragged: false,
		dragStartX: 0,
		dragStartPetX: 0,
		pointerId: null,
	};

	const now = () => performance.now();
	const petWidth = () => root.offsetWidth || PET_FRAME_W * 0.6;
	const layerWidth = () => layer.clientWidth;

	function setX(x) {
		state.x = x;
		root.style.transform = `translate3d(${x}px, 0, 0)`;
	}

	function applyFrame() {
		const spec = PET_ROWS[state.animName];
		if (!spec) {
			return;
		}
		sprite.style.backgroundPosition = `${-state.frame * PET_FRAME_W}px ${-spec.row * PET_FRAME_H}px`;
	}

	function setAnim(name, onEnd = null) {
		const spec = PET_ROWS[name];
		if (!spec) {
			return;
		}
		state.animName = name;
		state.frame = 0;
		state.frameStarted = now();
		state.onAnimEnd = onEnd;
		sprite.style.setProperty("--clawd-ground", `${groundOffsetForRow(spec.row)}px`);
		applyFrame();
	}

	function updateAnim(time) {
		const spec = PET_ROWS[state.animName];
		if (!spec) {
			return;
		}
		const frameMs = spec.duration / spec.frames;
		const index = Math.floor((time - state.frameStarted) / frameMs);
		if (index < spec.frames) {
			if (state.frame !== index) {
				state.frame = index;
				applyFrame();
			}
			return;
		}
		if (spec.loop) {
			const looped = index % spec.frames;
			if (state.frame !== looped) {
				state.frame = looped;
				applyFrame();
			}
			return;
		}
		const callback = state.onAnimEnd;
		state.onAnimEnd = null;
		if (callback) {
			callback(time);
		}
	}

	function idleAt(time) {
		state.mode = "idle";
		state.busyUntil = 0;
		state.behaviorAt = reduceMotion.matches
			? Number.POSITIVE_INFINITY
			: time + 3000 + Math.random() * 4000;
		setAnim("idle");
	}

	function showBubble(text) {
		bubble.textContent = text;
		bubble.classList.add("is-visible");
		clearTimeout(state.bubbleTimer);
		state.bubbleTimer = window.setTimeout(() => {
			bubble.classList.remove("is-visible");
		}, BUBBLE_MS);
	}

	function startWalk() {
		const width = layerWidth();
		const widthPet = petWidth();
		const min = 8;
		const max = Math.max(min, width - widthPet - 8);
		let target = min + Math.random() * Math.max(0, max - min);
		if (Math.abs(target - state.x) < 40) {
			const offset = (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 160);
			target = clampX(state.x + offset, width, widthPet);
		}
		state.targetX = clampX(target, width, widthPet);
		state.mode = "walk";
		state.behaviorAt = Number.POSITIVE_INFINITY;
		setAnim(directionForMove(state.x, state.targetX));
	}

	function startBusy(name, durationMs) {
		state.mode = "busy";
		state.busyUntil = now() + durationMs;
		state.behaviorAt = Number.POSITIVE_INFINITY;
		setAnim(name);
	}

	function react(time) {
		if (state.userHidden || state.dragging) {
			return;
		}
		if (time - state.lastReactAt < REACT_COOLDOWN_MS) {
			return;
		}
		state.lastReactAt = time;
		const index = pickIndex(REACTIONS.length, Math.random(), state.lastReaction);
		if (index < 0) {
			return;
		}
		state.lastReaction = index;
		const reaction = REACTIONS[index];
		state.mode = "react";
		state.behaviorAt = Number.POSITIVE_INFINITY;
		setAnim(reaction.row, (endTime) => idleAt(endTime));
		showBubble(reaction.lines[Math.floor(Math.random() * reaction.lines.length)]);
	}

	function saveX() {
		const span = Math.max(1, layerWidth() - petWidth());
		safeSet(X_KEY, String(state.x / span));
	}

	function loadX() {
		const raw = Number.parseFloat(safeGet(X_KEY) ?? "");
		const fraction = Number.isFinite(raw) ? clamp(raw, 0, 1) : 0.5;
		const span = Math.max(0, layerWidth() - petWidth());
		return clampX(fraction * span, layerWidth(), petWidth());
	}

	function startTween(time, fromX, toX, fromOpacity, toOpacity, duration, onDone) {
		if (duration <= 0 || reduceMotion.matches) {
			setX(toX);
			root.style.opacity = String(toOpacity);
			if (onDone) {
				onDone();
			}
			return;
		}
		state.tween = {
			fromX,
			toX,
			fromOpacity,
			toOpacity,
			start: time,
			duration,
			onDone,
		};
	}

	function updateTween(time) {
		const tween = state.tween;
		if (!tween) {
			return;
		}
		const k = Math.min(1, (time - tween.start) / tween.duration);
		const eased = easeOutCubic(k);
		setX(tween.fromX + (tween.toX - tween.fromX) * eased);
		root.style.opacity = String(
			tween.fromOpacity + (tween.toOpacity - tween.fromOpacity) * eased,
		);
		if (k >= 1) {
			state.tween = null;
			if (tween.onDone) {
				tween.onDone();
			}
		}
	}

	function hidePet(time) {
		if (state.userHidden || state.dragging) {
			return;
		}
		state.userHidden = true;
		state.mode = "hidden";
		state.savedX = state.x;
		state.behaviorAt = Number.POSITIVE_INFINITY;
		safeSet(HIDDEN_KEY, "1");
		const targetX = layerWidth() + petWidth();
		startTween(time, state.x, targetX, 1, 0, reduceMotion.matches ? 0 : 320, () => {
			root.classList.add("is-user-hidden");
			layer.classList.add("is-hidden");
		});
	}

	function showPet(time) {
		if (!state.userHidden) {
			return;
		}
		state.userHidden = false;
		safeSet(HIDDEN_KEY, "0");
		root.classList.remove("is-user-hidden");
		layer.classList.remove("is-hidden");
		const fromX = layerWidth() + petWidth();
		const toX = clampX(state.savedX, layerWidth(), petWidth());
		setX(fromX);
		root.style.opacity = "0";
		startTween(time, fromX, toX, 0, 1, reduceMotion.matches ? 0 : 320, () => {
			idleAt(time);
		});
	}

	function isBannerVisible() {
		const body = document.body;
		if (
			!body.classList.contains("enable-banner") ||
			body.classList.contains("fullscreen-banner")
		) {
			return false;
		}
		if (window.innerWidth < 1280) {
			const banner = document.getElementById("banner-wrapper");
			if (banner && banner.classList.contains("mobile-hide-banner")) {
				return false;
			}
		}
		return true;
	}

	function updateBehavior(time) {
		if (
			state.mode !== "idle" ||
			state.userHidden ||
			state.dragging ||
			reduceMotion.matches
		) {
			return;
		}
		if (time < state.behaviorAt) {
			return;
		}
		if (!isBannerVisible()) {
			state.behaviorAt = time + 2000;
			return;
		}
		const roll = Math.random();
		if (roll < 0.6) {
			startWalk();
		} else if (roll < 0.8) {
			startBusy("work", 4000 + Math.random() * 2000);
		} else {
			startBusy("sleep", 5000 + Math.random() * 3000);
		}
	}

	function updateWalk(time, dt) {
		if (state.mode !== "walk") {
			return;
		}
		const speed = window.innerWidth < 768 ? 32 : 45;
		const dx = state.targetX - state.x;
		if (Math.abs(dx) <= speed * dt) {
			setX(state.targetX);
			saveX();
			idleAt(time);
			return;
		}
		setX(state.x + Math.sign(dx) * speed * dt);
	}

	function remeasure() {
		if (!layerWidth()) {
			return;
		}
		setX(clampX(state.x, layerWidth(), petWidth()));
	}

	sprite.addEventListener("pointerdown", (event) => {
		if (event.pointerType === "mouse" && event.button !== 0) {
			return;
		}
		if (state.userHidden) {
			return;
		}
		state.dragging = true;
		state.dragged = false;
		state.mode = "drag";
		state.behaviorAt = Number.POSITIVE_INFINITY;
		state.dragStartX = event.clientX;
		state.dragStartPetX = state.x;
		state.pointerId = event.pointerId;
		sprite.setPointerCapture(event.pointerId);
		sprite.classList.add("is-dragging");
		setAnim("idle");
	});

	sprite.addEventListener("pointermove", (event) => {
		if (!state.dragging || event.pointerId !== state.pointerId) {
			return;
		}
		const dx = event.clientX - state.dragStartX;
		if (Math.abs(dx) > DRAG_THRESHOLD) {
			state.dragged = true;
		}
		if (!state.dragged) {
			return;
		}
		setX(clampX(state.dragStartPetX + dx, layerWidth(), petWidth()));
		const direction = directionForMove(state.dragStartPetX, state.x);
		if (state.animName !== direction) {
			setAnim(direction);
		}
	});

	function endDrag(event) {
		if (!state.dragging || (event && event.pointerId !== state.pointerId)) {
			return;
		}
		state.dragging = false;
		sprite.classList.remove("is-dragging");
		try {
			sprite.releasePointerCapture(state.pointerId);
		} catch {
			// pointer capture may already be gone
		}
		state.pointerId = null;
		if (state.dragged) {
			saveX();
			idleAt(now());
		} else {
			idleAt(now());
			react(now());
		}
	}

	sprite.addEventListener("pointerup", endDrag);
	sprite.addEventListener("pointercancel", endDrag);
	sprite.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			react(now());
		}
	});
	hideBtn.addEventListener("click", (event) => {
		event.stopPropagation();
		hidePet(now());
	});
	handle.addEventListener("click", (event) => {
		event.stopPropagation();
		showPet(now());
	});

	window.addEventListener("resize", remeasure);
	document.addEventListener("swup:contentReplaced", () => {
		requestAnimationFrame(remeasure);
	});
	document.addEventListener("swup:page:view", () => {
		requestAnimationFrame(remeasure);
	});
	// Wallpaper mode switches only change body classes; remeasure after them.
	new MutationObserver(remeasure).observe(document.body, {
		attributes: true,
		attributeFilter: ["class"],
	});
	if ("ResizeObserver" in window) {
		new ResizeObserver(remeasure).observe(layer);
	}

	const hidden = safeGet(HIDDEN_KEY) === "1";
	const startX = loadX();
	state.savedX = startX;
	setX(startX);
	if (hidden) {
		state.userHidden = true;
		state.mode = "hidden";
		setX(layerWidth() + petWidth());
		root.style.opacity = "0";
		root.classList.add("is-user-hidden");
		layer.classList.add("is-hidden");
		setAnim("idle");
	} else {
		root.style.opacity = "1";
		idleAt(now());
	}

	let last = now();
	function loop(time) {
		requestAnimationFrame(loop);
		const dt = Math.min(0.05, (time - last) / 1000);
		last = time;
		if (document.hidden) {
			return;
		}
		if (state.tween) {
			updateTween(time);
		} else if (!state.userHidden) {
			if (state.mode === "walk") {
				updateWalk(time, dt);
			}
			if (state.mode === "busy" && time >= state.busyUntil) {
				idleAt(time);
			}
			if (state.mode === "idle" && !state.dragging) {
				updateBehavior(time);
			}
		}
		if (!state.userHidden) {
			updateAnim(time);
		}
	}
	requestAnimationFrame(loop);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initBannerPet, { once: true });
} else {
	initBannerPet();
}
```

- [ ] **Step 2: 构建验证**

```bash
cd Mizuki
pnpm exec astro build
```

Expected: `Complete!`；`dist/_astro/` 中有包含 `clawdPetHidden` 的 JS chunk。

- [ ] **Step 3: 静态产物检查**

```bash
grep -c 'id="clawd-pet"' dist/index.html
curl -s -o /dev/null -w "%{http_code}\n" "http://192.168.101.133:3000/assets/pets/clawd/spritesheet.webp"
```

Expected: `dist/index.html` 中计数 ≥ 1；素材部署后返回 200。

- [ ] **Step 4: 提交**

```bash
cd ..
git add Mizuki/src/scripts/banner-pet.js
git commit -m "feat(pet): add Clawd banner pet controller

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 部署与验收

**Files:**
- No source changes.

- [ ] **Step 1: 备份并部署**

```bash
cd Mizuki
tar -czf /c/Users/kakun/AppData/Local/Temp/blogdist.tar.gz -C dist .
scp -q /c/Users/kakun/AppData/Local/Temp/blogdist.tar.gz kakun@192.168.101.133:/tmp/blogdist.tar.gz
ssh -o BatchMode=yes kakun@192.168.101.133 'set -e; cd /vol1/1000/kakunsblogweb; tar -czf www-backup-$(date +%Y%m%d-%H%M%S)-pet.tar.gz www; cd www; tar -xzf /tmp/blogdist.tar.gz; chmod -R u+rwX,go+rX .; rm -f /tmp/blogdist.tar.gz; echo DEPLOY_OK'
```

注意：这里是原地解包，不更换 `www` 目录 inode，因此不需要重启 `blog-nginx`。若改用 `mv www` 原子切换，必须 `docker restart blog-nginx`。

- [ ] **Step 2: 线上检查**

```bash
curl -s -m 10 "http://192.168.101.133:3000/" | grep -c 'id="clawd-pet"'
curl -s -m 10 -o /dev/null -w "%{http_code}\n" "http://192.168.101.133:3000/assets/pets/clawd/spritesheet.webp"
curl -s -m 10 -o /dev/null -w "%{http_code}\n" "http://192.168.101.133:3000/blog/"
```

Expected: 计数 ≥ 1；素材 200；页面 200。

- [ ] **Step 3: 浏览器手动验收**

在桌面浏览器逐项确认：

- [ ] Clawd 站在横幅图片与正文卡片的分界线上，脚不悬空/不埋进卡片。
- [ ] 静置几秒后会左右走动、偶尔敲电脑或睡觉。
- [ ] 水平拖动跟手，松手后不会误触点击；纵向滚动不受影响。
- [ ] 点击出现挥手/跳跃/敲电脑/检查动画和气泡台词，气泡 2 秒左右消失。
- [ ] 点隐藏按钮后滑出，右边缘留下半个头把手；点把手恢复；刷新后保持隐藏。
- [ ] 设置里切到全屏壁纸/无壁纸模式时宠物消失，切回横幅模式恢复。
- [ ] 点击站内链接（swup 翻页）后宠物不重复、不闪烁，位置保持。
- [ ] 手机宽度（≤767px）下缩放正常、可点可拖、不阻断滚动；手机内页横幅隐藏时宠物隐藏。
- [ ] 系统开启“减少动态效果”后不再自动走动。

- [ ] **Step 4: 收尾提交（如有手动微调）**

```bash
cd ..
git status --short
git add -A ':!Mizuki/src/content/posts/20??-*.md'
git commit -m "chore(pet): tune Clawd banner pet after visual QA

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

若验收无改动，跳过本步。
