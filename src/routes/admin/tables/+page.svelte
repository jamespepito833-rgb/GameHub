<script lang="ts">
	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let tables = $state(data.tables);
	let newName = $state('');
	let newDesc = $state('');
	let msg = $state('');
	let err = $state('');

	async function create() {
		msg = '';
		err = '';
		const res = await fetch('/api/admin/tables', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newName, description: newDesc, status: 'AVAILABLE' })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		tables = [...tables, { _id: j.data.table._id, name: j.data.table.name, description: j.data.table.description, status: j.data.table.status, createdAt: '', updatedAt: '' }];
		newName = '';
		newDesc = '';
		msg = 'Created';
		location.reload();
	}

	async function setStatus(id: string, status: string) {
		err = '';
		msg = '';
		const res = await fetch(`/api/admin/tables/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? j.error?.code ?? 'Failed';
			return;
		}
		msg = `Updated to ${status}`;
		location.reload();
	}

	async function del(id: string) {
		if (!confirm('Delete table?')) return;
		const res = await fetch(`/api/admin/tables/${id}`, { method: 'DELETE' });
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		location.reload();
	}
</script>

<h1>Tables — Maintenance (ADMIN)</h1>
<p>ADMIN: create tables + set <code>UNDER_MAINTENANCE</code> (<code>MAINTENANCE</code>/<code>OUT_OF_SERVICE</code>) and remove it. Operational <code>AVAILABLE</code>↔<code>OCCUPIED</code> is <strong>CASHIER</strong> via Board / <code>POST /api/tables/:id/operational-status</code>.</p>

{#if err}<div style="color:#b00020;background:#fdecea;padding:0.5rem;">{err}</div>{/if}
{#if msg}<div style="color:#0a0;background:#e7f5e7;padding:0.5rem;">{msg}</div>{/if}

<form onsubmit={(e)=>{e.preventDefault(); create();}} style="display:flex;gap:0.5rem;margin:1rem 0;">
	<input bind:value={newName} placeholder="Table name (e.g. Table 9)" required style="padding:0.4rem;" />
	<input bind:value={newDesc} placeholder="Description" style="padding:0.4rem;" />
	<button type="submit">Create</button>
</form>

<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;">
	<thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
	<tbody>
		{#each tables as t}
			<tr>
				<td>{t.name}</td>
				<td>{t.description}</td>
				<td>{t.status}</td>
				<td>
					{#if t.status === 'AVAILABLE'}<button onclick={()=>setStatus(t._id, 'MAINTENANCE')}>Set MAINTENANCE</button>{:else if t.status === 'MAINTENANCE' || t.status === 'OUT_OF_SERVICE'}<button onclick={()=>setStatus(t._id, 'AVAILABLE')}>Remove Maintenance (→ AVAILABLE)</button>{/if}
					{#if t.status !== 'OUT_OF_SERVICE' && t.status !== 'MAINTENANCE'}<button onclick={()=>setStatus(t._id, 'OUT_OF_SERVICE')}>OUT_OF_SERVICE</button>{:else if t.status === 'OUT_OF_SERVICE'}<button onclick={()=>setStatus(t._id, 'MAINTENANCE')}>→ MAINTENANCE</button>{/if}
					<button onclick={()=>del(t._id)} style="color:#b00020;">Delete</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
<small>Seeded 8 tables. Deleting blocked if active session/reservation exists.</small>
