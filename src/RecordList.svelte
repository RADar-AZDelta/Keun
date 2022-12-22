<script lang="ts">
	export var verbose: boolean = false;
	import { PowerTable } from '@muonw/powertable';
	import type { DataFeed, Options } from '@muonw/powertable/package/components/PowerTable.svelte';
	// import '@muonw/powertable/package/dist/power-table.css'; //file doesnt seem to exist?

	export var recordList: any[] = [];
	var ptOptions: Options = {
		footerFilters: false,
		footerLoadingBar: false,
		headerLoadingBar: false,
		footerText: false,
		verbose: true,

		isDataRemote: true,
		userFunctions: {
			dataFeed: async (data: any): Promise<DataFeed> => {
				console.log('dataFeed', data);
				const start = (data.options!.currentPage??1 - 1) * data.options!.rowsPerPage!;
				const count = data.options!.rowsPerPage!;
				console.log(`Request for ${count} rows, starting at ${start}`);
				console.log(JSON.parse(JSON.stringify(data)));
				console.log(data.data);
			
				//data.data = recordList.slice(start, start + count);
				data.options!.totalRows = recordList.length;
				console.log(JSON.parse(JSON.stringify(data)))
				console.log(data.data);
				return data;
			},
		}
	};

	
</script>

<div class="PowerTable">
	<!-- 
		ptData={recordList} -->
	<PowerTable
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
