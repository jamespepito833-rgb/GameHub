<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let date = $state(new Date().toISOString().slice(0, 10));
	let startTime = $state('10:00');
	let duration = $state(60);
	let tables = $state<any[]>([]);
	let loading = $state(false);
	let err = $state('');
	let hasChecked = $state(false);

	let activeBtn: string | null = $state(null);

	async function check() {
		loading = true;
		err = '';
		hasChecked = true;
		try {
			const res = await fetch(`/api/tables/availability?date=${date}&startTime=${startTime}&duration=${duration}`);
			const j = await res.json();
			if (!res.ok) {
				err = j.error?.message ?? 'Failed to check availability';
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

	$effect(() => {
		check();
	});
</script>

<svelte:head>
	<title>Tables — GameHub</title>
</svelte:head>

<!-- Customer nav: Tables/Rates/Reserve only, translucent, no staff -->
<nav class="nav">
	<div class="nav-inner">
		<a href="/" class="brand" aria-label="GameHub home">
			<span class="brand-mark" aria-hidden="true"><span class="ball">8</span></span>
			<span class="brand-text">GameHub</span>
			<span class="brand-dot">•</span>
			<span class="brand-sub">Billiard Hall</span>
		</a>
		<div class="nav-links" role="navigation" aria-label="Primary">
			<a href="/tables" class="nav-link" aria-current="page">Tables</a>
			<a href="/rates" class="nav-link">Rates</a>
			<a href="/reserve" class="nav-link">Reserve</a>
		</div>
		<ThemeToggle />
	</div>
	<div class="nav-hairline" aria-hidden="true"></div>
</nav>

<section class="hero-mini">
	<div class="hero-mini-inner">
		<p class="kicker">Find Your Felt</p>
		<h1>Available Tables</h1>
		<p class="sub">Eight tournament tables. Check a slot — we respect the 10-minute buffer and your 7-day window.</p>
	</div>
</section>

<section class="panel">
	<form class="controls" onsubmit={(e) => { e.preventDefault(); check(); }}>
		<label class="field">
			<span>Date</span>
			<input type="date" bind:value={date} required />
		</label>
		<label class="field">
			<span>Start</span>
			<input type="time" bind:value={startTime} required />
		</label>
		<label class="field">
			<span>Duration</span>
			<select bind:value={duration}>
				<option value={30}>30 min</option>
				<option value={60}>60 min</option>
				<option value={90}>90 min</option>
				<option value={120}>2 hours</option>
				<option value={180}>3 hours</option>
			</select>
		</label>
		<button
			type="submit"
			class="btn btn-primary"
			disabled={loading}
			data-active={activeBtn === 'check'}
			onpointerdown={() => (activeBtn = 'check')}
			onpointerup={() => (activeBtn = null)}
			onpointerleave={() => (activeBtn = null)}
		>
			{loading ? 'Checking…' : 'Check Availability'}
		</button>
		<a href="/reserve" class="btn btn-ghost" data-active={activeBtn === 'reserve'} onpointerdown={() => (activeBtn = 'reserve')} onpointerup={() => (activeBtn = null)} onpointerleave={() => (activeBtn = null)}>Reserve →</a>
	</form>
	{#if err}<div class="alert alert-error">{err}</div>{/if}
	{#if hasChecked && !err && tables.length}
		<p class="result-meta">{tables.filter((t) => t.isAvailable).length} of {tables.length} available for {date} at {startTime} • {duration} min</p>
	{/if}
</section>

<div class="grid">
	{#each tables as t}
		<article
			class="tcard"
			data-available={t.isAvailable}
			style="--status: {t.isAvailable === false ? '#c62828' : t.isAvailable ? '#2ad27a' : '#8b6f47'}"
		>
			<div class="tcard-rail" aria-hidden="true"></div>
			<header class="tcard-head">
				<h3>{t.name}</h3>
				<span class="badge" data-state={t.isAvailable === false ? 'busy' : t.isAvailable ? 'free' : 'neutral'}>
					{#if t.isAvailable === true}Available{:else if t.isAvailable === false}{t.reason ?? 'Unavailable'}{:else}{t.status}{/if}
				</span>
			</header>
			<div class="tcard-felt" aria-hidden="true">
				<span class="felt-dot"></span>
				<span class="felt-dot"></span>
				<span class="felt-dot"></span>
			</div>
			<div class="tcard-foot">
				<span class="tcard-id">#{t._id.slice(-4)}</span>
				<span class="tcard-status">{t.status}</span>
				{#if t.isAvailable}
					<a href="/reserve" class="tcard-action">Reserve this →</a>
				{:else if t.isAvailable === false}
					<span class="tcard-hint">{t.reason === 'OCCUPIED' ? 'In play' : t.reason === 'RESERVED' ? 'Reserved' : 'Unavailable'}</span>
				{/if}
			</div>
		</article>
	{/each}
</div>

{#if !loading && hasChecked && tables.length === 0 && !err}
	<div class="empty">No tables found for this slot. Try a different time.</div>
{/if}

<p class="foot">
	<small>Buffer 10 min • Max 7 days • Hours 09:00–02:00 • <a href="/rates">Rates</a> • <a href="/">Home</a></small>
</p>

<style>
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font: 100%/1.5 system-ui, -apple-system, sans-serif;
		-webkit-font-smoothing: antialiased;
	}
	.nav {
		position: sticky;
		top: 0;
		z-index: 20;
		background: rgba(18, 18, 18, 0.62);
		backdrop-filter: blur(20px) saturate(160%);
		-webkit-backdrop-filter: blur(20px) saturate(160%);
	}
	.nav-inner {
		width: min(1120px, calc(100% - 32px));
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
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
		font-size: 11px;
		font-weight: 800;
		background: #0b0b0b;
		color: #fff;
		border: 1.5px solid #fff;
	}
	.brand-text {
		font-weight: 750;
		letter-spacing: -0.02em;
	}
	.brand-dot {
		opacity: 0.5;
	}
	.brand-sub {
		font-size: 0.82rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		opacity: 0.72;
	}
	@media (max-width: 640px) {
		.brand-sub {
			display: none;
		}
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
		font-size: 0.9rem;
		padding: 8px 12px;
		border-radius: 999px;
	}
	.nav-link[aria-current='page'] {
		background: rgba(245, 241, 232, 0.1);
		color: #fff;
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
		line-height: 0.95;
		font-weight: 850;
	}
	.hero-mini .sub {
		margin: 8px 0 0;
		color: rgba(245, 241, 232, 0.72);
		max-width: 60ch;
		line-height: 1.6;
	}
	.panel {
		width: min(1120px, calc(100% - 32px));
		margin: 16px auto 0;
		background: #141414;
		border: 1px solid rgba(245, 241, 232, 0.08);
		border-radius: 18px;
		padding: 16px;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
	}
	@media (min-width: 880px) {
		.panel {
			width: min(1120px, calc(100% - 48px));
		}
	}
	.controls {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: end;
	}
	.field {
		display: grid;
		gap: 4px;
		font-size: 0.82rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(245, 241, 232, 0.72);
	}
	.field input,
	.field select {
		background: #0f0f0f;
		color: var(--text);
		border: 1px solid rgba(245, 241, 232, 0.14);
		border-radius: 12px;
		padding: 10px 12px;
		font-size: 0.95rem;
		min-width: 140px;
	}
	.field input:focus,
	.field select:focus {
		outline: 2px solid rgba(212, 175, 55, 0.5);
		outline-offset: 2px;
		border-color: rgba(212, 175, 55, 0.35);
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 11px 16px;
		border-radius: 999px;
		font-weight: 700;
		text-decoration: none;
		border: 1px solid transparent;
		cursor: pointer;
		transition:
			transform 100ms ease-out,
			background 160ms ease,
			border-color 160ms ease;
		will-change: transform;
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
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.btn-ghost {
		background: rgba(245, 241, 232, 0.08);
		color: var(--text);
		border-color: rgba(245, 241, 232, 0.14);
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
	.result-meta {
		margin: 12px 0 0;
		font-size: 0.85rem;
		color: rgba(245, 241, 232, 0.72);
	}
	.grid {
		width: min(1120px, calc(100% - 32px));
		margin: 16px auto 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 16px;
	}
	@media (min-width: 880px) {
		.grid {
			width: min(1120px, calc(100% - 48px));
		}
	}
	.tcard {
		position: relative;
		background: #141414;
		border: 1px solid rgba(245, 241, 232, 0.08);
		border-radius: 18px;
		padding: 14px 14px 12px;
		overflow: clip;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}
	.tcard:hover {
		transform: translateY(-2px);
		border-color: rgba(245, 241, 232, 0.14);
	}
	@media (prefers-reduced-motion: reduce) {
		.tcard {
			transition: none;
		}
		.tcard:hover {
			transform: none;
		}
	}
	.tcard-rail {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 4px;
		background: var(--status);
		opacity: 0.95;
	}
	.tcard-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.tcard-head h3 {
		margin: 0;
		letter-spacing: -0.015em;
		font-size: 1.05rem;
	}
	.badge {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid;
		white-space: nowrap;
	}
	.badge[data-state='free'] {
		background: rgba(42, 210, 122, 0.14);
		border-color: rgba(42, 210, 122, 0.28);
		color: #b7f5d6;
	}
	.badge[data-state='busy'] {
		background: rgba(198, 40, 40, 0.14);
		border-color: rgba(198, 40, 40, 0.28);
		color: #ffb4b4;
	}
	.badge[data-state='neutral'] {
		background: rgba(245, 241, 232, 0.08);
		border-color: rgba(245, 241, 232, 0.14);
		color: rgba(245, 241, 232, 0.72);
	}
	.tcard-felt {
		margin-top: 10px;
		height: 72px;
		border-radius: 12px;
		background: radial-gradient(420px 260px at 30% 30%, #1b7a4b 0%, #0e3d2d 62%, #0a2a1f 100%);
		border: 8px solid #3c2415;
		box-shadow: inset 0 0 0 1px rgba(212, 175, 55, 0.18);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}
	.felt-dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		background: #fff;
		border: 1px solid rgba(0, 0, 0, 0.2);
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
		opacity: 0.95;
	}
	.felt-dot:nth-child(2) {
		background: #0b0b0b;
		border-color: #fff;
	}
	.felt-dot:nth-child(3) {
		background: #f5d547;
		border-color: #fff;
	}
	.tcard-foot {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
		font-size: 0.82rem;
		color: rgba(245, 241, 232, 0.62);
		flex-wrap: wrap;
	}
	.tcard-id {
		font-variant-numeric: tabular-nums;
	}
	.tcard-status {
		margin-left: auto;
		opacity: 0.7;
	}
	.tcard-action {
		margin-left: auto;
		color: var(--text);
		text-decoration: none;
		font-weight: 650;
		border-bottom: 1px solid rgba(245, 241, 232, 0.18);
		padding-bottom: 1px;
	}
	.tcard-hint {
		margin-left: auto;
		color: #ffb4b4;
		font-weight: 600;
	}
	.empty {
		width: min(1120px, calc(100% - 32px));
		margin: 16px auto 0;
		padding: 16px;
		border-radius: 12px;
		background: #141414;
		border: 1px solid rgba(245, 241, 232, 0.08);
		color: rgba(245, 241, 232, 0.72);
	}
	@media (min-width: 880px) {
		.empty {
			width: min(1120px, calc(100% - 48px));
		}
	}
	.foot {
		width: min(1120px, calc(100% - 32px));
		margin: 16px auto 24px;
		color: rgba(245, 241, 232, 0.62);
	}
	@media (min-width: 880px) {
		.foot {
			width: min(1120px, calc(100% - 48px));
		}
	}
	.foot a {
		color: var(--text);
	}
	@media (prefers-reduced-motion: reduce) {
		.btn {
			transition: opacity 200ms ease !important;
			transform: none !important;
		}
	}
</style>

