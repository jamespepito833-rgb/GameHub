<script lang="ts">
	import { page } from '$app/stores';
	let id = $state('');
	let contact = $state('');
	let reservation: any = $state(null);
	let err = $state('');
	let msg = $state('');

	// get id from URL
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
		if (!confirm('Cancel this reservation?')) return;
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
		msg = 'Cancelled';
		reservation = j.data.reservation;
	}
</script>

<h1>Reservation</h1>

<form onsubmit={(e)=>{e.preventDefault(); load();}} style="display:flex;gap:0.5rem;margin:1rem 0;">
	<input bind:value={id} placeholder="Reservation ID" required style="flex:1;" />
	<input bind:value={contact} placeholder="Contact 09..." required />
	<button type="submit">View</button>
</form>

{#if err}<div style="color:#b00020;background:#fdecea;padding:0.5rem;">{err}</div>{/if}
{#if msg}<div style="color:#0a5;background:#e7f5e7;padding:0.5rem;">{msg}</div>{/if}

{#if reservation}
	<div style="border:1px solid #ddd;padding:1rem;border-radius:8px;max-width:500px;">
		<div><strong>ID:</strong> {reservation._id}</div>
		<div><strong>Table:</strong> {reservation.tableName ?? reservation.tableId}</div>
		<div><strong>Date:</strong> {reservation.date}</div>
		<div><strong>Start:</strong> {new Date(reservation.startTime).toLocaleString()}</div>
		<div><strong>End:</strong> {new Date(reservation.endTime).toLocaleString()}</div>
		<div><strong>Duration:</strong> {reservation.durationMinutes} min</div>
		<div><strong>Name:</strong> {reservation.customerName}</div>
		<div><strong>Contact:</strong> {reservation.customerContact}</div>
		<div><strong>Status:</strong> {reservation.status}</div>
		<div><strong>Rate:</strong> ₱{reservation.pricingSnapshot?.ratePerHour}/hr</div>
		{#if reservation.status === 'CONFIRMED'}
			<button onclick={cancel} style="margin-top:0.5rem;background:#c62828;color:#fff;padding:0.5rem;">Cancel Reservation</button>
		{/if}
	</div>
{/if}

<p><a href="/reserve">New Reservation</a> | <a href="/">Home</a></p>
