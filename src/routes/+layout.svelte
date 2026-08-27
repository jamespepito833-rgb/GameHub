<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { initTheme } from '$lib/theme';

	let { children, data } = $props();

	onMount(() => {
		initTheme();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Prevent FOUC: set theme before hydration -->
	<script>
		(function () {
			try {
				var stored = localStorage.getItem('gamehub-theme');
				var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				var theme = stored === 'light' || stored === 'dark' ? stored : systemDark ? 'dark' : 'light';
				document.documentElement.dataset.theme = theme;
				document.documentElement.style.colorScheme = theme;
			} catch (e) {}
		})();
	</script>
</svelte:head>

{#if data?.user}
	<div style="background:var(--banner-bg, #eef);color:var(--banner-text, #111);padding:0.4rem 1rem;font-size:0.85rem;display:flex;justify-content:space-between;">
		<span>Signed in as <strong>{data.user.displayName}</strong> ({data.user.role})</span>
		<span><a href={data.user.role === 'ADMIN' ? '/dashboard' : '/board'}>Go to {data.user.role === 'ADMIN' ? 'Dashboard' : 'Board'}</a> · <a href="/login">Login</a></span>
	</div>
{/if}

{@render children()}

<style>
	/* Theme tokens: light is default, dark overrides via [data-theme="dark"] */
	:global(:root) {
		--bg: #fdfcfa;
		--surface: #ffffff;
		--surface-2: #f5f1e8;
		--text: #1a1a1a;
		--text-muted: rgba(26, 26, 26, 0.68);
		--text-faint: rgba(26, 26, 26, 0.48);
		--border: rgba(26, 26, 26, 0.08);
		--border-strong: rgba(26, 26, 26, 0.14);
		--nav-bg: rgba(253, 252, 250, 0.72);
		--felt-1: #1b7a4b;
		--felt-2: #0e3d2d;
		--wood: #3c2415;
		--gold: #d4af37;
		--accent: #0e8a4a;
		--accent-soft: rgba(14, 138, 74, 0.12);
		--toggle-track: rgba(26, 26, 26, 0.08);
		--toggle-border: rgba(26, 26, 26, 0.12);
		--toggle-thumb: #0a0a0a;
		--toggle-thumb-icon: #f5f1e8;
		--banner-bg: #eef;
		--banner-text: #111;
		color-scheme: light;
	}
	:global([data-theme='dark']) {
		--bg: #0a0a0a;
		--surface: #141414;
		--surface-2: #0f0f0f;
		--text: #f5f1e8;
		--text-muted: rgba(245, 241, 232, 0.72);
		--text-faint: rgba(245, 241, 232, 0.52);
		--border: rgba(245, 241, 232, 0.08);
		--border-strong: rgba(245, 241, 232, 0.14);
		--nav-bg: rgba(18, 18, 18, 0.62);
		--felt-1: #1b7a4b;
		--felt-2: #0e3d2d;
		--accent: #2ad27a;
		--accent-soft: rgba(42, 210, 122, 0.14);
		--toggle-track: rgba(245, 241, 232, 0.14);
		--toggle-border: rgba(245, 241, 232, 0.18);
		--toggle-thumb: #f5f1e8;
		--toggle-thumb-icon: #0a0a0a;
		--banner-bg: #1a1a1a;
		--banner-text: #f5f1e8;
		color-scheme: dark;
	}
	/* Eased theme transition — avoid abrupt jump, fade surfaces */
	:global(html.theme-transition),
	:global(html.theme-transition body),
	:global(html.theme-transition .nav),
	:global(html.theme-transition .panel),
	:global(html.theme-transition .card),
	:global(html.theme-transition .tcard) {
		transition:
			background-color 280ms ease,
			color 280ms ease,
			border-color 280ms ease,
			backdrop-filter 280ms ease !important;
	}
	:global(body) {
		background: var(--bg);
		color: var(--text);
		transition:
			background-color 280ms ease,
			color 280ms ease;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(html.theme-transition),
		:global(html.theme-transition body) {
			transition: none !important;
		}
	}
</style>
