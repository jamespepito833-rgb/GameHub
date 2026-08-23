<script lang="ts">
	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let logs = $state(data.logs);
</script>

<h1>Activity Logs</h1>
<p>Append-only, forever. Filter via <code>/api/admin/logs?limit=&action=&actorId=</code></p>

<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:0.85rem;">
	<thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th><th>IP</th></tr></thead>
	<tbody>
		{#each logs as l}
			<tr>
				<td>{l.createdAt}</td>
				<td>{l.action}</td>
				<td>{l.actorRole} {l.actorId?.slice(-4) ?? ''}</td>
				<td>{l.targetCollection}:{l.targetId?.slice(-4) ?? ''}</td>
				<td>{l.ip}</td>
			</tr>
		{/each}
	</tbody>
</table>
