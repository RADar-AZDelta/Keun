<script lang="ts">
	//dependencies
	import prettyBytes from 'pretty-bytes';
	import {parse} from 'csv-parse/browser/esm/sync';
	export var selectedFile: File;
	var downloadDebug = false;
	var identifier = "csvParse.csvparse."+new Date().getTime();

	performance.mark(identifier+'.start')
	var fileContents: string;
	selectedFile.text().then((_text) => {
		console.log('File selected, reading...');
		//load file
		recordList = parse(_text, {});
		console.log(`Loaded ${recordList.length} rows...`);
		//debug
		isLoaded = true;
		performance.mark(identifier+'.end')
		performance.measure(identifier, identifier+'.start', identifier+'.end')
		console.log({parseTime: `${performance.getEntriesByName(identifier)[0].duration} ms`, name: performance.getEntriesByName(identifier)[0].name, perf: performance.getEntriesByName(identifier)});
	});
	export var recordList: any[] = [];
	export var isLoaded: boolean = false;
	var loadedRows = 0;
</script>

{#if loadedRows == 0}
	<p>Reading file...</p>
{:else}
	<p>Loaded {loadedRows} rows</p>
{/if}