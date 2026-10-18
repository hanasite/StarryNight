import {
	PET_FRAME_H,
	PET_FRAME_W,
	PET_ROWS,
	bookmarkX,
	clamp,
	clampX,
	directionForMove,
	easeOutCubic,
	frameCenterOffset,
	groundOffsetForRow,
	pickIndex,
} from "./banner-pet-core.js";
import { PET_PROFILES } from "./banner-pet-profiles.js";

const BUBBLE_MS = 2200;
const REACT_COOLDOWN_MS = 400;
const DRAG_THRESHOLD = 4;
const petInstances =
	globalThis.__bannerPetInstances ?? (globalThis.__bannerPetInstances = []);

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

function initBannerPet(layer, profile) {
	if (layer.dataset.ready === "1") {
		return;
	}
	const root = layer.querySelector(".banner-pet-root");
	const sprite = layer.querySelector(".banner-pet-sprite");
	const bubble = layer.querySelector(".banner-pet-bubble");
	const hideBtn = layer.querySelector(".banner-pet-hide");
	const bookmark = layer.querySelector(".banner-pet-bookmark");
	if (!root || !sprite || !bubble || !hideBtn || !bookmark) {
		return;
	}
	layer.dataset.ready = "1";
	layer.classList.remove("is-early-hidden");

	const HIDDEN_KEY = `${profile.id}PetHidden`;
	const X_KEY = `${profile.id}PetX`;
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
		entryTimer: 0,
		dragging: false,
		dragged: false,
		dragStartX: 0,
		dragStartPetX: 0,
		pointerId: null,
		bookmarkDragging: false,
		bookmarkDragged: false,
		bookmarkStartX: 0,
		bookmarkStartSavedX: 0,
		bookmarkPointerId: null,
		suppressBookmarkClick: false,
	};

	const now = () => performance.now();
	const petWidth = () => root.offsetWidth || PET_FRAME_W * 0.6;
	const bookmarkWidth = () => bookmark.offsetWidth || 34;
	const layerWidth = () => layer.clientWidth;

	function setX(x, scale = 1) {
		state.x = x;
		root.style.transform = `translate3d(${x}px, 0, 0) scale(${scale})`;
	}

	function applyFrame() {
		const spec = PET_ROWS[state.animName];
		if (!spec) {
			return;
		}
		const offset = frameCenterOffset(spec.row, state.frame, profile);
		sprite.style.backgroundPosition = `${-state.frame * PET_FRAME_W + offset}px ${-spec.row * PET_FRAME_H}px`;
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
		sprite.style.setProperty(
			"--pet-ground",
			`${groundOffsetForRow(spec.row, profile)}px`,
		);
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

	function pickTarget() {
		const width = layerWidth();
		const widthPet = petWidth();
		const min = 8;
		const max = Math.max(min, width - widthPet - 8);
		const others = petInstances
			.filter((instance) => instance.layer !== layer)
			.map((instance) => instance.center());
		let target = min + Math.random() * Math.max(0, max - min);
		for (let attempt = 0; attempt < 5; attempt++) {
			const candidate = min + Math.random() * Math.max(0, max - min);
			const center = candidate + widthPet / 2;
			if (others.every((other) => Math.abs(other - center) > widthPet / 2 + 60)) {
				target = candidate;
				break;
			}
			target = candidate;
		}
		return clampX(target, width, widthPet);
	}

	function startWalk() {
		state.targetX = pickTarget();
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
		const reactions = profile.reactions;
		const index = pickIndex(reactions.length, Math.random(), state.lastReaction);
		if (index < 0) {
			return;
		}
		state.lastReaction = index;
		const reaction = reactions[index];
		state.mode = "react";
		state.behaviorAt = Number.POSITIVE_INFINITY;
		setAnim(reaction.row, (endTime) => idleAt(endTime));
		showBubble(reaction.lines[Math.floor(Math.random() * reaction.lines.length)]);
	}

	function saveX(x = state.x) {
		const span = Math.max(1, layerWidth() - petWidth());
		safeSet(X_KEY, String(x / span));
	}

	function loadX() {
		const raw = Number.parseFloat(safeGet(X_KEY) ?? "");
		const fraction = Number.isFinite(raw)
			? clamp(raw, 0, 1)
			: (profile.defaultX ?? 0.5);
		const span = Math.max(0, layerWidth() - petWidth());
		return clampX(fraction * span, layerWidth(), petWidth());
	}

	function startTween(
		time,
		fromX,
		toX,
		fromOpacity,
		toOpacity,
		duration,
		onDone,
		fromScale = 1,
		toScale = 1,
	) {
		if (duration <= 0 || reduceMotion.matches) {
			setX(toX, toScale);
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
			fromScale,
			toScale,
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
		const scale = tween.fromScale + (tween.toScale - tween.fromScale) * eased;
		setX(tween.fromX + (tween.toX - tween.fromX) * eased, scale);
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

	function placeBookmark() {
		const width = bookmarkWidth();
		const x = bookmarkX(state.savedX, petWidth(), width, layerWidth());
		bookmark.style.setProperty("--pet-bookmark-x", `${x}px`);
	}

	function hidePet(time) {
		if (state.userHidden || state.dragging) {
			return;
		}
		state.userHidden = true;
		state.mode = "hidden";
		state.savedX = state.x;
		state.behaviorAt = Number.POSITIVE_INFINITY;
		bubble.classList.remove("is-visible");
		clearTimeout(state.bubbleTimer);
		safeSet(HIDDEN_KEY, "1");
		startTween(
			time,
			state.x,
			state.x,
			1,
			0,
			reduceMotion.matches ? 0 : 280,
			() => {
				root.classList.add("is-user-hidden");
				placeBookmark();
				layer.classList.add("is-hidden");
			},
			1,
			0.2,
		);
	}

	function showPet(time) {
		if (!state.userHidden) {
			return;
		}
		state.userHidden = false;
		safeSet(HIDDEN_KEY, "0");
		root.classList.remove("is-user-hidden");
		layer.classList.remove("is-hidden");
		const toX = clampX(state.savedX, layerWidth(), petWidth());
		setX(toX, 0.2);
		root.style.opacity = "0";
		startTween(
			time,
			toX,
			toX,
			0,
			1,
			reduceMotion.matches ? 0 : 280,
			() => {
				idleAt(time);
			},
			0.2,
			1,
		);
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

	function isBannerMode() {
		const body = document.body;
		return (
			body.classList.contains("enable-banner") &&
			!body.classList.contains("fullscreen-banner")
		);
	}

	function enterFromModeSwitch() {
		clearTimeout(state.entryTimer);
		layer.classList.add("is-waiting");
		state.mode = "waiting";
		state.behaviorAt = Number.POSITIVE_INFINITY;
		state.tween = null;
		state.entryTimer = window.setTimeout(() => {
			state.entryTimer = 0;
			layer.classList.remove("is-waiting");
			if (!isBannerVisible()) {
				state.mode = "idle";
				return;
			}
			remeasure();
			if (state.userHidden) {
				placeBookmark();
				return;
			}
			layer.classList.remove("is-hidden");
			root.classList.remove("is-user-hidden");
			root.style.opacity = "1";
			setX(clampX(state.x, layerWidth(), petWidth()), 1);
			const lines = profile.entryLines || [];
			if (lines.length) {
				showBubble(lines[Math.floor(Math.random() * lines.length)]);
			}
			state.mode = "react";
			state.behaviorAt = Number.POSITIVE_INFINITY;
			setAnim("wave", (endTime) => idleAt(endTime));
		}, 1000);
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
		if (state.userHidden) {
			placeBookmark();
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

	bookmark.addEventListener("pointerdown", (event) => {
		if (event.pointerType === "mouse" && event.button !== 0) {
			return;
		}
		if (!state.userHidden) {
			return;
		}
		state.bookmarkDragging = true;
		state.bookmarkDragged = false;
		state.bookmarkStartX = event.clientX;
		state.bookmarkStartSavedX = state.savedX;
		state.bookmarkPointerId = event.pointerId;
		bookmark.setPointerCapture(event.pointerId);
		bookmark.classList.add("is-dragging");
	});

	bookmark.addEventListener("pointermove", (event) => {
		if (
			!state.bookmarkDragging ||
			event.pointerId !== state.bookmarkPointerId
		) {
			return;
		}
		const dx = event.clientX - state.bookmarkStartX;
		if (Math.abs(dx) > DRAG_THRESHOLD) {
			state.bookmarkDragged = true;
		}
		if (!state.bookmarkDragged) {
			return;
		}
		state.savedX = clampX(
			state.bookmarkStartSavedX + dx,
			layerWidth(),
			petWidth(),
		);
		placeBookmark();
	});

	function endBookmarkDrag(event) {
		if (
			!state.bookmarkDragging ||
			(event && event.pointerId !== state.bookmarkPointerId)
		) {
			return;
		}
		state.bookmarkDragging = false;
		bookmark.classList.remove("is-dragging");
		try {
			bookmark.releasePointerCapture(state.bookmarkPointerId);
		} catch {
			// pointer capture may already be gone
		}
		state.bookmarkPointerId = null;
		if (state.bookmarkDragged) {
			saveX(state.savedX);
			state.suppressBookmarkClick = true;
			window.setTimeout(() => {
				state.suppressBookmarkClick = false;
			}, 0);
		}
	}

	bookmark.addEventListener("pointerup", endBookmarkDrag);
	bookmark.addEventListener("pointercancel", endBookmarkDrag);
	bookmark.addEventListener("click", (event) => {
		event.stopPropagation();
		if (state.suppressBookmarkClick) {
			event.preventDefault();
			return;
		}
		if (state.userHidden) {
			showPet(now());
		}
	});

	window.addEventListener("resize", remeasure);
	document.addEventListener("swup:contentReplaced", () => {
		requestAnimationFrame(remeasure);
	});
	document.addEventListener("swup:page:view", () => {
		requestAnimationFrame(remeasure);
	});
	// Wallpaper mode switches only change body classes; remeasure after them.
	let lastBannerMode = isBannerMode();
	new MutationObserver(() => {
		remeasure();
		const nowBanner = isBannerMode();
		if (nowBanner && !lastBannerMode) {
			enterFromModeSwitch();
		}
		lastBannerMode = nowBanner;
	}).observe(document.body, {
		attributes: true,
		attributeFilter: ["class"],
	});
	if ("ResizeObserver" in window) {
		new ResizeObserver(remeasure).observe(layer);
	}

	petInstances.push({
		layer,
		center: () => state.x + petWidth() / 2,
	});

	const hidden = safeGet(HIDDEN_KEY) === "1";
	const startX = loadX();
	state.savedX = startX;
	setX(startX);
	if (hidden) {
		state.userHidden = true;
		state.mode = "hidden";
		root.style.opacity = "0";
		root.classList.add("is-user-hidden");
		placeBookmark();
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

function initAllBannerPets() {
	document.querySelectorAll("[data-banner-pet]").forEach((layer) => {
		const profile = PET_PROFILES[layer.dataset.pet];
		if (profile) {
			initBannerPet(layer, profile);
		}
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initAllBannerPets, {
		once: true,
	});
} else {
	initAllBannerPets();
}
