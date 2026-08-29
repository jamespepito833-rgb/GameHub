<script lang="ts">
	let { data } = $props();
</script>

<div class="head">
	<p class="kicker">Overview</p>
	<h1>Dashboard</h1>
	<p class="sub">Welcome {data.user.displayName} — live operational snapshot and recent activity.</p>
</div>

<nav class="quick">
	<a href="/admin/tables" class="qcard">
		<span class="qicon">▦</span>
		<span>Tables</span>
		<small>{data.stats.tablesAvailable} / {data.stats.tablesTotal} available</small>
	</a>
	<a href="/admin/pricing" class="qcard">
		<span class="qicon">₱</span>
		<span>Pricing</span>
		<small>Snapshot preserved</small>
	</a>
	<a href="/admin/cashiers" class="qcard">
		<span class="qicon">◐</span>
		<span>Cashiers</span>
		<small>Manage staff</small>
	</a>
	<a href="/board" class="qcard">
		<span class="qicon">●</span>
		<span>Board</span>
		<small>Live • CASHIER</small>
	</a>
</nav>

<section class="stats">
	<article class="stat">
		<p class="stat-kicker">Today</p>
		<p class="stat-value">₱{data.stats.incomeToday}</p>
		<p class="stat-meta">Revenue today</p>
	</article>
	<article class="stat">
		<p class="stat-kicker">Week</p>
		<p class="stat-value">₱{data.stats.incomeWeek}</p>
		<p class="stat-meta">Last 7 days</p>
	</article>
	<article class="stat">
		<p class="stat-kicker">Month</p>
		<p class="stat-value">₱{data.stats.incomeMonth}</p>
		<p class="stat-meta">This month</p>
	</article>
	<article class="stat">
		<p class="stat-kicker">Active</p>
		<p class="stat-value">{data.stats.activeSessions}</p>
		<p class="stat-meta">Sessions</p>
	</article>
	<article class="stat">
		<p class="stat-kicker">Queue</p>
		<p class="stat-value">{data.stats.queueWaiting}</p>
		<p class="stat-meta">Waiting</p>
	</article>
	<article class="stat">
		<p class="stat-kicker">Tables</p>
		<p class="stat-value">{data.stats.tablesOccupied}/{data.stats.tablesTotal}</p>
		<p class="stat-meta">{data.stats.tablesMaintenance} maintenance</p>
	</article>
</section>

<section class="panel">
	<header class="panel-head">
		<h2>Recent Activity</h2>
		<a href="/admin/logs" class="link">View all →</a>
	</header>
	<ul class="log-list">
		{#each data.recentLogs as l}
			<li class="log-item">
				<span class="log-dot" aria-hidden="true"></span>
				<span class="log-action">{l.action}</span>
				<span class="log-meta">{l.actorRole} • {new Date(l.createdAt).toLocaleString()}</span>
			</li>
		{/each}
	</ul>
</section>

<style>
	.head {
		margin-bottom: 16px;
	}
	.kicker {
		margin: 0 0 6px;
		font-size: 0.76rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--accent);
		font-weight: 750;
		font-family: ui-monospace, monospace;
	}
	h1 {
		margin: 0;
		font-size: clamp(1.6rem, 3vw, 2.2rem);
		letter-spacing: -0.03em;
		line-height: 0.95;
		font-weight: 860;
	}
	.sub {
		margin: 6px 0 0;
		color: var(--text-muted);
		max-width: 60ch;
	}
	.quick {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
		margin: 16px 0;
	}
	@media (max-width: 880px) {
		.quick {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 520px) {
		.quick {
			grid-template-columns: 1fr;
		}
	}
	.qcard {
		display: grid;
		gap: 4px;
		padding: 14px;
		border-radius: 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		text-decoration: none;
		color: inherit;
		transition:
			transform 180ms ease,
			border-color 180ms ease;
	}
	.qcard:hover {
		transform: translateY(-2px);
		border-color: var(--border-strong);
	}
	@media (prefers-reduced-motion: reduce) {
		.qcard {
			transition: none;
		}
		.qcard:hover {
			transform: none;
		}
	}
	.qicon {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		border-radius: 10px;
		background: var(--accent-soft);
		border: 1px solid rgba(42, 210, 122, 0.18);
		font-size: 0.9rem;
	}
	:global([data-theme='light']) .qicon {
		background: rgba(10, 102, 194, 0.08);
		border-color: rgba(10, 102, 194, 0.14);
	}
	.qcard span:nth-child(2) {
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.qcard small {
		color: var(--text-muted);
		font-size: 0.82rem;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin: 16px 0;
	}
	@media (max-width: 880px) {
		.stats {
			grid-template-columns: 1fr;
		}
	}
	.stat {
		padding: 16px;
		border-radius: 16px;
		background: var(--surface);
		border: 1px solid var(--border);
	}
	.stat-kicker {
		margin: 0 0 4px;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
		font-family: ui-monospace, monospace;
	}
	.stat-value {
		margin: 0;
		font-size: clamp(1.4rem, 3vw, 1.8rem);
		font-weight: 850;
		letter-spacing: -0.02em;
		line-height: 1;
	}
	.stat-meta {
		margin: 4px 0 0;
		font-size: 0.82rem;
		color: var(--text-muted);
	}
	.panel {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 18px;
		padding: 16px;
		margin-top: 16px;
	}
	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}
	.panel-head h2 {
		margin: 0;
		font-size: 1.05rem;
		letter-spacing: -0.015em;
	}
	.link {
		color: var(--text);
		font-weight: 650;
		text-decoration: none;
		border-bottom: 1px solid var(--border-strong);
		padding-bottom: 1px;
		font-size: 0.9rem;
	}
	.log-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.log-item {
		display: grid;
		grid-template-columns: 8px 1fr auto;
		gap: 10px;
		align-items: center;
		padding: 10px 12px;
		border-radius: 12px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		font-size: 0.9rem;
	}
	.log-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--accent);
		box-shadow: 0 0 0 4px var(--accent-soft);
	}
	.log-action {
		font-weight: 600;
		font-family: ui-monospace, monospace;
		font-size: 0.82rem;
	}
	.log-meta {
		color: var(--text-muted);
		font-size: 0.82rem;
		white-space: nowrap;
	}
	@media (max-width: 600px) {
		.log-item {
			grid-template-columns: 8px 1fr;
		}
		.log-meta {
			grid-column: 2;
		}
	}
</style>
