<script lang="ts">
	let { data } = $props();
</script>

<h1>Cashier Board</h1>
<p>Welcome {data.user.displayName}. Table status + timers will appear here (Phase 5).</p>
<p><a href="/dashboard">Admin Dashboard</a> (ADMIN only — test RBAC: cashier should get 403)</p>
