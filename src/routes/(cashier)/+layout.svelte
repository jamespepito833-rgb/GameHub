<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	let { data, children } = $props();

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<header class="cashier-header">
	<div class="header-inner">
		<a href="/board" class="brand" aria-label="GameHub Cashier">
			<span class="brand-mark" aria-hidden="true"><span class="ball">8</span></span>
			<span class="brand-text">GameHub</span>
			<span class="brand-badge">Cashier</span>
		</a>

		<nav class="nav-links" aria-label="Cashier">
			<a href="/board" class="nav-link" aria-current="page">Board</a>
			<a href="/" class="nav-link">Hall</a>
		</nav>

		<div class="header-actions">
			<span class="user-pill">
				<span class="user-dot" aria-hidden="true"></span>
				<span class="user-name">{data.user.displayName}</span>
				<span class="user-role">{data.user.role}</span>
			</span>
			<ThemeToggle />
			<button class="btn btn-ghost" onclick={logout}>Logout</button>
		</div>
	</div>
	<div class="header-hairline" aria-hidden="true"></div>
</header>

<main class="main">
	{@render children()}
</main>

<style>
	.cashier-header {
		position: sticky;
		top: 0;
		z-index: 20;
		background: var(--nav-bg, rgba(18, 18, 18, 0.62));
		backdrop-filter: blur(20px) saturate(160%);
		-webkit-backdrop-filter: blur(20px) saturate(160%);
		border-bottom: 1px solid transparent;
	}
	.header-inner {
		width: min(1200px, calc(100% - 32px));
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 0;
	}
	@media (min-width: 880px) {
		.header-inner {
			width: min(1200px, calc(100% - 48px));
		}
	}
	.header-hairline {
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.22), transparent);
		opacity: 0.7;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: var(--text);
	}
	.brand-mark {
		width: 32px;
		height: 32px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: radial-gradient(120% 120% at 30% 20%, #2a6b4a 0%, #0e3d2d 55%, #0a2a1f 100%);
		border: 1px solid rgba(212, 175, 55, 0.35);
	}
	.ball {
		width: 20px;
		height: 20px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: #0b0b0b;
		color: #fff;
		border: 1.5px solid #fff;
		font-size: 11px;
		font-weight: 800;
	}
	.brand-text {
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.brand-badge {
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: var(--accent-soft);
		color: var(--accent);
		border: 1px solid rgba(42, 210, 122, 0.18);
		padding: 2px 8px;
		border-radius: 999px;
		font-weight: 700;
	}
	.nav-links {
		display: flex;
		gap: 4px;
		margin-left: auto;
	}
	@media (max-width: 720px) {
		.nav-links {
			display: none;
		}
	}
	.nav-link {
		color: var(--text-muted);
		text-decoration: none;
		padding: 8px 12px;
		border-radius: 999px;
		font-size: 0.88rem;
		font-weight: 550;
	}
	.nav-link[aria-current='page'] {
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border);
	}
	.nav-link:hover {
		color: var(--text);
		background: rgba(127, 127, 127, 0.08);
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.user-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-radius: 999px;
		background: var(--surface);
		border: 1px solid var(--border);
		font-size: 0.82rem;
	}
	.user-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: #2ad27a;
		box-shadow: 0 0 0 4px rgba(42, 210, 122, 0.18);
	}
	.user-name {
		font-weight: 700;
	}
	.user-role {
		opacity: 0.6;
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.btn {
		padding: 8px 14px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		font-weight: 600;
		cursor: pointer;
		transition: transform 100ms ease-out;
	}
	.btn:active {
		transform: scale(0.97);
	}
	.btn-ghost {
		background: transparent;
	}
	.main {
		width: min(1200px, calc(100% - 32px));
		margin: 0 auto;
		padding: 18px 0 24px;
	}
	@media (min-width: 880px) {
		.main {
			width: min(1200px, calc(100% - 48px));
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.btn {
			transition: none !important;
		}
	}
</style>
