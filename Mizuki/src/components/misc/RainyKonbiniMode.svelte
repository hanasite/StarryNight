<script lang="ts">
	import Icon from "@iconify/svelte";
	import type { WALLPAPER_MODE } from "@/types/config";
	import { setWallpaperMode } from "@utils/setting-utils";
	import { onMount } from "svelte";

	type Mode = "off" | "scene" | "content";

	const items = [
		{ name: "主页", url: "/", icon: "material-symbols:home" },
		{ name: "归档", url: "/archive/", icon: "material-symbols:archive" },
		{ name: "Blog", url: "/blog/", icon: "material-symbols:article" },
		{ name: "Ticker", url: "/ticker/", icon: "material-symbols:chat" },
		{ name: "TODO", url: "/todo/", icon: "material-symbols:checklist" },
		{ name: "时间线", url: "/timeline/", icon: "material-symbols:timeline" },
		{ name: "相册", url: "/gallery/", icon: "material-symbols:photo-library" },
		{ name: "留言板", url: "/guestbook/", icon: "material-symbols:forum" },
		{ name: "关于", url: "/about/", icon: "material-symbols:info" },
	];

	let mode = $state<Mode>("off");
	let menuOpen = $state(false);
	let previousWallpaper = "banner";

	function applyMode(next: "scene" | "content", persist = true) {
		mode = next;
		menuOpen = false;
		document.body.classList.add("rainy-konbini-mode");
		document.body.classList.toggle("rainy-konbini-scene", next === "scene");
		document.body.classList.toggle("rainy-konbini-content", next === "content");
		if (next === "content") {
			setWallpaperMode("overlay");
		}
		if (next === "scene") {
			window.scrollTo(0, 0);
		}
		if (persist) {
			localStorage.setItem("rainyKonbiniMode", next);
		}
	}

	function enable() {
		if (mode === "off") {
			previousWallpaper =
				localStorage.getItem("wallpaperMode") || "banner";
			localStorage.setItem(
				"rainyKonbiniPrevWallpaper",
				previousWallpaper,
			);
		}
		applyMode("scene");
	}

	function exitMode() {
		mode = "off";
		menuOpen = false;
		document.body.classList.remove(
			"rainy-konbini-mode",
			"rainy-konbini-scene",
			"rainy-konbini-content",
		);
		localStorage.removeItem("rainyKonbiniMode");
		const previous =
			localStorage.getItem("rainyKonbiniPrevWallpaper") ||
			previousWallpaper ||
			"banner";
		localStorage.removeItem("rainyKonbiniPrevWallpaper");
		setWallpaperMode(previous as WALLPAPER_MODE);
	}

	function selectItem() {
		applyMode("content");
	}

	function seeScene() {
		applyMode("scene");
	}

	onMount(() => {
		previousWallpaper =
			localStorage.getItem("rainyKonbiniPrevWallpaper") ||
			localStorage.getItem("wallpaperMode") ||
			"banner";
		const stored = localStorage.getItem("rainyKonbiniMode");
		if (stored === "scene" || stored === "content") {
			applyMode(stored, false);
			if (stored === "content") {
				setWallpaperMode("overlay");
			}
		}

		const onEnable = () => enable();
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape" && menuOpen) {
				menuOpen = false;
			}
		};
		window.addEventListener("rainy-konbini:enable", onEnable);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("rainy-konbini:enable", onEnable);
			window.removeEventListener("keydown", onKey);
			document.body.classList.remove(
				"rainy-konbini-mode",
				"rainy-konbini-scene",
				"rainy-konbini-content",
			);
		};
	});
</script>

{#if mode !== "off"}
	<iframe
		class="rainy-konbini-bg"
		class:interactive={mode === "scene"}
		src="/effects/rainy-konbini.html"
		title="雨夜便利店 3D 场景"
		allow="fullscreen"
	></iframe>

	{#if menuOpen}
		<button
			type="button"
			class="rainy-konbini-backdrop"
			aria-label="关闭菜单"
			onclick={() => (menuOpen = false)}
		></button>
		<nav class="rainy-konbini-panel" aria-label="雨夜便利店菜单">
			<div class="rainy-konbini-grid">
				{#each items as item (item.url)}
					<a
						class="rainy-konbini-item"
						href={item.url}
						onclick={selectItem}
					>
						<Icon icon={item.icon} class="rainy-konbini-icon"></Icon>
						<span>{item.name}</span>
					</a>
				{/each}
			</div>
			<div class="rainy-konbini-actions">
				<button type="button" onclick={seeScene}>
					<Icon icon="material-symbols:3d-rotation" class="rainy-konbini-icon-small"></Icon>
					<span>看场景</span>
				</button>
				<button type="button" onclick={exitMode}>
					<Icon icon="material-symbols:logout" class="rainy-konbini-icon-small"></Icon>
					<span>退出便利店</span>
				</button>
			</div>
		</nav>
	{/if}

	<button
		type="button"
		class="rainy-konbini-fab"
		aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
		aria-expanded={menuOpen}
		onclick={() => (menuOpen = !menuOpen)}
	>
		<Icon
			icon={menuOpen ? "material-symbols:close-rounded" : "material-symbols:menu"}
			class="rainy-konbini-fab-icon"
		></Icon>
	</button>
{/if}

<style>
	.rainy-konbini-bg {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		z-index: 0;
		pointer-events: none;
		background: #05070a;
	}

	.rainy-konbini-bg.interactive {
		pointer-events: auto;
	}

	.rainy-konbini-backdrop {
		position: fixed;
		inset: 0;
		z-index: 2147482999;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: default;
	}

	.rainy-konbini-panel {
		position: fixed;
		left: 50%;
		bottom: calc(90px + env(safe-area-inset-bottom, 0px));
		transform: translateX(-50%);
		z-index: 2147483001;
		width: min(340px, calc(100vw - 32px));
		max-height: calc(100vh - 130px);
		overflow-y: auto;
		padding: 10px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 20px;
		background: rgba(8, 12, 18, 0.82);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(20px);
		color: #eaf1f7;
	}

	.rainy-konbini-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
	}

	.rainy-konbini-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding: 11px 4px 9px;
		border-radius: 12px;
		color: #eaf1f7;
		text-decoration: none;
		font-size: 11px;
		line-height: 1.2;
		transition: background 0.15s ease;
	}

	.rainy-konbini-item:hover {
		background: rgba(255, 255, 255, 0.09);
	}

	:global(.rainy-konbini-icon) {
		font-size: 22px;
	}

	:global(.rainy-konbini-icon-small) {
		font-size: 16px;
	}

	.rainy-konbini-actions {
		display: flex;
		gap: 6px;
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.rainy-konbini-actions button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		padding: 8px 6px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.06);
		color: #eaf1f7;
		font: inherit;
		font-size: 11px;
		cursor: pointer;
	}

	.rainy-konbini-actions button:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.rainy-konbini-fab {
		position: fixed;
		left: 50%;
		bottom: calc(22px + env(safe-area-inset-bottom, 0px));
		transform: translateX(-50%);
		z-index: 2147483002;
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 50%;
		background: rgba(8, 12, 18, 0.72);
		color: #eaf1f7;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(16px);
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background 0.18s ease;
	}

	.rainy-konbini-fab:hover {
		background: rgba(20, 30, 40, 0.85);
		transform: translateX(-50%) scale(1.04);
	}

	:global(.rainy-konbini-fab-icon) {
		font-size: 24px;
	}

	@media (max-width: 420px) {
		.rainy-konbini-panel {
			width: calc(100vw - 24px);
		}
	}
</style>
