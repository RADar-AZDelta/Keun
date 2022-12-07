<script lang="ts">
	import { PowerTable } from '@muonw/powertable';
	import type { Options } from '@muonw/powertable/package/components/PowerTable.svelte';
	// import '@muonw/powertable/package/dist/power-table.css'; //file doesnt seem to exist?

	export var recordList: any[] = [];
	var ptOptions: Options = {
		footerFilters: false,
		footerLoadingBar: false,
		headerLoadingBar: false,
		footerText: false,
		isDataRemote: false
	};

	
</script>

<div class="PowerTable">
	<PowerTable
		ptData={recordList}
		on:rowClicked={(d) => console.log('click', d)}
		on:rowDblClicked={(d) => console.log('dblclick', d)}
		{ptOptions}
	/>
</div>

<style global>
	/* powertable */
	div.PowerTable > div > div > div > table > thead > tr > th > button,
	div.PowerTable > div > div > div > table > thead > tr > th > input {
		width: 100%;
	}
</style>
