<script lang="ts">
	let username = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

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
	<title>Login — GameHub</title>
</svelte:head>

<main style="max-width:420px;margin:3rem auto;padding:1.5rem;border:1px solid #ddd;border-radius:8px;">
	<h1 style="margin-top:0;">GameHub Login</h1>
	<p style="color:#555;">Cashier / Admin only. Guests do not need to login.</p>

	<form onsubmit={submit} style="display:grid;gap:1rem;">
		<label>
			<div>Username</div>
			<input
				bind:value={username}
				placeholder="admin"
				autocomplete="username"
				required
				style="width:100%;padding:0.5rem;"
			/>
		</label>
		<label>
			<div>Password</div>
			<input
				type="password"
				bind:value={password}
				placeholder="••••••••"
				autocomplete="current-password"
				required
				style="width:100%;padding:0.5rem;"
			/>
		</label>

		{#if error}
			<div style="color:#b00020;background:#fdecea;padding:0.5rem;border-radius:4px;">{error}</div>
		{/if}

		<button type="submit" disabled={loading} style="padding:0.6rem;font-weight:600;">
			{#if loading}Signing in…{:else}Sign in{/if}
		</button>
	</form>

	<p style="margin-top:1rem;font-size:0.9rem;color:#555;">
		Seeded: <code>admin / Admin123!</code> and <code>cashier1 / Cashier123!</code><br />
		<a href="/">← Back to landing</a>
	</p>
</main>
