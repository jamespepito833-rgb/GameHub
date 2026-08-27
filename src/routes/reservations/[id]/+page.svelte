<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	let id = $state('');
	let contact = $state('');
	let reservation: any = $state(null);
	let err = $state('');
	let msg = $state('');
	let activeBtn: string | null = $state(null);

	$effect(() => {
		const url = new URL(window.location.href);
		const parts = url.pathname.split('/');
		id = parts[2] ?? '';
		contact = url.searchParams.get('contact') ?? '';
		if (id && contact) load();
	});

	async function load() {
		err = '';
		msg = '';
		const res = await fetch(`/api/reservations/${id}?contact=${encodeURIComponent(contact)}`);
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Failed';
			reservation = null;
			return;
		}
		reservation = j.data.reservation;
	}

	async function cancel() {
		if (!confirm('Cancel this reservation? This cannot be undone.')) return;
		err = '';
		msg = '';
		const res = await fetch(`/api/reservations/${id}/cancel`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ contact })
		});
		const j = await res.json();
		if (!res.ok) {
			err = j.error?.message ?? 'Cancel failed';
			return;
		}
		msg = 'Cancelled — slot freed.';
		reservation = j.data.reservation;
	}
</script>

<svelte:head>
	<title>Reservation — GameHub</title>
</svelte:head>

<nav class="nav">
	<div class="nav-inner">
		<a href="/" class="brand"><span class="brand-mark"><span class="ball">8</span></span><span class="brand-text">GameHub</span></a>
		<div class="nav-links">
			<a href="/tables" class="nav-link">Tables</a>
			<a href="/rates" class="nav-link">Rates</a>
			<a href="/reserve" class="nav-link">Reserve</a>
		</div>
		<ThemeToggle />
	</div>
	<div class="nav-hairline"></div>
</nav>

<header class="hero-mini">
	<div class="hero-mini-inner">
		<p class="kicker">Confirmation</p>
		<h1>Reservation</h1>
		<p class="sub">Bring your contact number to check in. Grace 15 min • Buffer 10 min.</p>
	</div>
</header>

<section class="panel">
	<form onsubmit={(e) => { e.preventDefault(); load(); }} class="lookup">
		<label class="field">
			<span>Reservation ID</span>
			<input bind:value={id} placeholder="e.g. 64a..." required />
		</label>
		<label class="field">
			<span>Contact</span>
			<input bind:value={contact} placeholder="09xxxxxxxxx" required />
		</label>
		<button
			type="submit"
			class="btn btn-ghost"
			data-active={activeBtn === 'view'}
			onpointerdown={() => (activeBtn = 'view')}
			onpointerup={() => (activeBtn = null)}
			onpointerleave={() => (activeBtn = null)}
		>
			View
		</button>
	</form>

	{#if err}<div class="alert alert-error">{err}</div>{/if}
	{#if msg}<div class="alert alert-ok">{msg}</div>{/if}

	{#if reservation}
		<article class="ticket">
			<header class="ticket-head">
				<div class="ticket-felt" aria-hidden="true"></div>
				<div class="ticket-head-inner">
					<span class="ticket-id">#{reservation._id.slice(-6)}</span>
					<span class="badge" data-status={reservation.status}>{reservation.status}</span>
				</div>
			</header>

			<div class="ticket-body">
				<div class="ticket-row">
					<span>Table</span>
					<strong>{reservation.tableName ?? reservation.tableId.slice(-4)}</strong>
				</div>
				<div class="ticket-row">
					<span>Date</span>
					<strong>{reservation.date}</strong>
				</div>
				<div class="ticket-row">
					<span>Time</span>
					<strong>{new Date(reservation.startTime).toLocaleString()} — {new Date(reservation.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {reservation.durationMinutes} min</strong>
				</div>
				<div class="ticket-divider"></div>
				<div class="ticket-row">
					<span>Guest</span>
					<strong>{reservation.customerName}</strong>
				</div>
				<div class="ticket-row">
					<span>Contact</span>
					<strong>{reservation.customerContact}</strong>
				</div>
				<div class="ticket-row">
					<span>Rate</span>
					<strong>₱{reservation.pricingSnapshot?.ratePerHour}/hr</strong>
				</div>
			</div>

			<footer class="ticket-foot">
				{#if reservation.status === 'CONFIRMED'}
					<button
						class="btn btn-danger"
						onclick={cancel}
						data-active={activeBtn === 'cancel'}
						onpointerdown={() => (activeBtn = 'cancel')}
						onpointerup={() => (activeBtn = null)}
						onpointerleave={() => (activeBtn = null)}
					>
						Cancel Reservation
					</button>
					<span class="foot-hint">Free cancellation before start time</span>
				{:else}
					<span class="foot-hint">Status: {reservation.status} — ask at desk for help.</span>
				{/if}
			</footer>
		</article>
	{/if}
</section>

<p class="foot"><small><a href="/reserve">New Reservation</a> • <a href="/">Home</a></small></p>

<style>
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
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
	.nav-link:hover {
		background: rgba(255, 255, 255, 0.08);
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
	.lookup {
		display: grid;
		grid-template-columns: 1fr 180px auto;
		gap: 10px;
		align-items: end;
	}
	@media (max-width: 720px) {
		.lookup {
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
	.field input {
		background: #0f0f0f;
		color: var(--text);
		border: 1px solid rgba(245, 241, 232, 0.14);
		border-radius: 12px;
		padding: 11px 12px;
		font-size: 0.95rem;
	}
	.field input:focus {
		outline: 2px solid rgba(212, 175, 55, 0.5);
		outline-offset: 2px;
	}
	.btn {
		display: inline-flex;
		padding: 11px 16px;
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
	.btn-ghost {
		background: rgba(245, 241, 232, 0.08);
		color: var(--text);
		border-color: rgba(245, 241, 232, 0.14);
	}
	.btn-danger {
		background: #2a1214;
		color: #ffb4b4;
		border-color: rgba(255, 80, 80, 0.32);
		padding: 10px 14px;
		border-radius: 999px;
		font-weight: 700;
		cursor: pointer;
	}
	.alert {
		margin-top: 12px;
		padding: 10px 12px;
		border-radius: 12px;
		font-size: 0.9rem;
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
	}
	.ticket {
		margin-top: 16px;
		border-radius: 16px;
		overflow: clip;
		border: 1px solid rgba(245, 241, 232, 0.08);
		background: #0f0f0f;
		max-width: 560px;
	}
	.ticket-head {
		position: relative;
		padding: 14px 16px;
		background: #0e1a14;
		border-bottom: 1px solid rgba(212, 175, 55, 0.18);
		overflow: clip;
	}
	.ticket-felt {
		position: absolute;
		inset: 0;
		background: radial-gradient(500px 260px at 30% 30%, #1b7a4b 0%, #0e3d2d 62%, #0a2a1f 100%);
		opacity: 0.22;
	}
	.ticket-head-inner {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.ticket-id {
		font-weight: 800;
		letter-spacing: 0.04em;
	}
	.badge {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid;
	}
	.badge[data-status='CONFIRMED'] {
		background: rgba(42, 210, 122, 0.14);
		border-color: rgba(42, 210, 122, 0.28);
		color: #b7f5d6;
	}
	.badge[data-status='CANCELLED'] {
		background: rgba(255, 80, 80, 0.14);
		border-color: rgba(255, 80, 80, 0.28);
		color: #ffb4b4;
	}
	.badge[data-status='CHECKED_IN'] {
		background: rgba(212, 175, 55, 0.14);
		border-color: rgba(212, 175, 55, 0.28);
		color: var(--text);
	}
	.ticket-body {
		padding: 14px 16px;
		display: grid;
		gap: 8px;
	}
	.ticket-row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: 0.93rem;
	}
	.ticket-row span {
		color: rgba(245, 241, 232, 0.62);
	}
	.ticket-divider {
		height: 1px;
		background: rgba(245, 241, 232, 0.08);
		margin: 4px 0;
	}
	.ticket-foot {
		padding: 12px 16px;
		background: #141414;
		border-top: 1px solid rgba(245, 241, 232, 0.06);
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.foot-hint {
		font-size: 0.85rem;
		color: rgba(245, 241, 232, 0.62);
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

