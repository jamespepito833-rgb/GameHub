<script lang="ts">
	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let tables = $state(data.tables);
	let now = $state(Date.now());
	let pollErr = $state('');

	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	$effect(() => {
		const id = setInterval(async () => {
			try {
				const res = await fetch('/api/tables/status');
				const j = await res.json();
				if (res.ok) tables = j.data.tables;
			} catch (e) {
				pollErr = (e as Error).message;
			}
		}, 10000);
		return () => clearInterval(id);
	});

	function elapsed(startedAt: string): string {
		const ms = now - new Date(startedAt).getTime();
		if (ms < 0) return '00:00';
		const s = Math.floor(ms / 1000);
		const m = Math.floor(s / 60);
		const h = Math.floor(m / 60);
		const mm = String(m % 60).padStart(2, '0');
		const ss = String(s % 60).padStart(2, '0');
		return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
	}
	function remaining(expectedEndAt: string): string {
		const ms = new Date(expectedEndAt).getTime() - now;
		if (ms <= 0) return 'OVERDUE';
		const s = Math.floor(ms / 1000);
		const m = Math.floor(s / 60);
		const h = Math.floor(m / 60);
		const mm = String(m % 60).padStart(2, '0');
		const ss = String(s % 60).padStart(2, '0');
		return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
	}

	let actionErr = $state('');
	let actionMsg = $state('');

	async function refresh() {
		try {
			const res = await fetch('/api/tables/status');
			const j = await res.json();
			if (res.ok) tables = j.data.tables;
		} catch (e) {
			pollErr = (e as Error).message;
		}
	}

	async function startSession(tableId: string) {
		const customerName = prompt('Customer name (leave empty for Walk-in):') ?? 'Walk-in';
		const durStr = prompt('Duration minutes (15-480):', '60');
		if (!durStr) return;
		const durationMinutes = parseInt(durStr, 10);
		actionErr = '';
		actionMsg = '';
		const res = await fetch('/api/sessions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tableId, customerName: customerName || 'Walk-in', durationMinutes })
		});
		const j = await res.json();
		if (!res.ok) {
			actionErr = j.error?.message ?? j.error?.code ?? 'Failed';
			return;
		}
		actionMsg = `Started ${j.data.session._id.slice(-4)}`;
		await refresh();
	}

	async function extendSession(sessionId: string) {
		const addStr = prompt('Extend minutes (15-240):', '30');
		if (!addStr) return;
		const addedMinutes = parseInt(addStr, 10);
		actionErr = '';
		actionMsg = '';
		const res = await fetch(`/api/sessions/${sessionId}/extend`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ addedMinutes })
		});
		const j = await res.json();
		if (!res.ok) {
			actionErr = j.error?.message ?? j.error?.code ?? 'Failed';
			return;
		}
		actionMsg = `Extended +${addedMinutes}m`;
		await refresh();
	}

	async function endSession(sessionId: string) {
		if (!confirm('End session now?')) return;
		actionErr = '';
		actionMsg = '';
		const res = await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' });
		const j = await res.json();
		if (!res.ok) {
			actionErr = j.error?.message ?? 'Failed';
			return;
		}
		actionMsg = `Ended, duration ${j.data.session.durationMinutes}m`;
		await refresh();
	}
</script>

<div class="head">
	<div>
		<p class="kicker">Live Operations</p>
		<h1>Board</h1>
		<p class="sub">Welcome {data.user.displayName} — timers tick from <code>startedAt</code>, no per-second writes.</p>
	</div>
	<div class="head-actions">
		<span class="live"><span class="live-dot"></span> Live • polls 10s</span>
		<a href="/admin/tables" class="link">Manage Tables →</a>
	</div>
</div>

{#if pollErr}<div class="alert alert-error">{pollErr}</div>{/if}
{#if actionErr}<div class="alert alert-error">{actionErr}</div>{/if}
{#if actionMsg}<div class="alert alert-ok">{actionMsg}</div>{/if}

<div class="grid">
	{#each tables as t}
		<article class="tcard" data-status={t.displayStatus}>
			<div class="tcard-bar" data-status={t.displayStatus} aria-hidden="true"></div>
			<header class="tcard-head">
				<h3>{t.name}</h3>
				<span class="badge" data-status={t.displayStatus}>
					{t.displayStatus}
				</span>
			</header>
			<p class="tcard-desc">{t.description || 'Tournament • 9ft'}</p>
			{#if t.status !== t.displayStatus}<small class="muted">stored: {t.status}</small>{/if}

			{#if t.currentSession}
				<div class="session">
					<div class="session-row">
						<span>Guest</span><strong>{t.currentSession.customerName ?? 'Walk-in'}</strong>
					</div>
					<div class="timer">
						<div class="timer-block">
							<span class="timer-label">Elapsed</span>
							<span class="timer-value">{elapsed(t.currentSession.startedAt)}</span>
						</div>
						<div class="timer-divider"></div>
						<div class="timer-block">
							<span class="timer-label">Remaining</span>
							<span class="timer-value" data-overdue={remaining(t.currentSession.expectedEndAt) === 'OVERDUE'}>{remaining(t.currentSession.expectedEndAt)}</span>
						</div>
					</div>
					<div class="session-meta">
						<span class="chip">{t.currentSession.status}</span>
						<span class="muted">{new Date(t.currentSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
					</div>
				</div>
				<div class="actions">
					<button class="btn btn-ghost" onclick={() => extendSession(t.currentSession!._id)}>Extend</button>
					<button class="btn btn-primary" onclick={() => endSession(t.currentSession!._id)}>End</button>
					<button class="btn btn-ghost" onclick={async () => { await fetch(`/api/tables/${t._id}/operational-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'AVAILABLE' }) }); await refresh(); }}>Mark AVAILABLE</button>
				</div>
			{:else if t.displayStatus === 'AVAILABLE'}
				<div class="actions">
					<button class="btn btn-primary" onclick={() => startSession(t._id)}>Start Session</button>
					<button class="btn btn-ghost" onclick={async () => { await fetch(`/api/tables/${t._id}/operational-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'OCCUPIED' }) }); await refresh(); }}>Mark OCCUPIED</button>
				</div>
			{:else if t.displayStatus === 'RESERVED'}
				<div class="muted" style="margin-top:8px; font-size:0.9rem;">Reserved soon — check-ins first</div>
			{:else}
				<div class="muted" style="margin-top:8px; font-size:0.9rem;">{t.status}</div>
				{#if t.status === 'OCCUPIED'}<button class="btn btn-ghost" style="margin-top:8px;" onclick={async () => { await fetch(`/api/tables/${t._id}/operational-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'AVAILABLE' }) }); await refresh(); }}>Mark AVAILABLE</button>{/if}
			{/if}
		</article>
	{/each}
</div>

<p class="foot"><small>BR-07 • <a href="/queue">Queue</a> • <a href="/admin/dashboard">Dashboard</a></small></p>

<style>
	.head {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 8px;
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
		font-size: 0.95rem;
	}
	.sub code {
		background: var(--accent-soft);
		padding: 1px 6px;
		border-radius: 6px;
		font-size: 0.85em;
		border: 1px solid var(--border);
	}
	.head-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.live {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 0.82rem;
		color: var(--text-muted);
		border: 1px solid var(--border);
		padding: 6px 10px;
		border-radius: 999px;
		background: var(--surface);
	}
	.live-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: #2ad27a;
		box-shadow: 0 0 0 4px rgba(42, 210, 122, 0.18);
		animation: pulse 1.8s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.live-dot {
			animation: none;
		}
	}
	.link {
		color: var(--text);
		font-weight: 650;
		text-decoration: none;
		border-bottom: 1px solid var(--border-strong);
		padding-bottom: 1px;
		font-size: 0.9rem;
	}
	.alert {
		padding: 10px 12px;
		border-radius: 12px;
		font-size: 0.9rem;
		margin: 12px 0;
	}
	.alert-error {
		background: #2a1214;
		border: 1px solid rgba(255, 70, 70, 0.22);
		color: #ffb4b4;
	}
	:global([data-theme='light']) .alert-error {
		background: #fef2f2;
		color: #7f1d1d;
	}
	.alert-ok {
		background: #0f1a14;
		border: 1px solid rgba(42, 210, 122, 0.28);
		color: #b7f5d6;
	}
	:global([data-theme='light']) .alert-ok {
		background: #f0fdf4;
		color: #14532d;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
		margin-top: 16px;
	}
	.tcard {
		position: relative;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 18px;
		padding: 14px;
		overflow: clip;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
		transition:
			transform 180ms ease,
			border-color 180ms ease;
	}
	.tcard:hover {
		transform: translateY(-2px);
		border-color: var(--border-strong);
	}
	@media (prefers-reduced-motion: reduce) {
		.tcard {
			transition: none;
		}
		.tcard:hover {
			transform: none;
		}
	}
	.tcard-bar {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 3px;
	}
	.tcard-bar[data-status='AVAILABLE'] {
		background: #2ad27a;
	}
	.tcard-bar[data-status='OCCUPIED'] {
		background: #ef4444;
	}
	.tcard-bar[data-status='RESERVED'] {
		background: #f59e0b;
	}
	.tcard-bar[data-status='MAINTENANCE'] {
		background: #6b7280;
	}
	.tcard-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.tcard-head h3 {
		margin: 0;
		font-size: 1.05rem;
		letter-spacing: -0.015em;
	}
	.badge {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid;
		white-space: nowrap;
	}
	.badge[data-status='AVAILABLE'] {
		background: rgba(42, 210, 122, 0.14);
		border-color: rgba(42, 210, 122, 0.28);
		color: #0e5028;
	}
	:global([data-theme='dark']) .badge[data-status='AVAILABLE'] {
		color: #b7f5d6;
	}
	.badge[data-status='OCCUPIED'] {
		background: rgba(239, 68, 68, 0.12);
		border-color: rgba(239, 68, 68, 0.24);
		color: #7f1d1d;
	}
	:global([data-theme='dark']) .badge[data-status='OCCUPIED'] {
		color: #ffb4b4;
	}
	.badge[data-status='RESERVED'] {
		background: rgba(245, 158, 11, 0.14);
		border-color: rgba(245, 158, 11, 0.24);
		color: #92400e;
	}
	:global([data-theme='dark']) .badge[data-status='RESERVED'] {
		color: #fde68a;
	}
	.badge[data-status='MAINTENANCE'] {
		background: rgba(107, 114, 128, 0.14);
		border-color: rgba(107, 114, 128, 0.24);
		color: #374151;
	}
	:global([data-theme='dark']) .badge[data-status='MAINTENANCE'] {
		color: #d1d5db;
	}
	.tcard-desc {
		margin: 4px 0 0;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.muted {
		color: var(--text-muted);
		font-size: 0.82rem;
	}
	.session {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
		display: grid;
		gap: 8px;
	}
	.session-row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: 0.9rem;
	}
	.session-row span {
		color: var(--text-muted);
	}
	.timer {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 10px;
		align-items: center;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 10px;
	}
	.timer-block {
		display: grid;
		gap: 2px;
		text-align: center;
	}
	.timer-label {
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		font-family: ui-monospace, monospace;
	}
	.timer-value {
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		letter-spacing: -0.02em;
		font-size: 1.05rem;
	}
	.timer-value[data-overdue='true'] {
		color: #ef4444;
	}
	.timer-divider {
		width: 1px;
		align-self: stretch;
		background: var(--border);
	}
	.session-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.82rem;
	}
	.chip {
		background: var(--surface-2);
		border: 1px solid var(--border);
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 12px;
	}
	.btn {
		padding: 8px 14px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		font-weight: 650;
		font-size: 0.85rem;
		cursor: pointer;
		transition: transform 100ms ease-out;
	}
	.btn:active {
		transform: scale(0.97);
	}
	.btn-primary {
		background: var(--accent);
		color: white;
		border-color: transparent;
	}
	:global([data-theme='light']) .btn-primary {
		color: white;
	}
	:global([data-theme='dark']) .btn-primary {
		color: #05210f;
		background: #2ad27a;
	}
	.btn-ghost {
		background: transparent;
	}
	.foot {
		margin-top: 16px;
		color: var(--text-muted);
	}
	.foot a {
		color: var(--text);
	}
</style>
