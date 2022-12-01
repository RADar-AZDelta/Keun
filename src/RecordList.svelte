<script lang="ts">
	import { PowerTable } from '@muonw/powertable';
	import type { Options } from '@muonw/powertable/package/components/PowerTable.svelte';

	export var recordList: any[] = [];
	var ptOptions: Options = {
		footerFilters: false,
		footerLoadingBar: false,
		headerLoadingBar: false,
		isDataRemote: false	
	}
</script>

<PowerTable
    ptData={recordList}
    on:rowClicked="{(d) => console.log('click', d)}"
    on:rowDblClicked="{(d) => console.log('dblclick', d)}"
	ptOptions={ptOptions}
/>

<style>
	@import '../../node_modules/@muonw/powertable/package/dist/power-table.css';
</style>