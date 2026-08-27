<script lang="ts">
	let username = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);
	let activeField: string | null = $state(null);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		loading = true;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
			const data = await res.json();
			if (!res.ok) {
				error = data?.error?.message ?? data?.error?.code ?? 'Login failed';
				return;
			}
			const role = data.data.user.role as string;
			if (role === 'ADMIN') {
				window.location.href = '/dashboard';
			} else {
				window.location.href = '/board';
			}
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Staff Access — GameHub</title>
	<meta name="description" content="Cashier and Admin access for GameHub billiard hall." />
</svelte:head>

<div class="page">
	<!-- Atmospheric: subtle constellation + felt glow, very restrained -->
	<div class="atmos" aria-hidden="true">
		<svg class="constellation" viewBox="0 0 1440 900" preserveAspectRatio="none">
			<g stroke="rgba(42,210,122,0.08)" stroke-width="1" fill="none">
				<path d="M120 180 L 280 120 L 420 200 L 560 140 L 720 180" />
				<circle cx="120" cy="180" r="2.5" fill="rgba(42,210,122,0.18)" stroke="none" />
				<circle cx="280" cy="120" r="2.5" fill="rgba(42,210,122,0.18)" stroke="none" />
				<circle cx="420" cy="200" r="2.5" fill="rgba(42,210,122,0.18)" stroke="none" />
				<circle cx="560" cy="140" r="2.5" fill="rgba(42,210,122,0.18)" stroke="none" />
				<path d="M 980 120 L 1120 80 L 1280 140" opacity="0.6" />
				<circle cx="980" cy="120" r="2" fill="rgba(212,175,55,0.16)" stroke="none" />
				<path d="M 180 680 L 260 620 L 340 700" opacity="0.5" />
				<path d="M 1080 620 L 1160 680 L 1240 640" opacity="0.5" />
			</g>
		</svg>
		<div class="glow glow-green"></div>
		<div class="glow glow-gold"></div>
	</div>

	<a href="/" class="back" aria-label="Back to landing">
		<span aria-hidden="true">←</span> Back to hall
	</a>

	<main class="shell" aria-label="Staff login">
		<!-- Left: brand / context -->
		<section class="intro" aria-label="GameHub staff">
			<a href="/" class="brand" aria-label="GameHub home">
				<span class="brand-mark" aria-hidden="true"><span class="ball">8</span></span>
				<span class="brand-text">GameHub</span>
				<span class="brand-dot">•</span>
				<span class="brand-sub">Billiard Hall</span>
			</a>

			<div class="intro-copy">
				<p class="kicker">Staff Access</p>
				<h1>Welcome<br />back.</h1>
				<p class="sub">Cashier and Admin only. Guests don’t need an account — reserve directly.</p>

				<div class="meta">
					<div class="meta-item">
						<span class="dot green" aria-hidden="true"></span>
						<span>08:00–02:00 • Live board</span>
					</div>
					<div class="meta-item">
						<span class="dot gold" aria-hidden="true"></span>
						<span>Per-minute • Snapshot pricing</span>
					</div>
				</div>
			</div>

			<div class="felt-card" aria-hidden="true">
				<div class="felt">
					<div class="felt-rail"></div>
					<div class="felt-ball b1">1</div>
					<div class="felt-ball b9">9</div>
					<div class="felt-ball b8">8</div>
					<div class="felt-cue"></div>
				</div>
				<span class="felt-label">Table 5 • 9ft • Simonis 860</span>
			</div>
		</section>

		<!-- Right: login card -->
		<section class="card" aria-label="Sign in">
			<header class="card-head">
				<h2>Sign in</h2>
				<p>Use your staff account. Contact admin if you need access.</p>
			</header>

			<form onsubmit={submit} class="form" novalidate>
				<label class="field" data-active={activeField === 'username'}>
					<span>Username</span>
					<input
						bind:value={username}
						placeholder="admin"
						autocomplete="username"
						required
						aria-required="true"
						onfocus={() => (activeField = 'username')}
						onblur={() => (activeField = null)}
					/>
				</label>

				<label class="field" data-active={activeField === 'password'}>
					<span>Password</span>
					<input
						type="password"
						bind:value={password}
						placeholder="••••••••"
						autocomplete="current-password"
						required
						aria-required="true"
						onfocus={() => (activeField = 'password')}
						onblur={() => (activeField = null)}
					/>
				</label>

				{#if error}
					<div class="alert alert-error" role="alert" aria-live="polite">{error}</div>
				{/if}

				<button type="submit" class="btn btn-primary" disabled={loading} aria-busy={loading}>
					{#if loading}
						<span class="spinner" aria-hidden="true"></span>
						Signing in…
					{:else}
						Sign in
						<span aria-hidden="true" class="btn-arrow">→</span>
					{/if}
				</button>

				<p class="form-foot">Press <kbd>Enter</kbd> to submit • Guests: <a href="/reserve">Reserve →</a></p>
			</form>

			<div class="seed">
				<p class="seed-kicker">Seeded for development</p>
				<div class="seed-grid">
					<div class="seed-item">
						<span class="seed-role">ADMIN</span>
						<code>admin / Admin123!</code>
					</div>
					<div class="seed-item">
						<span class="seed-role">CASHIER</span>
						<code>cashier1 / Cashier123!</code>
					</div>
				</div>
				<p class="seed-note">Change via <code>SEED_ADMIN_*</code> in <code>.env</code>. Never commit real passwords.</p>
			</div>
		</section>
	</main>

	<footer class="foot">
		<span>© 2026 GameHub • Crafted for players</span>
		<span class="foot-dot">•</span>
		<a href="/">Public site</a>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #050507;
		color: #f5f1e8;
		font: 100%/1.5 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}
	.page {
		min-height: 100dvh;
		position: relative;
		isolation: isolate;
		overflow: clip;
		background: #050507;
		display: grid;
		grid-template-rows: auto 1fr auto;
	}
	.atmos {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: -1;
		overflow: clip;
	}
	.constellation {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0.9;
	}
	.glow {
		position: absolute;
		border-radius: 999px;
		filter: blur(42px);
		opacity: 0.18;
	}
	.glow-green {
		width: 720px;
		height: 520px;
		left: -120px;
		top: 18%;
		background: radial-gradient(closest-side, rgba(42, 210, 122, 0.9), transparent 72%);
	}
	.glow-gold {
		width: 560px;
		height: 420px;
		right: -80px;
		top: 6%;
		background: radial-gradient(closest-side, rgba(212, 175, 55, 0.55), transparent 72%);
		opacity: 0.12;
	}
	.back {
		width: min(1120px, calc(100% - 32px));
		margin: 16px auto 0;
		color: rgba(245, 241, 232, 0.72);
		text-decoration: none;
		font-size: 0.88rem;
		letter-spacing: 0.02em;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	@media (min-width: 880px) {
		.back {
			width: min(1120px, calc(100% - 48px));
		}
	}
	.back:hover {
		color: #fff;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.shell {
		width: min(1120px, calc(100% - 32px));
		margin: 18px auto 24px;
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: 28px;
		align-items: start;
	}
	@media (min-width: 880px) {
		.shell {
			width: min(1120px, calc(100% - 48px));
			margin-top: 10px;
		}
	}
	@media (max-width: 880px) {
		.shell {
			grid-template-columns: 1fr;
		}
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: #f5f1e8;
	}
	.brand-mark {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: radial-gradient(120% 120% at 30% 20%, #2a6b4a 0%, #0e3d2d 55%, #0a2a1f 100%);
		border: 1px solid rgba(212, 175, 55, 0.35);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.12) inset,
			0 10px 24px rgba(0, 0, 0, 0.55);
	}
	.ball {
		width: 22px;
		height: 22px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		font-size: 11px;
		font-weight: 800;
		background: #0b0b0b;
		color: #fff;
		border: 1.5px solid #fff;
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
	}
	.brand-text {
		font-weight: 800;
		letter-spacing: -0.02em;
		font-size: 1.1rem;
	}
	.brand-dot {
		opacity: 0.5;
	}
	.brand-sub {
		font-size: 0.78rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		opacity: 0.62;
	}
	.intro {
		padding: 18px 0 0;
		display: grid;
		gap: 18px;
		align-content: start;
	}
	.kicker {
		margin: 0;
		font-size: 0.76rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #2ad27a;
		font-weight: 750;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
	.intro-copy h1 {
		margin: 6px 0 0;
		font-size: clamp(2.2rem, 5vw, 3.6rem);
		line-height: 0.92;
		letter-spacing: -0.04em;
		font-weight: 860;
	}
	.sub {
		margin: 12px 0 0;
		color: rgba(245, 241, 232, 0.72);
		line-height: 1.6;
		max-width: 48ch;
		font-size: 1.02rem;
	}
	.meta {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
		margin-top: 4px;
	}
	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 0.82rem;
		color: rgba(245, 241, 232, 0.62);
		border: 1px solid rgba(245, 241, 232, 0.08);
		padding: 6px 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		display: inline-block;
	}
	.dot.green {
		background: #2ad27a;
		box-shadow: 0 0 0 4px rgba(42, 210, 122, 0.14);
	}
	.dot.gold {
		background: #d4af37;
		box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.14);
	}
	.felt-card {
		margin-top: 6px;
		border-radius: 18px;
		overflow: clip;
		background: #0e1a14;
		border: 1px solid rgba(245, 241, 232, 0.08);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.04) inset,
			0 16px 32px rgba(0, 0, 0, 0.45);
		padding: 14px;
		position: relative;
	}
	.felt {
		position: relative;
		height: 148px;
		border-radius: 12px;
		background: radial-gradient(520px 340px at 30% 30%, #1b7a4b 0%, #0e3d2d 62%, #0a2a1f 100%);
		border: 10px solid #1e2e24;
		box-shadow:
			inset 0 0 0 1px rgba(212, 175, 55, 0.14),
			inset 0 0 18px rgba(0, 0, 0, 0.35);
		overflow: clip;
	}
	.felt-rail {
		position: absolute;
		inset: 0;
		border: 1px solid rgba(212, 175, 55, 0.12);
		border-radius: 6px;
		pointer-events: none;
	}
	.felt-ball {
		position: absolute;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		font-size: 9px;
		font-weight: 800;
		border: 1.5px solid #fff;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
	}
	.b1 {
		left: 22%;
		top: 38%;
		background: #f5d547;
		color: #1a1a1a;
	}
	.b9 {
		left: 48%;
		top: 36%;
		background: #fff;
		color: #111;
		border-color: #d4af37;
	}
	.b8 {
		left: 62%;
		top: 42%;
		background: #0b0b0b;
		color: #fff;
	}
	.felt-cue {
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
	.felt-label {
		position: absolute;
		left: 14px;
		bottom: 14px;
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(245, 241, 232, 0.62);
		background: rgba(10, 10, 10, 0.58);
		border: 1px solid rgba(245, 241, 232, 0.08);
		padding: 4px 8px;
		border-radius: 999px;
		backdrop-filter: blur(8px);
	}

	/* Card */
	.card {
		background: #0f0f0f;
		border: 1px solid rgba(245, 241, 232, 0.08);
		border-radius: 20px;
		padding: 18px;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.04) inset,
			0 20px 40px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(212, 175, 55, 0.08);
		position: relative;
		overflow: clip;
	}
	.card::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.22), transparent);
		opacity: 0.9;
	}
	.card-head h2 {
		margin: 0;
		font-size: 1.35rem;
		letter-spacing: -0.02em;
		line-height: 1.05;
		font-weight: 800;
	}
	.card-head p {
		margin: 6px 0 0;
		color: rgba(245, 241, 232, 0.62);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.form {
		display: grid;
		gap: 12px;
		margin-top: 16px;
	}
	.field {
		display: grid;
		gap: 6px;
	}
	.field span {
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(245, 241, 232, 0.62);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
	.field input {
		background: #050507;
		color: #f5f1e8;
		border: 1px solid rgba(245, 241, 232, 0.1);
		border-radius: 12px;
		padding: 12px 12px;
		font-size: 0.95rem;
		outline: none;
		transition:
			border-color 160ms ease,
			box-shadow 160ms ease,
			background 160ms ease;
	}
	.field input::placeholder {
		color: rgba(245, 241, 232, 0.35);
	}
	.field input:focus {
		border-color: rgba(42, 210, 122, 0.42);
		box-shadow: 0 0 0 4px rgba(42, 210, 122, 0.12);
		background: #080a09;
	}
	.field[data-active='true'] input {
		border-color: rgba(212, 175, 55, 0.28);
	}
	.alert {
		padding: 10px 12px;
		border-radius: 12px;
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.alert-error {
		background: #1e0f10;
		border: 1px solid rgba(255, 70, 70, 0.22);
		color: #ffb4b4;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 13px 16px;
		border-radius: 999px;
		font-weight: 800;
		letter-spacing: 0.01em;
		border: 1px solid transparent;
		cursor: pointer;
		transition:
			transform 100ms ease-out,
			background 160ms ease,
			opacity 160ms ease;
		will-change: transform;
	}
	.btn:active {
		transform: scale(0.97);
	}
	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
	}
	.btn-primary {
		background: #2ad27a;
		color: #05210f;
		border-color: rgba(42, 210, 122, 0.22);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.62) inset,
			0 10px 20px rgba(42, 210, 122, 0.22);
	}
	.btn-primary:hover {
		background: #2ee086;
	}
	.btn-primary:focus-visible {
		outline: 2px solid rgba(42, 210, 122, 0.9);
		outline-offset: 2px;
	}
	.btn-arrow {
		opacity: 0.72;
	}
	.spinner {
		width: 14px;
		height: 14px;
		border-radius: 999px;
		border: 2px solid rgba(5, 33, 15, 0.22);
		border-top-color: #05210f;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
		.btn {
			transition: opacity 200ms ease !important;
			transform: none !important;
		}
	}
	.form-foot {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		font-size: 0.85rem;
		color: rgba(245, 241, 232, 0.52);
	}
	.form-foot a {
		color: #f5f1e8;
		text-underline-offset: 3px;
	}
	.form-foot kbd {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.78rem;
		background: rgba(245, 241, 232, 0.08);
		border: 1px solid rgba(245, 241, 232, 0.1);
		border-bottom-color: rgba(245, 241, 232, 0.16);
		padding: 1px 5px;
		border-radius: 6px;
	}
	.seed {
		margin-top: 16px;
		padding-top: 14px;
		border-top: 1px solid rgba(245, 241, 232, 0.06);
	}
	.seed-kicker {
		margin: 0 0 8px;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(245, 241, 232, 0.42);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
	.seed-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	@media (max-width: 520px) {
		.seed-grid {
			grid-template-columns: 1fr;
		}
	}
	.seed-item {
		background: #050507;
		border: 1px solid rgba(245, 241, 232, 0.06);
		border-radius: 12px;
		padding: 10px 11px;
		display: grid;
		gap: 4px;
	}
	.seed-role {
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(245, 241, 232, 0.42);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
	.seed-item code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.82rem;
		color: #f5f1e8;
		word-break: break-all;
	}
	.seed-note {
		margin: 8px 0 0;
		font-size: 0.78rem;
		color: rgba(245, 241, 232, 0.42);
		line-height: 1.5;
	}
	.seed-note code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		background: rgba(245, 241, 232, 0.06);
		padding: 1px 4px;
		border-radius: 4px;
	}
	.foot {
		width: min(1120px, calc(100% - 32px));
		margin: 0 auto 24px;
		display: flex;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		font-size: 0.82rem;
		color: rgba(245, 241, 232, 0.42);
	}
	@media (min-width: 880px) {
		.foot {
			width: min(1120px, calc(100% - 48px));
		}
	}
	.foot a {
		color: rgba(245, 241, 232, 0.62);
	}
	.foot a:hover {
		color: #f5f1e8;
	}
</style>
