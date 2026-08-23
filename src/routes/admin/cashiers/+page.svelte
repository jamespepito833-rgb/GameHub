<script lang="ts">
	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let cashiers = $state(data.cashiers);
	let username = $state('');
	let password = $state('');
	let displayName = $state('');
	let err = $state('');
	let msg = $state('');

	async function create() {
		err = '';
		msg = '';
		const res = await fetch('/api/admin/cashiers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password, displayName })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? j.error?.code ?? 'Failed';
			return;
		}
		msg = 'Created';
		location.reload();
	}

	async function setStatus(id: string, status: string) {
		const res = await fetch(`/api/admin/cashiers/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		location.reload();
	}

	async function resetPw(id: string) {
		const pw = prompt('New password (min 6):');
		if (!pw) return;
		const res = await fetch(`/api/admin/cashiers/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password: pw })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			return;
		}
		msg = 'Password reset';
	}
</script>

<h1>Cashiers</h1>
<p>Create/disable cashiers, reset passwords. Schedules soft — login outside schedule still allowed but logged.</p>

{#if err}<div style="color:#b00020;background:#fdecea;padding:0.5rem;">{err}</div>{/if}
{#if msg}<div style="color:#0a0;background:#e7f5e7;padding:0.5rem;">{msg}</div>{/if}

<form onsubmit={(e)=>{e.preventDefault(); create();}} style="display:grid;gap:0.5rem;max-width:500px;margin:1rem 0;">
	<input bind:value={username} placeholder="username (e.g. cashier3)" required />
	<input bind:value={displayName} placeholder="Display name" required />
	<input type="password" bind:value={password} placeholder="password" required />
	<button type="submit">Create Cashier</button>
</form>

<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;">
	<thead><tr><th>Username</th><th>Display</th><th>Status</th><th>Actions</th></tr></thead>
	<tbody>
		{#each cashiers as c}
			<tr>
				<td>{c.username}</td>
				<td>{c.displayName}</td>
				<td>{c.status}</td>
				<td>
					{#if c.status === 'ACTIVE'}<button onclick={()=>setStatus(c._id, 'DISABLED')}>Disable</button>{:else}<button onclick={()=>setStatus(c._id, 'ACTIVE')}>Enable</button>{/if}
					<button onclick={()=>resetPw(c._id)}>Reset Pw</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
