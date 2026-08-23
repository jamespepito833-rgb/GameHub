<script lang="ts">
	let { data, children } = $props();

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<header style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid #222;background:#111;color:#fff;">
	<div>
		<strong>GameHub — Admin</strong>
		<span style="margin-left:1rem;opacity:0.8;">
			{data.user.displayName} ({data.user.role})
		</span>
		<a href="/dashboard" style="margin-left:1rem;color:#9ad;">Dashboard</a>
		<a href="/board" style="margin-left:0.75rem;color:#9ad;">Cashier Board</a>
		<a href="/" style="margin-left:0.75rem;color:#9ad;">Landing</a>
	</div>
	<button onclick={logout} style="padding:0.4rem 0.8rem;">Logout</button>
</header>

<main style="padding:1rem;">
	{@render children()}
</main>
