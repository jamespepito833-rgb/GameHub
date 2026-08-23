<script lang="ts">
	let { data } = $props();
</script>

<h1>Admin Dashboard</h1>
<p>Welcome {data.user.displayName} (ADMIN). Reports & audit logs will appear here (Phase 4).</p>
<p><a href="/board">Cashier Board</a></p>
