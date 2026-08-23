<script lang="ts">
	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let pricings = $state(data.pricings);
	let rate = $state(120);
	let err = $state('');
	let msg = $state('');

	async function create() {
		err = '';
		msg = '';
		const res = await fetch('/api/admin/pricing', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ratePerHour: Number(rate) })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		msg = `New rate ₱${j.data.pricing.ratePerHour}/hr active`;
		location.reload();
	}
</script>

<h1>Pricing</h1>
<p>Flat hourly rate. Only one active at a time; previous rate gets <code>effectiveTo</code>. Historical snapshots preserved in sessions.</p>

{#if err}<div style="color:#b00020;background:#fdecea;padding:0.5rem;">{err}</div>{/if}
{#if msg}<div style="color:#0a0;background:#e7f5e7;padding:0.5rem;">{msg}</div>{/if}

<form onsubmit={(e)=>{e.preventDefault(); create();}} style="display:flex;gap:0.5rem;margin:1rem 0;">
	<input type="number" bind:value={rate} min="1" step="1" required style="padding:0.4rem;" />
	<button type="submit">Create New Rate</button>
</form>

<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;">
	<thead><tr><th>Rate/hr</th><th>Active</th><th>From</th><th>To</th></tr></thead>
	<tbody>
		{#each pricings as p}
			<tr style={p.isActive ? 'background:#e7f5e7;' : ''}>
				<td>₱{p.ratePerHour}</td>
				<td>{p.isActive ? '✅' : ''}</td>
				<td>{p.effectiveFrom}</td>
				<td>{p.effectiveTo ?? '-'}</td>
			</tr>
		{/each}
	</tbody>
</table>
<small>Current active is used for new reservations/sessions. Existing sessions keep snapshot.</small>
