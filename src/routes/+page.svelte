<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';

	// Subtle parallax for hero felt
	let mouseX = spring(0, { stiffness: 0.08, damping: 0.9 });
	let mouseY = spring(0, { stiffness: 0.08, damping: 0.9 });
	let heroRef: HTMLElement;

	let pricing: any = $state(null);
	onMount(async () => {
		try {
			const res = await fetch('/api/pricing/current');
			const j = await res.json();
			if (res.ok) pricing = j.data.pricing;
		} catch {}
	});

	function handleHeroMove(e: MouseEvent) {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const rect = heroRef?.getBoundingClientRect();
		if (!rect) return;
		const x = (e.clientX - rect.left) / rect.width - 0.5;
		const y = (e.clientY - rect.top) / rect.height - 0.5;
		mouseX.set(x * 12);
		mouseY.set(y * 8);
	}
	function resetHero() {
		mouseX.set(0);
		mouseY.set(0);
	}

	// Press feedback
	let activeBtn: string | null = $state(null);
</script>

<svelte:head>
	<title>GameHub — Premium Billiard Hall</title>
	<meta name="description" content="Premium billiard hall in Bukidnon — reserve tables, track time, order drinks. Dark, elegant, open 09:00–02:00." />
</svelte:head>

<!-- NAV: translucent material, floats over hero, content scrolls under -->
<nav class="nav">
	<div class="nav-inner">
		<a href="/" class="brand" aria-label="GameHub home">
			<span class="brand-mark" aria-hidden="true">
				<span class="ball ball-8">8</span>
			</span>
			<span class="brand-text">GameHub</span>
			<span class="brand-dot">•</span>
			<span class="brand-sub">Billiard Hall</span>
		</a>

		<div class="nav-links" role="navigation" aria-label="Primary">
			<a href="/tables" class="nav-link">Tables</a>
			<a href="/rates" class="nav-link">Rates</a>
			<a href="/reserve" class="nav-link">Reserve</a>
		</div>

		<a href="/login" class="nav-cta" data-active={activeBtn === 'login'} onpointerdown={() => (activeBtn = 'login')} onpointerup={() => (activeBtn = null)} onpointerleave={() => (activeBtn = null)}>
			<span>Staff Login</span>
			<span class="cta-arrow" aria-hidden="true">→</span>
		</a>
	</div>
	<div class="nav-hairline" aria-hidden="true"></div>
</nav>

<!-- HERO: dark, felt-inspired, wood/gold accents, spatial origin from center -->
<section
	bind:this={heroRef}
	class="hero"
	onpointermove={handleHeroMove}
	onpointerleave={resetHero}
	aria-label="GameHub hero"
>
	<!-- Material layers: base + felt texture + vignette + wood rail -->
	<div class="hero-bg" aria-hidden="true">
		<div class="hero-felt" style="transform: translate3d({$mouseX * 0.6}px, {$mouseY * 0.6}px, 0);"></div>
		<div class="hero-vignette"></div>
		<div class="hero-wood"></div>
		<!-- Gold hairline at bottom of hero -->
		<div class="hero-goldline"></div>
		<!-- Subtle grain -->
		<div class="hero-grain"></div>
		<!-- Floating cue + balls hint -->
		<div class="hero-orb orb-1" style="transform: translate3d({$mouseX}px, {$mouseY}px, 0);"></div>
		<div class="hero-orb orb-2" style="transform: translate3d({$mouseX * -0.8}px, {$mouseY * -0.6}px, 0);"></div>
	</div>

	<div class="hero-content">
		<p class="eyebrow">Bukidnon • Est. 2024 • Open 09:00–02:00</p>
		<h1 class="display">
			<span class="display-line">Where</span>
			<span class="display-line display-accent">precision</span>
			<span class="display-line">meets play.</span>
		</h1>
		<p class="sub">
			Eight tournament-grade tables, warm wood, quiet light. Reserve in seconds, play without the clock in your head — we track it for you.
		</p>

		<div class="hero-actions">
			<a
				href="/reserve"
				class="btn btn-primary"
				data-active={activeBtn === 'reserve'}
				onpointerdown={() => (activeBtn = 'reserve')}
				onpointerup={() => (activeBtn = null)}
				onpointerleave={() => (activeBtn = null)}
			>
				<span class="btn-label">Reserve a Table</span>
				<span class="btn-meta">Guest • 30s</span>
			</a>
			<a
				href="/tables"
				class="btn btn-ghost"
				data-active={activeBtn === 'tables'}
				onpointerdown={() => (activeBtn = 'tables')}
				onpointerup={() => (activeBtn = null)}
				onpointerleave={() => (activeBtn = null)}
			>
				Check Availability
			</a>
		</div>

		<div class="hero-meta">
			<div class="meta-item">
				<span class="meta-num">8</span>
				<span class="meta-label">Tables • 9ft Tournament</span>
			</div>
			<div class="meta-divider" aria-hidden="true"></div>
			<div class="meta-item">
				<span class="meta-num">₱{pricing ? pricing.ratePerHour : '120'}</span>
				<span class="meta-label">/ hour • per-minute ceil</span>
			</div>
			<div class="meta-divider" aria-hidden="true"></div>
			<div class="meta-item">
				<span class="meta-num">02:00</span>
				<span class="meta-label">Close • Night owls welcome</span>
			</div>
		</div>
	</div>

	<!-- Scroll hint: hint in direction of gesture -->
	<a href="#experience" class="scroll-hint" aria-label="Scroll to experience">
		<span>Experience</span>
		<span class="hint-line" aria-hidden="true"><span class="hint-dot"></span></span>
	</a>
</section>

<!-- EXPERIENCE: 3 cards, grouping & mapping, material weight -->
<section id="experience" class="section experience">
	<header class="section-head">
		<p class="kicker">The Experience</p>
		<h2>Built for the love of the game.</h2>
		<p class="section-sub">Not an arcade. A room where the felt is fast, the light is quiet, and the only thing you track is your next shot.</p>
	</header>

	<div class="cards">
		<article class="card">
			<div class="card-icon" aria-hidden="true">
				<span class="icon-felt"></span>
			</div>
			<h3>Tour­nament Felt</h3>
			<p>Championship cloth, leveled weekly. Rails that answer, pockets that reward clean stroke.</p>
			<a href="/tables" class="card-link">View Tables <span aria-hidden="true">↗</span></a>
		</article>
		<article class="card card-featured">
			<div class="card-icon" aria-hidden="true">
				<span class="icon-clock"></span>
			</div>
			<h3>Time, Handled</h3>
			<p>Start, extend, and settle without watching the clock. Per-minute billing, snapshot pricing, clear receipts.</p>
			<a href="/reserve" class="card-link">Reserve Now <span aria-hidden="true">↗</span></a>
		</article>
		<article class="card">
			<div class="card-icon" aria-hidden="true">
				<span class="icon-glass"></span>
			</div>
			<h3>Stay & Sip</h3>
			<p>Ice-cold drinks and bites, fired to your table. Order once, pay together.</p>
			<a href="/rates" class="card-link">See Rates <span aria-hidden="true">↗</span></a>
		</article>
	</div>
</section>

<!-- HOW IT WORKS: spatial consistency, symmetric, anchored -->
<section class="section steps">
	<header class="section-head">
		<p class="kicker">How It Works</p>
		<h2>Three shots to play.</h2>
	</header>
	<ol class="steps-grid">
		<li class="step">
			<span class="step-no">01</span>
			<h3>Check & Reserve</h3>
			<p>Pick a table, date, and start time. Guest checkout — name + <code>09…</code> — in under a minute.</p>
			<div class="step-foot">
				<span class="step-hint">Buffer 10 min • 7-day window</span>
				<a href="/reserve" class="step-link">Reserve →</a>
			</div>
		</li>
		<li class="step">
			<span class="step-no">02</span>
			<h3>Arrive & Play</h3>
			<p>Cashier checks you in, starts the timer. Felt time appears — no per-second writes, just <code>startedAt</code>.</p>
			<div class="step-foot">
				<span class="step-hint">Extend anytime before pay</span>
				<span class="step-soon">Queue if full</span>
			</div>
		</li>
		<li class="step">
			<span class="step-no">03</span>
			<h3>Order & Settle</h3>
			<p>Add drinks to the same session. One bill: table time + orders. Cash or GCash, change handled.</p>
			<div class="step-foot">
				<span class="step-hint">Snapshot pricing preserved</span>
				<a href="/rates" class="step-link">Rates →</a>
			</div>
		</li>
	</ol>
</section>

<!-- RAIL: wood/gold, translucency demo -->
<section class="rail">
	<div class="rail-inner">
		<div class="rail-copy">
			<p class="kicker kicker-light">The Room</p>
			<h2>Low light. Warm wood.<br />Green that breathes.</h2>
			<p>We kept it dark so the felt could do the talking. Gold only where it earns it — rail, stitch, and the last ball before the break.</p>
			<div class="rail-actions">
				<a href="/tables" class="btn btn-wood">Explore Tables</a>
				<span class="rail-note">8 tables • 1 premium • 09:00–02:00</span>
			</div>
		</div>
		<div class="rail-visual" aria-hidden="true">
			<div class="rail-felt">
				<div class="rail-ball ball-1"></div>
				<div class="rail-ball ball-9"></div>
				<div class="rail-ball ball-8"></div>
				<div class="rail-cue"></div>
			</div>
			<div class="rail-label">Table 5 • 9ft • Simonis</div>
		</div>
	</div>
</section>

<!-- HOURS & LOCATION: grouping, wayfinding -->
<section class="section info">
	<div class="info-grid">
		<div class="info-card">
			<h3>Hours</h3>
			<p><strong>09:00 – 02:00</strong> daily</p>
			<p class="muted">Last reservation at 01:00. Walk-ins welcome — queue is FIFO, reservations win the next 30 min.</p>
		</div>
		<div class="info-card">
			<h3>Find Us</h3>
			<p>Bukidnon, Philippines</p>
			<p class="muted">Near city center • Parking at rear • Ask for GameHub at the desk.</p>
		</div>
		<div class="info-card">
			<h3>Contact</h3>
			<p>Reserve: <a href="/reserve">/reserve</a></p>
			<p class="muted">Staff: <a href="/login">/login</a> • Board: <a href="/board">/board</a></p>
		</div>
	</div>
</section>

<footer class="footer">
	<div class="footer-inner">
		<div class="footer-brand">
			<span class="brand-mark small" aria-hidden="true"><span class="ball ball-8">8</span></span>
			<span>GameHub</span>
			<span class="footer-copy">© 2026 • Crafted for players. No per-second DB writes.</span>
		</div>
		<nav class="footer-nav" aria-label="Footer">
			<a href="/tables">Tables</a>
			<a href="/rates">Rates</a>
			<a href="/reserve">Reserve</a>
			<a href="/admin/dashboard">Admin</a>
		</nav>
	</div>
</footer>

<style>
	/* ---------- Tokens: wood / felt / gold / ink ---------- */
	:global(:root) {
		color-scheme: dark;
	}
	:global(body) {
		margin: 0;
		background: #0a0a0a;
		color: #f5f1e8;
		font: 100%/1.5 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
		font-optical-sizing: auto;
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}
	/* Tighten tracking on large type, leave body near 0 — WWDC Details of UI Typography */
	.display,
	h2 {
		font-optical-sizing: auto;
	}

	/* Page container width */
	.nav-inner,
	.hero-content,
	.section,
	.rail-inner,
	.info-grid,
	.footer-inner {
		width: min(1120px, calc(100% - 32px));
		margin-inline: auto;
	}
	@media (min-width: 880px) {
		.nav-inner,
		.hero-content,
		.section,
		.rail-inner,
		.info-grid,
		.footer-inner {
			width: min(1120px, calc(100% - 48px));
		}
	}

	/* ---------- Nav: translucent material, content scrolls under ---------- */
	.nav {
		position: sticky;
		top: 0;
		z-index: 20;
		/* Material: blur + saturate + semi-transparent */
		background: rgba(18, 18, 18, 0.62);
		backdrop-filter: blur(20px) saturate(160%);
		-webkit-backdrop-filter: blur(20px) saturate(160%);
		/* Will-change hint for imminent motion */
		will-change: backdrop-filter;
	}
	.nav-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 0;
	}
	.nav-hairline {
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.35), transparent);
		opacity: 0.9;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
		min-width: 0;
	}
	.brand-mark {
		width: 32px;
		height: 32px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: radial-gradient(120% 120% at 30% 20%, #2a6b4a 0%, #0e3d2d 55%, #0a2a1f 100%);
		border: 1px solid rgba(212, 175, 55, 0.35);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.12) inset,
			0 6px 16px rgba(0, 0, 0, 0.45);
		flex: none;
	}
	.brand-mark.small {
		width: 24px;
		height: 24px;
	}
	.ball {
		width: 20px;
		height: 20px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1;
		color: #fff;
		background: #111;
		border: 1.5px solid #fff;
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
	}
	.ball-8 {
		background: #0b0b0b;
	}
	.ball-1 {
		background: #f5d547;
		color: #1a1a1a;
		border-color: #fff;
	}
	.ball-9 {
		background: #ffffff;
		color: #1a1a1a;
		border: 1.5px solid #d4af37;
	}
	.brand-text {
		font-weight: 750;
		letter-spacing: -0.02em;
		font-size: 1.05rem;
		line-height: 1;
	}
	.brand-dot {
		opacity: 0.5;
	}
	.brand-sub {
		font-size: 0.82rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		opacity: 0.72;
		white-space: nowrap;
	}
	@media (max-width: 640px) {
		.brand-sub {
			display: none;
		}
	}
	.nav-links {
		display: flex;
		align-items: center;
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
		letter-spacing: 0.01em;
		padding: 8px 12px;
		border-radius: 999px;
		transition:
			background 160ms ease,
			color 160ms ease;
	}
	.nav-link:hover {
		color: #fff;
		background: rgba(255, 255, 255, 0.08);
	}
	.nav-link:focus-visible {
		outline: 2px solid rgba(212, 175, 55, 0.9);
		outline-offset: 2px;
	}
	.nav-cta {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 9px 14px;
		border-radius: 999px;
		background: #f5f1e8;
		color: #0a0a0a;
		text-decoration: none;
		font-weight: 650;
		font-size: 0.88rem;
		letter-spacing: 0.01em;
		border: 1px solid rgba(212, 175, 55, 0.18);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
		/* Press is instant, on pointer-down */
		transition:
			transform 100ms ease-out,
			background 160ms ease,
			box-shadow 160ms ease;
	}
	.nav-cta:hover {
		background: #fff;
	}
	.nav-cta:active,
	.nav-cta[data-active='true'] {
		transform: scale(0.97);
	}
	.nav-cta:focus-visible {
		outline: 2px solid rgba(212, 175, 55, 0.9);
		outline-offset: 2px;
	}
	.cta-arrow {
		opacity: 0.7;
	}

	/* ---------- Hero ---------- */
	.hero {
		position: relative;
		overflow: clip;
		min-height: min(78vh, 760px);
		display: grid;
		align-items: end;
		padding: 32px 0 28px;
		isolation: isolate;
	}
	.hero-bg {
		position: absolute;
		inset: 0;
		z-index: -1;
		background: #0a0a0a;
		overflow: clip;
	}
	.hero-felt {
		position: absolute;
		inset: -12% -8% -18% -8%;
		background:
			radial-gradient(900px 520px at 38% 28%, rgba(27, 122, 75, 0.95) 0%, rgba(14, 61, 45, 1) 42%, rgba(6, 24, 18, 1) 72%),
			radial-gradient(700px 420px at 82% 78%, rgba(212, 175, 55, 0.13) 0%, transparent 60%),
			linear-gradient(180deg, #0e3d2d 0%, #0a2a1f 100%);
		/* Subtle felt weave hint */
		opacity: 1;
		will-change: transform;
		transition: transform 180ms ease-out;
	}
	@media (prefers-reduced-motion: reduce) {
		.hero-felt {
			transition: none;
		}
	}
	.hero-felt::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
		background-size:
			22px 22px,
			22px 22px;
		mix-blend-mode: overlay;
		opacity: 0.35;
	}
	.hero-vignette {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(1200px 700px at 50% 38%, transparent 42%, rgba(0, 0, 0, 0.55) 88%),
			linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0.62) 100%);
	}
	.hero-wood {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 14px;
		background:
			linear-gradient(180deg, rgba(60, 36, 21, 1) 0%, rgba(44, 26, 15, 1) 100%),
			repeating-linear-gradient(90deg, rgba(139, 111, 71, 0.18) 0 1px, transparent 1px 28px);
		border-top: 1px solid rgba(212, 175, 55, 0.22);
		box-shadow: 0 -8px 18px rgba(0, 0, 0, 0.45);
	}
	.hero-goldline {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 14px;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.55), transparent);
	}
	.hero-grain {
		position: absolute;
		inset: 0;
		opacity: 0.08;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
		mix-blend-mode: soft-light;
		pointer-events: none;
	}
	.hero-orb {
		position: absolute;
		border-radius: 999px;
		filter: blur(18px);
		opacity: 0.22;
		will-change: transform;
		transition: transform 220ms ease-out;
		pointer-events: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.hero-orb {
			transition: none;
		}
	}
	.orb-1 {
		width: 360px;
		height: 360px;
		right: -40px;
		top: 8%;
		background: radial-gradient(circle at 30% 30%, #2ad27a 0%, #0e3d2d 58%, transparent 72%);
	}
	.orb-2 {
		width: 420px;
		height: 420px;
		left: -80px;
		bottom: -60px;
		background: radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.9) 0%, rgba(212, 175, 55, 0) 62%);
		opacity: 0.16;
	}

	.hero-content {
		padding: 40px 0 8px;
	}
	.eyebrow {
		margin: 0 0 14px;
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(245, 241, 232, 0.72);
	}
	.display {
		margin: 0;
		font-size: clamp(2.4rem, 6vw, 4.6rem);
		line-height: 0.92;
		letter-spacing: -0.04em;
		font-weight: 860;
		max-width: 14ch;
	}
	.display-line {
		display: block;
	}
	.display-accent {
		color: #2ad27a;
		/* Gold underline hint */
		background: linear-gradient(90deg, rgba(212, 175, 55, 0) 0%, rgba(212, 175, 55, 0.22) 100%);
		-webkit-background-clip: text;
		background-clip: text;
	}
	.sub {
		margin: 16px 0 0;
		max-width: 56ch;
		font-size: clamp(1rem, 1.8vw, 1.12rem);
		line-height: 1.55;
		color: rgba(245, 241, 232, 0.82);
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 28px;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 14px 18px;
		border-radius: 999px;
		text-decoration: none;
		font-weight: 700;
		letter-spacing: 0.01em;
		line-height: 1;
		border: 1px solid transparent;
		min-width: 0;
		/* Instant press */
		transition:
			transform 100ms ease-out,
			background 160ms ease,
			border-color 160ms ease,
			box-shadow 160ms ease,
			opacity 160ms ease;
		will-change: transform;
	}
	.btn:active,
	.btn[data-active='true'] {
		transform: scale(0.97);
	}
	.btn:focus-visible {
		outline: 2px solid rgba(212, 175, 55, 0.95);
		outline-offset: 2px;
	}
	.btn-primary {
		background: #f5f1e8;
		color: #0a0a0a;
		border-color: rgba(212, 175, 55, 0.2);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.85) inset,
			0 10px 24px rgba(0, 0, 0, 0.35);
	}
	.btn-primary:hover {
		background: #ffffff;
	}
	.btn-meta {
		opacity: 0.62;
		font-weight: 600;
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		border-left: 1px solid rgba(10, 10, 10, 0.12);
		padding-left: 10px;
		margin-left: 2px;
	}
	.btn-ghost {
		background: rgba(245, 241, 232, 0.08);
		color: #f5f1e8;
		border-color: rgba(245, 241, 232, 0.14);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
	.btn-ghost:hover {
		background: rgba(245, 241, 232, 0.14);
		border-color: rgba(245, 241, 232, 0.22);
	}

	.hero-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 20px;
		margin-top: 28px;
		padding: 14px 16px;
		border-radius: 16px;
		background: rgba(18, 18, 18, 0.42);
		border: 1px solid rgba(245, 241, 232, 0.08);
		backdrop-filter: blur(16px) saturate(140%);
		-webkit-backdrop-filter: blur(16px) saturate(140%);
		width: fit-content;
		max-width: 100%;
	}
	.meta-item {
		display: grid;
		gap: 1px;
		min-width: 0;
	}
	.meta-num {
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1;
		font-size: 1.05rem;
	}
	.meta-label {
		font-size: 0.78rem;
		letter-spacing: 0.02em;
		color: rgba(245, 241, 232, 0.72);
		white-space: nowrap;
	}
	.meta-divider {
		width: 1px;
		align-self: stretch;
		background: rgba(245, 241, 232, 0.12);
	}
	@media (max-width: 560px) {
		.hero-meta {
			width: 100%;
			justify-content: space-between;
		}
		.meta-divider {
			display: none;
		}
	}

	.scroll-hint {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		margin-top: 22px;
		color: rgba(245, 241, 232, 0.72);
		text-decoration: none;
		font-size: 0.74rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.scroll-hint:hover {
		color: #f5f1e8;
	}
	.hint-line {
		width: 1px;
		height: 28px;
		background: rgba(245, 241, 232, 0.18);
		display: grid;
		place-items: start center;
		overflow: clip;
		border-radius: 999px;
	}
	.hint-dot {
		width: 4px;
		height: 8px;
		border-radius: 999px;
		background: #f5f1e8;
		animation: hint 1.8s ease-in-out infinite;
	}
	@media (prefers-reduced-motion: reduce) {
		.hint-dot {
			animation: none;
		}
	}
	@keyframes hint {
		0% {
			transform: translateY(-6px);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		100% {
			transform: translateY(16px);
			opacity: 0;
		}
	}

	/* ---------- Sections ---------- */
	.section {
		padding: 56px 0;
	}
	@media (min-width: 960px) {
		.section {
			padding: 72px 0;
		}
	}
	.kicker {
		margin: 0 0 8px;
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #2ad27a;
		font-weight: 700;
	}
	.kicker-light {
		color: rgba(245, 241, 232, 0.72);
	}
	.section-head {
		max-width: 680px;
		margin-bottom: 28px;
	}
	.section-head h2 {
		margin: 0;
		font-size: clamp(1.7rem, 3.4vw, 2.4rem);
		line-height: 0.98;
		letter-spacing: -0.03em;
		font-weight: 800;
		color: #f5f1e8;
	}
	.section-sub {
		margin: 10px 0 0;
		color: rgba(245, 241, 232, 0.72);
		line-height: 1.6;
		max-width: 60ch;
	}

	/* Cards: material weight, not stacked light-on-light */
	.cards {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
		align-items: start;
	}
	@media (max-width: 880px) {
		.cards {
			grid-template-columns: 1fr;
		}
	}
	.card {
		position: relative;
		padding: 20px 18px;
		border-radius: 18px;
		background: #141414;
		border: 1px solid rgba(245, 241, 232, 0.08);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.04) inset,
			0 10px 24px rgba(0, 0, 0, 0.35);
		/* Enter as material, not just fade */
		will-change: transform, opacity;
	}
	.card-featured {
		background: #0e1a14;
		border-color: rgba(42, 210, 122, 0.22);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.05) inset,
			0 14px 30px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(42, 210, 122, 0.08);
	}
	.card-icon {
		width: 36px;
		height: 36px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		background: rgba(245, 241, 232, 0.08);
		border: 1px solid rgba(245, 241, 232, 0.08);
		margin-bottom: 14px;
	}
	.card-featured .card-icon {
		background: rgba(42, 210, 122, 0.14);
		border-color: rgba(42, 210, 122, 0.18);
	}
	.icon-felt,
	.icon-clock,
	.icon-glass {
		width: 18px;
		height: 18px;
		border-radius: 4px;
		display: block;
	}
	.icon-felt {
		background: #0e3d2d;
		border: 1px solid rgba(42, 210, 122, 0.5);
		box-shadow: 0 0 0 4px rgba(42, 210, 122, 0.12);
	}
	.icon-clock {
		width: 16px;
		height: 16px;
		border-radius: 999px;
		border: 2px solid #f5f1e8;
		position: relative;
	}
	.icon-clock::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 6px;
		height: 6px;
		border-left: 2px solid #f5f1e8;
		border-bottom: 2px solid #f5f1e8;
		transform: translate(-2px, -4px) rotate(-45deg);
		border-radius: 1px;
	}
	.icon-glass {
		width: 14px;
		height: 18px;
		border-radius: 3px 3px 6px 6px;
		border: 1.5px solid #f5f1e8;
		position: relative;
	}
	.icon-glass::after {
		content: '';
		position: absolute;
		left: 2px;
		right: 2px;
		top: 3px;
		height: 4px;
		background: rgba(245, 241, 232, 0.9);
		border-radius: 2px;
	}
	.card h3 {
		margin: 0 0 6px;
		font-size: 1.05rem;
		letter-spacing: -0.015em;
		line-height: 1.2;
	}
	.card p {
		margin: 0;
		color: rgba(245, 241, 232, 0.72);
		line-height: 1.6;
		font-size: 0.93rem;
	}
	.card-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 14px;
		color: #f5f1e8;
		text-decoration: none;
		font-weight: 650;
		font-size: 0.9rem;
		border-bottom: 1px solid rgba(245, 241, 232, 0.18);
		padding-bottom: 2px;
	}
	.card-link:hover {
		border-color: rgba(245, 241, 232, 0.42);
	}
	.card {
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}
	.card:hover {
		transform: translateY(-2px);
		border-color: rgba(245, 241, 232, 0.12);
	}
	.card-featured:hover {
		border-color: rgba(42, 210, 122, 0.28);
	}
	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
		.card:hover {
			transform: none;
		}
	}

	/* Steps */
	.steps {
		padding-top: 8px;
	}
	.steps-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
		counter-reset: step;
	}
	@media (max-width: 880px) {
		.steps-grid {
			grid-template-columns: 1fr;
		}
	}
	.step {
		position: relative;
		padding: 18px 16px;
		border-radius: 16px;
		background: #141414;
		border: 1px solid rgba(245, 241, 232, 0.06);
	}
	.step-no {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 999px;
		font-size: 0.74rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		background: rgba(212, 175, 55, 0.14);
		border: 1px solid rgba(212, 175, 55, 0.22);
		color: #f5f1e8;
		margin-bottom: 12px;
	}
	.step h3 {
		margin: 0 0 6px;
		font-size: 1rem;
		letter-spacing: -0.015em;
	}
	.step p {
		margin: 0;
		color: rgba(245, 241, 232, 0.72);
		line-height: 1.6;
		font-size: 0.93rem;
	}
	.step p code {
		font-size: 0.82rem;
		background: rgba(245, 241, 232, 0.08);
		padding: 1px 5px;
		border-radius: 6px;
		border: 1px solid rgba(245, 241, 232, 0.08);
	}
	.step-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid rgba(245, 241, 232, 0.06);
	}
	.step-hint {
		font-size: 0.78rem;
		letter-spacing: 0.02em;
		color: rgba(245, 241, 232, 0.62);
	}
	.step-link {
		color: #f5f1e8;
		text-decoration: none;
		font-weight: 650;
		font-size: 0.85rem;
		white-space: nowrap;
	}
	.step-link:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.step-soon {
		font-size: 0.78rem;
		color: rgba(245, 241, 232, 0.5);
		border: 1px solid rgba(245, 241, 232, 0.1);
		padding: 2px 8px;
		border-radius: 999px;
	}

	/* Rail */
	.rail {
		margin-top: 16px;
		background: #0f0f0f;
		border-top: 1px solid rgba(212, 175, 55, 0.14);
		border-bottom: 1px solid rgba(212, 175, 55, 0.08);
	}
	.rail-inner {
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: 28px;
		align-items: center;
		padding: 36px 0;
	}
	@media (max-width: 880px) {
		.rail-inner {
			grid-template-columns: 1fr;
		}
	}
	.rail-copy h2 {
		margin: 0;
		font-size: clamp(1.6rem, 3vw, 2.2rem);
		line-height: 0.98;
		letter-spacing: -0.03em;
		font-weight: 800;
	}
	.rail-copy p {
		margin: 12px 0 0;
		color: rgba(245, 241, 232, 0.72);
		line-height: 1.6;
		max-width: 52ch;
	}
	.rail-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		margin-top: 18px;
	}
	.btn-wood {
		background: #3c2415;
		color: #f5f1e8;
		border-color: rgba(212, 175, 55, 0.22);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.08) inset,
			0 10px 20px rgba(0, 0, 0, 0.35);
	}
	.btn-wood:hover {
		background: #4a2d1a;
	}
	.rail-note {
		font-size: 0.82rem;
		color: rgba(245, 241, 232, 0.62);
	}
	.rail-visual {
		position: relative;
		aspect-ratio: 1.45;
		border-radius: 18px;
		overflow: clip;
		background: #0e1a14;
		border: 1px solid rgba(245, 241, 232, 0.08);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.04) inset,
			0 16px 32px rgba(0, 0, 0, 0.45);
		padding: 14px;
	}
	.rail-felt {
		position: absolute;
		inset: 14px;
		border-radius: 12px;
		background:
			radial-gradient(500px 320px at 30% 30%, #1b7a4b 0%, #0e3d2d 62%, #0a2a1f 100%);
		border: 10px solid #3c2415;
		box-shadow:
			inset 0 0 0 1px rgba(212, 175, 55, 0.22),
			inset 0 0 18px rgba(0, 0, 0, 0.35);
		overflow: clip;
	}
	.rail-ball {
		position: absolute;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		border: 1.5px solid #fff;
		display: grid;
		place-items: center;
		font-size: 9px;
		font-weight: 800;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
	}
	.rail-ball.ball-1 {
		left: 22%;
		top: 38%;
		background: #f5d547;
		color: #1a1a1a;
	}
	.rail-ball.ball-9 {
		left: 48%;
		top: 36%;
		background: #fff;
		color: #111;
		border-color: #d4af37;
	}
	.rail-ball.ball-8 {
		left: 62%;
		top: 42%;
		background: #0b0b0b;
		color: #fff;
	}
	.rail-cue {
		position: absolute;
		left: 8%;
		right: 18%;
		top: 52%;
		height: 4px;
		border-radius: 999px;
		background: linear-gradient(90deg, #8b6f47 0%, #d4af37 52%, #f5f1e8 100%);
		transform: rotate(-12deg);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
		opacity: 0.92;
	}
	.rail-label {
		position: absolute;
		left: 22px;
		bottom: 14px;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(245, 241, 232, 0.62);
		background: rgba(10, 10, 10, 0.58);
		border: 1px solid rgba(245, 241, 232, 0.08);
		padding: 4px 8px;
		border-radius: 999px;
		backdrop-filter: blur(8px);
	}

	/* Info */
	.info {
		padding-top: 32px;
	}
	.info-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}
	@media (max-width: 880px) {
		.info-grid {
			grid-template-columns: 1fr;
		}
	}
	.info-card {
		padding: 18px 16px;
		border-radius: 16px;
		background: #141414;
		border: 1px solid rgba(245, 241, 232, 0.06);
	}
	.info-card h3 {
		margin: 0 0 6px;
		font-size: 0.95rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: rgba(245, 241, 232, 0.92);
	}
	.info-card p {
		margin: 0;
		line-height: 1.6;
		color: rgba(245, 241, 232, 0.82);
	}
	.info-card .muted {
		color: rgba(245, 241, 232, 0.62);
		font-size: 0.9rem;
	}
	.info-card a {
		color: #f5f1e8;
		text-underline-offset: 3px;
	}
	.info-card a:hover {
		color: #2ad27a;
	}

	/* Footer */
	.footer {
		margin-top: 16px;
		border-top: 1px solid rgba(245, 241, 232, 0.06);
		padding: 18px 0 28px;
		background: #0a0a0a;
	}
	.footer-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}
	.footer-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.88rem;
		color: rgba(245, 241, 232, 0.72);
	}
	.footer-copy {
		opacity: 0.72;
	}
	.footer-nav {
		display: flex;
		gap: 14px;
	}
	.footer-nav a {
		color: rgba(245, 241, 232, 0.72);
		text-decoration: none;
		font-size: 0.88rem;
	}
	.footer-nav a:hover {
		color: #f5f1e8;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	/* Reduced motion: replace springs/slides with cross-fade, drop overshoot */
	@media (prefers-reduced-motion: reduce) {
		.btn,
		.card,
		.nav-link {
			transition: opacity 200ms ease !important;
			transform: none !important;
		}
		.hero-orb {
			display: none;
		}
	}
	/* Reduced transparency: frostier/solid */
	@media (prefers-reduced-transparency: reduce) {
		.nav,
		.hero-meta,
		.btn-ghost {
			background: #141414 !important;
			backdrop-filter: none !important;
		}
	}
	/* High contrast */
	@media (prefers-contrast: more) {
		.card,
		.info-card,
		.step {
			border-color: rgba(245, 241, 232, 0.22);
		}
		.btn-ghost {
			border-color: rgba(245, 241, 232, 0.32);
		}
	}
</style>
