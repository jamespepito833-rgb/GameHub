<script lang="ts">
	import { onMount } from 'svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	let pricing: any = $state(null);
	let err = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/pricing/current');
			const j = await res.json();
			if (res.ok) pricing = j.data.pricing;
			else err = j.error?.message ?? 'No pricing';
		} catch (e) {
			err = (e as Error).message;
		}
	});
</script>

<svelte:head>
	<title>Rates — GameHub</title>
</svelte:head>

<nav class="nav">
	<div class="nav-inner">
		<a href="/" class="brand"><span class="brand-mark"><span class="ball">8</span></span><span class="brand-text">GameHub</span></a>
		<div class="nav-links">
			<a href="/tables" class="nav-link">Tables</a>
			<a href="/rates" class="nav-link" aria-current="page">Rates</a>
			<a href="/reserve" class="nav-link">Reserve</a>
		</div>
		<ThemeToggle />
	</div>
	<div class="nav-hairline"></div>
</nav>

<section class="hero-mini">
	<div class="hero-mini-inner">
		<p class="kicker">Simple & Fair</p>
		<h1>Rates</h1>
		<p class="sub">Flat hourly. Per-minute ceil. What you see is what you pay — snapshot preserved when you reserve.</p>
	</div>
</section>

<section class="panel">
	{#if err}<div class="alert alert-error">{err}</div>{/if}
	{#if pricing}
		<div class="price-card">
			<div class="price-main">
				<div class="price-amount">₱{pricing.ratePerHour}<span>/hour</span></div>
				<div class="price-meta">Effective {new Date(pricing.effectiveFrom).toLocaleDateString()} • Per-minute</div>
			</div>
			<div class="price-divider"></div>
			<ul class="price-points">
				<li>Pay only for minutes you play — <code>ceil((endedAt-startedAt)/60000)</code></li>
				<li>Orders added to same bill — one receipt</li>
				<li>Historical rate locked at reservation</li>
			</ul>
		</div>
		<div class="price-actions">
			<a href="/tables" class="btn btn-ghost">Check Tables</a>
			<a href="/reserve" class="btn btn-primary">Reserve Now</a>
		</div>
	{:else if !err}
		<p>Loading…</p>
	{/if}
</section>

<p class="foot"><small><a href="/">Home</a> • 09:00–02:00 • No per-second DB writes</small></p>

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
	.alert-error {
		background: #2a1214;
		border: 1px solid rgba(255, 80, 80, 0.25);
		color: #ffb4b4;
		padding: 10px 12px;
		border-radius: 12px;
	}
	.price-card {
		display: grid;
		grid-template-columns: 1fr auto 1.2fr;
		gap: 18px;
		align-items: center;
		background: #0f0f0f;
		border: 1px solid rgba(212, 175, 55, 0.18);
		border-radius: 16px;
		padding: 18px;
	}
	@media (max-width: 720px) {
		.price-card {
			grid-template-columns: 1fr;
		}
		.price-divider {
			display: none;
		}
	}
	.price-amount {
		font-size: clamp(2rem, 5vw, 2.8rem);
		font-weight: 850;
		letter-spacing: -0.03em;
		line-height: 1;
	}
	.price-amount span {
		font-size: 1rem;
		font-weight: 600;
		opacity: 0.72;
		letter-spacing: 0.02em;
	}
	.price-meta {
		font-size: 0.85rem;
		color: rgba(245, 241, 232, 0.62);
		margin-top: 4px;
	}
	.price-divider {
		width: 1px;
		align-self: stretch;
		background: rgba(245, 241, 232, 0.1);
	}
	.price-points {
		margin: 0;
		padding-left: 18px;
		color: rgba(245, 241, 232, 0.82);
		line-height: 1.6;
		font-size: 0.93rem;
	}
	.price-points code {
		background: rgba(245, 241, 232, 0.08);
		padding: 1px 6px;
		border-radius: 6px;
		font-size: 0.82rem;
	}
	.price-actions {
		display: flex;
		gap: 10px;
		margin-top: 14px;
		justify-content: flex-end;
	}
	.btn {
		display: inline-flex;
		padding: 11px 16px;
		border-radius: 999px;
		font-weight: 700;
		text-decoration: none;
		border: 1px solid transparent;
		transition: transform 100ms ease-out;
	}
	.btn:active {
		transform: scale(0.97);
	}
	.btn-primary {
		background: #f5f1e8;
		color: #0a0a0a;
	}
	.btn-ghost {
		background: rgba(245, 241, 232, 0.08);
		color: var(--text);
		border-color: rgba(245, 241, 232, 0.14);
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
</style>

