<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	let { data, children } = $props();

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<header class="admin-header">
	<div class="header-inner">
		<a href="/admin/dashboard" class="brand" aria-label="GameHub Admin">
			<span class="brand-mark" aria-hidden="true"><span class="ball">8</span></span>
			<span class="brand-text">GameHub</span>
			<span class="brand-badge">Admin</span>
		</a>

		<nav class="nav-links" aria-label="Admin">
			<a href="/admin/dashboard" class="nav-link">Dashboard</a>
			<a href="/admin/tables" class="nav-link">Tables</a>
			<a href="/admin/pricing" class="nav-link">Pricing</a>
			<a href="/admin/cashiers" class="nav-link">Cashiers</a>
			<a href="/admin/products" class="nav-link">Products</a>
			<a href="/admin/logs" class="nav-link">Logs</a>
		</nav>

		<div class="header-actions">
			<span class="user-pill">
				<span class="user-dot admin" aria-hidden="true"></span>
				<span class="user-name">{data.user.displayName}</span>
				<span class="user-role">{data.user.role}</span>
			</span>
			<ThemeToggle />
			<button class="btn btn-ghost" onclick={logout}>Logout</button>
		</div>
	</div>
	<div class="header-hairline admin" aria-hidden="true"></div>
</header>

<main class="main">
	{@render children()}
</main>

<style>
	.admin-header {
		position: sticky;
		top: 0;
		z-index: 20;
		background: var(--nav-bg, rgba(18, 18, 18, 0.72));
		backdrop-filter: blur(20px) saturate(160%);
		-webkit-backdrop-filter: blur(20px) saturate(160%);
	}
	.header-inner {
		width: min(1200px, calc(100% - 32px));
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 0;
		flex-wrap: wrap;
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
	.header-hairline.admin {
		background: linear-gradient(90deg, transparent, rgba(42, 210, 122, 0.22), transparent);
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
		background: rgba(212, 175, 55, 0.14);
		color: #d4af37;
		border: 1px solid rgba(212, 175, 55, 0.22);
		padding: 2px 8px;
		border-radius: 999px;
		font-weight: 700;
	}
	.nav-links {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
		margin-left: auto;
	}
	@media (max-width: 960px) {
		.nav-links {
			display: none;
		}
	}
	.nav-link {
		color: var(--text-muted);
		text-decoration: none;
		padding: 8px 12px;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 550;
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
	.user-dot.admin {
		background: #d4af37;
		box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.18);
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
</style>
