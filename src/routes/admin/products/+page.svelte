<script lang="ts">
	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let products = $state(data.products);
	let name = $state('');
	let category = $state('DRINK');
	let unitPrice = $state(30);
	let err = $state('');
	let msg = $state('');

	async function create() {
		err = '';
		msg = '';
		const res = await fetch('/api/admin/products', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, category, unitPrice: Number(unitPrice), isAvailable: true })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		location.reload();
	}

	async function toggle(id: string, cur: boolean) {
		const res = await fetch(`/api/admin/products/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ isAvailable: !cur })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		location.reload();
	}

	async function del(id: string) {
		if (!confirm('Delete product?')) return;
		const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		location.reload();
	}
</script>

<h1>Products</h1>
<p>Drinks/snacks catalog. Snapshot price preserved in orders.</p>

{#if err}<div style="color:#b00020;background:#fdecea;padding:0.5rem;">{err}</div>{/if}
{#if msg}<div style="color:#0a0;background:#e7f5e7;padding:0.5rem;">{msg}</div>{/if}

<form onsubmit={(e)=>{e.preventDefault(); create();}} style="display:flex;gap:0.5rem;margin:1rem 0;">
	<input bind:value={name} placeholder="Name" required />
	<select bind:value={category}><option>DRINK</option><option>SNACK</option><option>OTHER</option></select>
	<input type="number" bind:value={unitPrice} min="1" style="width:80px;" />
	<button type="submit">Create</button>
</form>

<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;">
	<thead><tr><th>Name</th><th>Cat</th><th>Price</th><th>Avail</th><th>Actions</th></tr></thead>
	<tbody>
		{#each products as p}
			<tr>
				<td>{p.name}</td>
				<td>{p.category}</td>
				<td>₱{p.unitPrice}</td>
				<td>{p.isAvailable ? '✅' : '❌'}</td>
				<td>
					<button onclick={()=>toggle(p._id, p.isAvailable)}>Toggle</button>
					<button onclick={()=>del(p._id)} style="color:#b00020;">Delete</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
