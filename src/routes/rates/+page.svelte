<script lang="ts">
	import { onMount } from 'svelte';
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

<h1>Rates</h1>
{#if err}<div style="color:#b00020;">{err}</div>{/if}
{#if pricing}
	<div style="border:1px solid #ddd;padding:1rem;border-radius:8px;max-width:400px;">
		<div style="font-size:2rem;">₱{pricing.ratePerHour}<small style="font-size:1rem;">/hour</small></div>
		<div>Effective from: {new Date(pricing.effectiveFrom).toLocaleString()}</div>
		<small>Flat hourly, per-minute billing ceil. Historical rate preserved in reservations.</small>
	</div>
{:else if !err}
	<p>Loading…</p>
{/if}
<p><a href="/tables">Check Availability</a> | <a href="/reserve">Reserve</a></p>
