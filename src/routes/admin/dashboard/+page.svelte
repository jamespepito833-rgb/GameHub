<script lang="ts">
	let { data } = $props();
</script>

<h1>Admin Dashboard</h1>
<p>Welcome {data.user.displayName} (ADMIN)</p>

<nav style="display:flex;gap:1rem;margin:1rem 0;">
	<a href="/tables">Tables</a>
	<a href="/admin/tables">Manage Tables</a>
	<a href="/admin/pricing">Pricing</a>
	<a href="/admin/cashiers">Cashiers</a>
	<a href="/admin/products">Products</a>
	<a href="/admin/logs">Logs</a>
	<a href="/board">Cashier Board</a>
</nav>

<section style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1rem 0;">
	<div style="border:1px solid #ddd;padding:1rem;border-radius:8px;"><strong>Today</strong><br />₱{data.stats.incomeToday}</div>
	<div style="border:1px solid #ddd;padding:1rem;border-radius:8px;"><strong>Week</strong><br />₱{data.stats.incomeWeek}</div>
	<div style="border:1px solid #ddd;padding:1rem;border-radius:8px;"><strong>Month</strong><br />₱{data.stats.incomeMonth}</div>
	<div style="border:1px solid #ddd;padding:1rem;border-radius:8px;"><strong>Active Sessions</strong><br />{data.stats.activeSessions}</div>
	<div style="border:1px solid #ddd;padding:1rem;border-radius:8px;"><strong>Queue Waiting</strong><br />{data.stats.queueWaiting}</div>
	<div style="border:1px solid #ddd;padding:1rem;border-radius:8px;"><strong>Tables</strong><br />{data.stats.tablesAvailable} / {data.stats.tablesTotal} available<br />{data.stats.tablesOccupied} occupied, {data.stats.tablesMaintenance} maintenance</div>
</section>

<h3>Recent Activity</h3>
<ul>
	{#each data.recentLogs as l}
		<li>{l.createdAt} — {l.action} ({l.actorRole})</li>
	{/each}
</ul>
