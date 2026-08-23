<script lang="ts">
	let { data, children } = $props();

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<header style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid #ddd;background:#fafafa;">
	<div>
		<strong>GameHub — Cashier</strong>
		<span style="margin-left:1rem;color:#555;">
			{data.user.displayName} ({data.user.role})
		</span>
		<a href="/board" style="margin-left:1rem;">Board</a>
		<a href="/" style="margin-left:0.75rem;">Landing</a>
	</div>
	<button onclick={logout} style="padding:0.4rem 0.8rem;">Logout</button>
</header>

<main style="padding:1rem;">
	{@render children()}
</main>
