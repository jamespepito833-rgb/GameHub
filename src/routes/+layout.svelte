<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data?.user}
	<div style="background:#eef;padding:0.4rem 1rem;font-size:0.85rem;display:flex;justify-content:space-between;">
		<span>Signed in as <strong>{data.user.displayName}</strong> ({data.user.role})</span>
		<span><a href={data.user.role === 'ADMIN' ? '/dashboard' : '/board'}>Go to {data.user.role === 'ADMIN' ? 'Dashboard' : 'Board'}</a> · <a href="/login">Login</a></span>
	</div>
{/if}

{@render children()}
