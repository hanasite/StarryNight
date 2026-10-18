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
