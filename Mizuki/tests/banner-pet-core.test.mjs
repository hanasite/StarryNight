import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PET_PROFILES } from "../src/scripts/banner-pet-profiles.js";
import {
	PET_CENTER_X,
	PET_ROWS,
	RUN_FRAME_CENTERS,
	bookmarkX,
	clamp,
	clampX,
	directionForMove,
	easeOutCubic,
	frameCenterOffset,
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

	it("centers the bookmark on the pet", () => {
		assert.equal(bookmarkX(100, 100, 34, 1000), 133);
		assert.equal(bookmarkX(980, 100, 34, 1000), 958);
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

	it("compensates the run cycle drift", () => {
		assert.equal(frameCenterOffset(1, 0), 6.5);
		assert.equal(frameCenterOffset(1, 7), -6.5);
		assert.equal(frameCenterOffset(2, 0), -6.5);
		assert.equal(frameCenterOffset(2, 7), 6.5);
		assert.equal(frameCenterOffset(0, 0), 0);
		assert.equal(frameCenterOffset(7, 3), 0);
	});

	it("keeps every run frame on the same visual axis", () => {
		for (const row of [1, 2]) {
			RUN_FRAME_CENTERS[row].forEach((center, frame) => {
				assert.equal(center + frameCenterOffset(row, frame), PET_CENTER_X);
			});
		}
	});

	it("supports per-pet ground offsets and run compensation", () => {
		assert.equal(groundOffsetForRow(0, PET_PROFILES.clawd), 42);
		assert.equal(groundOffsetForRow(0, PET_PROFILES.deepseek), 7);
		assert.equal(frameCenterOffset(1, 0, PET_PROFILES.clawd), 6.5);
		assert.equal(frameCenterOffset(1, 0, PET_PROFILES.deepseek), 0);
		assert.equal(frameCenterOffset(1, 7, PET_PROFILES.deepseek), 0);
	});

	it("has entry lines for both pets", () => {
		assert.ok(PET_PROFILES.clawd.entryLines.length > 0);
		assert.ok(PET_PROFILES.deepseek.entryLines.length > 0);
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
