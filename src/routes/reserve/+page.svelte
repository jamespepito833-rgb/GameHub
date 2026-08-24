<script lang="ts">
	let tables: any[] = $state([]);
	let pricing: any = $state(null);
	let tableId = $state('');
	let date = $state(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
	let startTime = $state('10:00');
	let durationMinutes = $state(60);
	let customerName = $state('');
	let customerContact = $state('');
	let customerEmail = $state('');
	let err = $state('');
	let ok = $state('');
	let createdId = $state('');

	async function loadMeta() {
		try {
			const [tRes, pRes] = await Promise.all([fetch('/api/tables/availability'), fetch('/api/pricing/current')]);
			const tj = await tRes.json();
			const pj = await pRes.json();
			if (tRes.ok) tables = tj.data.tables;
			if (pRes.ok) pricing = pj.data.pricing;
		} catch {}
	}

	$effect(() => {
		loadMeta();
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		err = '';
		ok = '';
		createdId = '';
		const res = await fetch('/api/reservations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tableId, customerName, customerContact, customerEmail, date, startTime, durationMinutes: Number(durationMinutes) })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? j.error?.code ?? 'Failed';
			if (j.error?.details) err += ' ' + JSON.stringify(j.error.details);
			return;
		}
		ok = `Reserved! ID ${j.data.reservation._id.slice(-6)}`;
		createdId = j.data.reservation._id;
	}

	function viewCreated() {
		if (createdId) window.location.href = `/reservations/${createdId}?contact=${encodeURIComponent(customerContact)}`;
	}
</script>

<h1>Reserve a Table</h1>
<p>Guest reservation — no account needed. Provide name + PH contact <code>09...</code>.</p>
{#if pricing}<p>Current rate: <strong>₱{pricing.ratePerHour}/hr</strong> — per-minute ceil.</p>{/if}

{#if err}<div style="color:#b00020;background:#fdecea;padding:0.5rem;">{err}</div>{/if}
{#if ok}<div style="color:#0a5;background:#e7f5e7;padding:0.5rem;">{ok} <button onclick={viewCreated}>View Confirmation</button></div>{/if}

<form onsubmit={submit} style="display:grid;gap:0.75rem;max-width:500px;">
	<label>Table
		<select bind:value={tableId} required>
			<option value="" disabled>Select table</option>
			{#each tables as t}
				<option value={t._id}>{t.name} — {t.status}</option>
			{/each}
		</select>
	</label>
	<label>Date <input type="date" bind:value={date} required /></label>
	<label>Start Time <input type="time" bind:value={startTime} required /></label>
	<label>Duration
		<select bind:value={durationMinutes}>
			<option value={30}>30 min</option>
			<option value={60}>60 min</option>
			<option value={90}>90 min</option>
			<option value={120}>120 min</option>
			<option value={180}>180 min</option>
			<option value={240}>240 min</option>
		</select>
	</label>
	<label>Name <input bind:value={customerName} placeholder="Juan Dela Cruz" required /></label>
	<label>Contact (09...) <input bind:value={customerContact} placeholder="09xxxxxxxxx" required pattern="(\+639|09)[0-9]{9}" /></label>
	<label>Email (optional) <input type="email" bind:value={customerEmail} placeholder="email@example.com" /></label>
	<button type="submit">Reserve</button>
</form>

<p><small>Buffer 10min, 7-day max advance, 09:00-02:00. <a href="/tables">Check availability</a> first.</small></p>
<p><a href="/">Home</a></p>
