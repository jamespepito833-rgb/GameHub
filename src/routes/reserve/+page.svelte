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
	let activeBtn: string | null = $state(null);

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
		ok = `Reserved — ${j.data.reservation._id.slice(-6)}`;
		createdId = j.data.reservation._id;
	}

	function viewCreated() {
		if (createdId) window.location.href = `/reservations/${createdId}?contact=${encodeURIComponent(customerContact)}`;
	}
</script>

<svelte:head>
	<title>Reserve — GameHub</title>
</svelte:head>

<nav class="nav">
	<div class="nav-inner">
		<a href="/" class="brand"><span class="brand-mark"><span class="ball">8</span></span><span class="brand-text">GameHub</span></a>
		<div class="nav-links">
			<a href="/tables" class="nav-link">Tables</a>
			<a href="/rates" class="nav-link">Rates</a>
			<a href="/reserve" class="nav-link" aria-current="page">Reserve</a>
		</div>
	</div>
	<div class="nav-hairline"></div>
</nav>

<header class="hero-mini">
	<div class="hero-mini-inner">
		<p class="kicker">Guest Checkout • 30 Seconds</p>
		<h1>Reserve a Table</h1>
		<p class="sub">No account needed. Name + <code>09…</code> and you’re set — snapshot pricing locked at booking.</p>
	</div>
</header>

<section class="panel">
	{#if pricing}
		<div class="rate-pill">
			<span class="pill-dot"></span>
			<span>Current rate <strong>₱{pricing.ratePerHour}/hour</strong> • per-minute ceil</span>
		</div>
	{/if}

	{#if err}<div class="alert alert-error">{err}</div>{/if}
	{#if ok}<div class="alert alert-ok">{ok} <button class="link-btn" onclick={viewCreated}>View Confirmation →</button></div>{/if}

	<form onsubmit={submit} class="form">
		<div class="form-grid">
			<label class="field">
				<span>Table</span>
				<select bind:value={tableId} required>
					<option value="" disabled>Select table</option>
					{#each tables as t}
						<option value={t._id}>{t.name} — {t.status}</option>
					{/each}
				</select>
				<small><a href="/tables">Check availability</a> first</small>
			</label>

			<label class="field">
				<span>Date</span>
				<input type="date" bind:value={date} required />
			</label>

			<label class="field">
				<span>Start Time</span>
				<input type="time" bind:value={startTime} required />
			</label>

			<label class="field">
				<span>Duration</span>
				<select bind:value={durationMinutes}>
					<option value={30}>30 min</option>
					<option value={60}>60 min</option>
					<option value={90}>90 min</option>
					<option value={120}>2 hours</option>
					<option value={180}>3 hours</option>
					<option value={240}>4 hours</option>
				</select>
			</label>

			<label class="field">
				<span>Name</span>
				<input bind:value={customerName} placeholder="Juan Dela Cruz" required />
			</label>

			<label class="field">
				<span>Contact — 09…</span>
				<input bind:value={customerContact} placeholder="09xxxxxxxxx" required pattern="(\+639|09)[0-9]{9}" />
				<small>We’ll use this to find your booking</small>
			</label>

			<label class="field field-full">
				<span>Email <em>(optional)</em></span>
				<input type="email" bind:value={customerEmail} placeholder="email@example.com" />
			</label>
		</div>

		<div class="form-foot">
			<button
				type="submit"
				class="btn btn-primary"
				data-active={activeBtn === 'reserve'}
				onpointerdown={() => (activeBtn = 'reserve')}
				onpointerup={() => (activeBtn = null)}
				onpointerleave={() => (activeBtn = null)}
			>
				Confirm Reservation
			</button>
			<span class="foot-hint">Buffer 10 min • 7-day window • 09:00–02:00</span>
		</div>
	</form>
</section>

<p class="foot"><small><a href="/">Home</a> • Need to change? Use your confirmation link to cancel before start time.</small></p>

<style>
	:global(body) {
		margin: 0;
		background: #0a0a0a;
		color: #f5f1e8;
		font: 100%/1.5 system-ui, sans-serif;
	}
	.nav {
		position: sticky;
		top: 0;
		z-index: 20;
		background: rgba(18, 18, 18, 0.62);
		backdrop-filter: blur(20px) saturate(160%);
	}
	.nav-inner {
		width: min(1120px, calc(100% - 32px));
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 0;
	}
	@media (min-width: 880px) {
		.nav-inner {
			width: min(1120px, calc(100% - 48px));
		}
	}
	.nav-hairline {
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.35), transparent);
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
	}
	.brand-mark {
		width: 32px;
		height: 32px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: radial-gradient(120% 120% at 30% 20%, #2a6b4a 0%, #0e3d2d 55%, #0a2a1f 100%);
		border: 1px solid rgba(212, 175, 55, 0.35);
	}
	.ball {
		width: 20px;
		height: 20px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: #0b0b0b;
		color: #fff;
		border: 1.5px solid #fff;
		font-size: 11px;
		font-weight: 800;
	}
	.brand-text {
		font-weight: 750;
		letter-spacing: -0.02em;
	}
	.nav-links {
		display: flex;
		gap: 4px;
		margin-left: auto;
	}
	@media (max-width: 720px) {
		.nav-links {
			display: none;
		}
	}
	.nav-link {
		color: rgba(245, 241, 232, 0.82);
		text-decoration: none;
		padding: 8px 12px;
		border-radius: 999px;
		font-size: 0.9rem;
	}
	.nav-link[aria-current='page'] {
		background: rgba(245, 241, 232, 0.1);
		color: #fff;
	}
	.hero-mini {
		width: min(1120px, calc(100% - 32px));
		margin: 0 auto;
		padding: 28px 0 8px;
	}
	@media (min-width: 880px) {
		.hero-mini {
			width: min(1120px, calc(100% - 48px));
		}
	}
	.kicker {
		margin: 0 0 6px;
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #2ad27a;
		font-weight: 700;
	}
	.hero-mini h1 {
		margin: 0;
		font-size: clamp(1.8rem, 4vw, 2.6rem);
		letter-spacing: -0.03em;
	}
	.sub {
		color: rgba(245, 241, 232, 0.72);
		max-width: 60ch;
	}
	.panel {
		width: min(1120px, calc(100% - 32px));
		margin: 16px auto 0;
		background: #141414;
		border: 1px solid rgba(245, 241, 232, 0.08);
		border-radius: 18px;
		padding: 18px;
	}
	@media (min-width: 880px) {
		.panel {
			width: min(1120px, calc(100% - 48px));
		}
	}
	.rate-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: #0e1a14;
		border: 1px solid rgba(42, 210, 122, 0.22);
		padding: 8px 12px;
		border-radius: 999px;
		font-size: 0.9rem;
		margin-bottom: 14px;
	}
	.pill-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: #2ad27a;
		box-shadow: 0 0 0 4px rgba(42, 210, 122, 0.18);
	}
	.alert {
		padding: 10px 12px;
		border-radius: 12px;
		font-size: 0.9rem;
		margin-bottom: 12px;
	}
	.alert-error {
		background: #2a1214;
		border: 1px solid rgba(255, 80, 80, 0.25);
		color: #ffb4b4;
	}
	.alert-ok {
		background: #0f1a14;
		border: 1px solid rgba(42, 210, 122, 0.28);
		color: #b7f5d6;
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.link-btn {
		background: #f5f1e8;
		color: #0a0a0a;
		border: 0;
		padding: 6px 10px;
		border-radius: 999px;
		font-weight: 700;
		cursor: pointer;
	}
	.form {
		display: grid;
		gap: 14px;
	}
	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}
	@media (max-width: 720px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
	.field {
		display: grid;
		gap: 6px;
	}
	.field span {
		font-size: 0.82rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(245, 241, 232, 0.72);
	}
	.field em {
		font-style: normal;
		opacity: 0.6;
		text-transform: none;
		letter-spacing: 0;
	}
	.field input,
	.field select {
		background: #0f0f0f;
		color: #f5f1e8;
		border: 1px solid rgba(245, 241, 232, 0.14);
		border-radius: 12px;
		padding: 11px 12px;
		font-size: 0.95rem;
	}
	.field input:focus,
	.field select:focus {
		outline: 2px solid rgba(212, 175, 55, 0.5);
		outline-offset: 2px;
		border-color: rgba(212, 175, 55, 0.35);
	}
	.field small {
		font-size: 0.78rem;
		color: rgba(245, 241, 232, 0.55);
	}
	.field small a {
		color: #f5f1e8;
	}
	.field-full {
		grid-column: 1 / -1;
	}
	.form-foot {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding-top: 4px;
	}
	.btn {
		display: inline-flex;
		padding: 12px 18px;
		border-radius: 999px;
		font-weight: 700;
		border: 1px solid transparent;
		cursor: pointer;
		transition: transform 100ms ease-out;
		text-decoration: none;
	}
	.btn:active,
	.btn[data-active='true'] {
		transform: scale(0.97);
	}
	.btn-primary {
		background: #f5f1e8;
		color: #0a0a0a;
		border-color: rgba(212, 175, 55, 0.2);
	}
	.foot {
		width: min(1120px, calc(100% - 32px));
		margin: 14px auto 24px;
		color: rgba(245, 241, 232, 0.55);
	}
	@media (min-width: 880px) {
		.foot {
			width: min(1120px, calc(100% - 48px));
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.btn {
			transition: opacity 200ms ease !important;
			transform: none !important;
		}
	}
</style>
