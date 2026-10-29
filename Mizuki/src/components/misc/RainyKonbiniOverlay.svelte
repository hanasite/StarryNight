<script lang="ts">
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";

	let open = $state(false);
	let loaded = $state(false);
	let previousOverflow = "";

	function show() {
		if (open) {
			return;
		}
		previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		loaded = false;
		open = true;
	}

	function hide() {
		if (!open) {
			return;
		}
		open = false;
		document.body.style.overflow = previousOverflow;
	}

	onMount(() => {
		const onOpen = () => show();
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				hide();
			}
		};
		window.addEventListener("rainy-konbini:open", onOpen);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("rainy-konbini:open", onOpen);
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = previousOverflow;
		};
	});
</script>

{#if open}
	<div
		class="rainy-konbini-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="雨夜便利店 3D 场景"
	>
		<iframe
			src="/effects/rainy-konbini.html"
			title="雨夜便利店 · 街角微缩场景"
			allow="fullscreen"
			onload={() => (loaded = true)}
		></iframe>
		<div class="rainy-konbini-bar">
			<span class="hint">雨夜便利店 · 拖动旋转 / 滚轮缩放</span>
			<button type="button" onclick={hide} aria-label="关闭雨夜便利店">
				<Icon icon="material-symbols:close-rounded" class="text-[1rem]"></Icon>
				<span>关闭</span>
			</button>
		</div>
		{#if !loaded}
			<div class="rainy-konbini-loading">正在加载雨夜场景…</div>
		{/if}
	</div>
{/if}

<style>
	.rainy-konbini-overlay {
		position: fixed;
		inset: 0;
		z-index: 2147483000;
		background: #05070a;
	}

	.rainy-konbini-overlay iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
	}

	.rainy-konbini-bar {
		position: absolute;
		top: 16px;
		right: 16px;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 10px 8px 14px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		background: rgba(8, 12, 18, 0.6);
		color: #eaf1f7;
		backdrop-filter: blur(12px);
		font-size: 12px;
	}

	.hint {
		color: rgba(234, 241, 247, 0.7);
		white-space: nowrap;
	}

	.rainy-konbini-bar button {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border: 0;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		font: inherit;
		cursor: pointer;
	}

	.rainy-konbini-bar button:hover {
		background: rgba(255, 255, 255, 0.18);
	}

	.rainy-konbini-loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #05070a;
		color: #b8c7d6;
		font-size: 14px;
		letter-spacing: 0.08em;
	}

	@media (max-width: 640px) {
		.hint {
			display: none;
		}

		.rainy-konbini-bar {
			top: 10px;
			right: 10px;
		}
	}
</style>
