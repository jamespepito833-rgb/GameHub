<script lang="ts">
	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let tables = $state(data.tables);
	let now = $state(Date.now());
	let pollErr = $state('');

	// tick every second for timers
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	// poll status every 10s
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

<h1>Cashier Board</h1>
<p>Welcome {data.user.displayName} — live table status (polls every 10s, timers per-second). Phase 5.</p>
{#if pollErr}<div style="color:#b00020;">{pollErr}</div>{/if}
{#if actionErr}<div style="color:#b00020;background:#fdecea;padding:0.5rem;">{actionErr}</div>{/if}
{#if actionMsg}<div style="color:#0a5;background:#e7f5e7;padding:0.5rem;">{actionMsg}</div>{/if}

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;margin:1rem 0;">
	{#each tables as t}
		<div
			style="border:2px solid {t.displayStatus === 'AVAILABLE'
				? '#2e7d32'
				: t.displayStatus === 'OCCUPIED'
					? '#c62828'
					: t.displayStatus === 'RESERVED'
						? '#ef6c00'
						: '#616161'};border-radius:8px;padding:1rem;background:{t.displayStatus === 'AVAILABLE'
				? '#e8f5e9'
				: t.displayStatus === 'OCCUPIED'
					? '#ffebee'
					: t.displayStatus === 'RESERVED'
						? '#fff3e0'
						: '#f5f5f5'};"
		>
			<strong>{t.name}</strong> — <span>{t.displayStatus}</span>
			{#if t.status !== t.displayStatus}<small style="color:#555;"> (stored: {t.status})</small>{/if}
			<div style="font-size:0.85rem;color:#555;">{t.description}</div>

			{#if t.currentSession}
				<div style="margin-top:0.5rem;font-size:0.9rem;">
					<div>Customer: {t.currentSession.customerName ?? 'Walk-in'}</div>
					<div>Elapsed: <strong>{elapsed(t.currentSession.startedAt)}</strong> | Remaining: {remaining(t.currentSession.expectedEndAt)}</div>
					<div>Status: {t.currentSession.status}</div>
					<small>Started {new Date(t.currentSession.startedAt).toLocaleString()}</small>
				</div>
				<div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
					<button onclick={() => extendSession(t.currentSession!._id)}>Extend</button>
					<button onclick={() => endSession(t.currentSession!._id)}>End</button>
					<button onclick={async () => { await fetch(`/api/tables/${t._id}/operational-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'AVAILABLE' }) }); await refresh(); }} style="background:#e8f5e9;">Mark AVAILABLE</button>
				</div>
			{:else if t.displayStatus === 'AVAILABLE'}
				<div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
					<button onclick={() => startSession(t._id)}>Start Session</button>
					<button onclick={async () => { await fetch(`/api/tables/${t._id}/operational-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'OCCUPIED' }) }); await refresh(); }}>Mark OCCUPIED</button>
				</div>
			{:else if t.displayStatus === 'RESERVED'}
				<div style="margin-top:0.5rem;font-size:0.85rem;color:#ef6c00;">Reserved soon</div>
			{:else}
				<div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
					<span style="font-size:0.85rem;color:#616161;">{t.status}</span>
					{#if t.status === 'OCCUPIED'}<button onclick={async () => { await fetch(`/api/tables/${t._id}/operational-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'AVAILABLE' }) }); await refresh(); }}>Mark AVAILABLE</button>{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>

<p><small>Timer uses <code>startedAt</code> per BR-07 — no per-second DB writes. Actions enabled in 5-02.</small></p>
<p><a href="/admin/dashboard">Admin Dashboard</a> | <a href="/admin/tables">Manage Tables</a></p>
