/**
 * Pure helpers for the banner pet controller.
 * DOM-free so it can be unit tested with node:test.
 */

export const PET_FRAME_W = 192;
export const PET_FRAME_H = 208;
export const PET_CENTER_X = PET_FRAME_W / 2;

// The run rows drift ~13px across the cycle, then snap back to the first frame.
// This per-frame offset keeps the body centered so the loop does not read as
// a backward step while the root translates.
export const RUN_FRAME_CENTERS = {
	1: [89.5, 90.5, 92, 92.5, 94.5, 96.5, 99.5, 102.5],
	2: [102.5, 101.5, 100, 99.5, 97.5, 95.5, 92.5, 89.5],
};

export function frameCenterOffset(row, frame, profile = null) {
	const centers = profile
		? profile.runCenters
			? profile.runCenters[row]
			: null
		: RUN_FRAME_CENTERS[row];
	if (!centers || !centers.length) {
		return 0;
	}
	return PET_CENTER_X - centers[frame % centers.length];
}

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
	{
		row: "jump",
		lines: ["跳一下！", "嘿嘿", "别戳啦～"],
	},
	{
		row: "work",
		lines: ["敲代码中，勿扰", "正在生成博文…", "Claude Code 启动！"],
	},
	{
		row: "review",
		lines: ["让我看看…", "检查一下排版", "嗯，不错。"],
	},
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

// Center a small bookmark on the pet's visible center, inside the content width.
export function bookmarkX(petX, petWidth, bookmarkWidth, layerWidth, margin = 8) {
	return clampX(
		petX + petWidth / 2 - bookmarkWidth / 2,
		layerWidth,
		bookmarkWidth,
		margin,
	);
}

export function groundOffsetForRow(row, profile = null) {
	const offsets = profile?.groundOffsets ?? ROW_GROUND_OFFSET;
	return offsets[row] ?? 0;
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
