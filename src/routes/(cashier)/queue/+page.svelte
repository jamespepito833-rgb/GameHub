<script lang="ts">
	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let queue = $state(data.queue);
	let name = $state('');
	let contact = $state('');
	let partySize = $state(2);
	let err = $state('');
	let msg = $state('');

	async function refresh() {
		const res = await fetch('/api/queue');
		const j = await res.json();
		if (res.ok) queue = j.data.queue;
	}

	async function add() {
		err = '';
		msg = '';
		const res = await fetch('/api/queue', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ customerName: name, customerContact: contact, partySize: Number(partySize) })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		msg = 'Added to queue';
		name = '';
		contact = '';
		await refresh();
	}

	async function call(id: string) {
		const res = await fetch(`/api/queue/${id}/call`, { method: 'POST' });
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		await refresh();
	}

	async function seat(id: string) {
		const tableId = prompt('Table ID to seat (from board, e.g. Table 4 id):');
		if (!tableId) return;
		const res = await fetch(`/api/queue/${id}/seat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tableId })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		msg = `Seated, session ${j.data.session._id.slice(-4)}`;
		await refresh();
	}

	async function cancel(id: string) {
		const res = await fetch(`/api/queue/${id}/cancel`, { method: 'POST' });
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		await refresh();
	}
</script>

<h1>Queue</h1>
<p>Walk-in queue — FIFO, one per contact, CALLED expires in 10min. Phase 5-03.</p>

{#if err}<div style="color:#b00020;background:#fdecea;padding:0.5rem;">{err}</div>{/if}
{#if msg}<div style="color:#0a5;background:#e7f5e7;padding:0.5rem;">{msg}</div>{/if}

<form onsubmit={(e)=>{e.preventDefault(); add();}} style="display:flex;gap:0.5rem;margin:1rem 0;">
	<input bind:value={name} placeholder="Name" required />
	<input bind:value={contact} placeholder="Contact" required />
	<input type="number" bind:value={partySize} min="1" style="width:60px;" />
	<button type="submit">Add to Queue</button>
</form>

<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;">
	<thead><tr><th>Name</th><th>Contact</th><th>Party</th><th>Status</th><th>Actions</th></tr></thead>
	<tbody>
		{#each queue as q}
			<tr>
				<td>{q.customerName}</td>
				<td>{q.customerContact}</td>
				<td>{q.partySize ?? '-'}</td>
				<td>{q.status}</td>
				<td>
					{#if q.status === 'WAITING'}<button onclick={()=>call(q._id)}>Call</button>{/if}
					{#if q.status === 'CALLED'}<button onclick={()=>seat(q._id)}>Seat</button>{/if}
					<button onclick={()=>cancel(q._id)}>Cancel</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<p><small>Tip: copy Table ID from board URL or use Table name lookup. For MVP, seat requires Table ID.</small></p>
<p><a href="/board">Back to Board</a></p>
