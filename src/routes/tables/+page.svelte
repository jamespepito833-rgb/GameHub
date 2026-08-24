<script lang="ts">
	let date = $state(new Date().toISOString().slice(0, 10));
	let startTime = $state('10:00');
	let duration = $state(60);
	let tables = $state<any[]>([]);
	let loading = $state(false);
	let err = $state('');

	async function check() {
		loading = true;
		err = '';
		try {
			const res = await fetch(`/api/tables/availability?date=${date}&startTime=${startTime}&duration=${duration}`);
			const j = await res.json();
			if (!res.ok) {
				err = j.error?.message ?? 'Failed';
				tables = [];
				return;
			}
			tables = j.data.tables;
		} catch (e) {
			err = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	// initial load without filter
	$effect(() => {
		// auto-check on mount
		check();
	});
</script>

<h1>Available Tables</h1>
<p>Check availability for your desired slot. Maintenance tables excluded.</p>

<form onsubmit={(e)=>{e.preventDefault(); check();}} style="display:flex;gap:0.5rem;flex-wrap:wrap;margin:1rem 0;">
	<input type="date" bind:value={date} required />
	<input type="time" bind:value={startTime} required />
	<select bind:value={duration}>
		<option value={30}>30 min</option>
		<option value={60}>60 min</option>
		<option value={90}>90 min</option>
		<option value={120}>120 min</option>
		<option value={180}>180 min</option>
	</select>
	<button type="submit" disabled={loading}>{loading ? 'Checking…' : 'Check'}</button>
	<a href="/reserve" style="align-self:center;">Reserve →</a>
</form>

{#if err}<div style="color:#b00020;background:#fdecea;padding:0.5rem;">{err}</div>{/if}

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;">
	{#each tables as t}
		<div style="border:2px solid {t.isAvailable === false ? '#c62828' : t.isAvailable ? '#2e7d32' : '#ddd'};border-radius:8px;padding:1rem;background:{t.isAvailable === false ? '#ffebee' : t.isAvailable ? '#e8f5e9' : '#f5f5f5'};">
			<strong>{t.name}</strong> — {t.status}
			{#if t.isAvailable === true}<div style="color:#2e7d32;">✅ Available</div>{:else if t.isAvailable === false}<div style="color:#c62828;">❌ {t.reason}</div>{:else}<div>{t.status}</div>{/if}
			<small>ID: {t._id.slice(-4)}</small>
		</div>
	{/each}
</div>

<p><small>Buffer 10min between bookings. Max 7 days advance. Operated 09:00-02:00.</small></p>
<p><a href="/rates">View Rates</a> | <a href="/">Home</a></p>
