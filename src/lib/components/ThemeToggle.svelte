<script lang="ts">
	import { theme, initTheme } from '$lib/theme';
	import { onMount } from 'svelte';

	let current = $state<'light' | 'dark'>('dark');
	let toggleFn: (() => void) | null = $state(null);

	onMount(() => {
		const api = initTheme();
		if (api) toggleFn = api.toggle;
		const unsub = theme.subscribe((v) => (current = v));
		return () => unsub();
	});

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleFn?.();
		}
	}
</script>

<button
	type="button"
	class="theme-toggle"
	role="switch"
	aria-checked={current === 'dark'}
	aria-label="Toggle theme, current {current}"
	title="Toggle light/dark (currently {current})"
	onclick={() => toggleFn?.()}
	onkeydown={handleKey}
>
	<span class="track" aria-hidden="true">
		<span class="thumb" data-theme={current}>
			<span class="icon sun" aria-hidden="true">☀</span>
			<span class="icon moon" aria-hidden="true">☾</span>
		</span>
	</span>
	<span class="sr-only">{current === 'dark' ? 'Dark' : 'Light'} mode</span>
</button>

<style>
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		border-radius: 999px;
		/* Press is instant */
		transition: transform 100ms ease-out;
	}
	.theme-toggle:active {
		transform: scale(0.97);
	}
	.theme-toggle:focus-visible {
		outline: 2px solid rgba(212, 175, 55, 0.9);
		outline-offset: 2px;
	}
	.track {
		width: 46px;
		height: 28px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		padding: 2px;
		background: var(--toggle-track, rgba(245, 241, 232, 0.14));
		border: 1px solid var(--toggle-border, rgba(245, 241, 232, 0.18));
		backdrop-filter: blur(8px);
		transition:
			background 200ms ease,
			border-color 200ms ease;
	}
	.thumb {
		width: 22px;
		height: 22px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: var(--toggle-thumb, #f5f1e8);
		color: var(--toggle-thumb-icon, #0a0a0a);
		font-size: 12px;
		line-height: 1;
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
		transform: translateX(0);
		transition:
			transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
			background 200ms ease,
			color 200ms ease;
		will-change: transform;
	}
	.thumb[data-theme='dark'] {
		transform: translateX(18px);
	}
	.icon {
		position: absolute;
		transition: opacity 180ms ease;
	}
	.thumb[data-theme='light'] .sun {
		opacity: 1;
	}
	.thumb[data-theme='light'] .moon {
		opacity: 0;
	}
	.thumb[data-theme='dark'] .sun {
		opacity: 0;
	}
	.thumb[data-theme='dark'] .moon {
		opacity: 1;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* High contrast */
	@media (prefers-contrast: more) {
		.track {
			border-color: rgba(245, 241, 232, 0.32);
		}
	}
	/* Reduced motion: no slide, just cross-fade */
	@media (prefers-reduced-motion: reduce) {
		.thumb {
			transition: opacity 200ms ease !important;
			transform: none !important;
		}
		.thumb[data-theme='dark'] {
			transform: none;
		}
	}
</style>
