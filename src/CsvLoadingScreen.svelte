<script lang="ts">
	//dependencies
	import prettyBytes from 'pretty-bytes';
	var downloadDebug = false;
	var identifier = "csvParse.legacy."+new Date().getTime();

	performance.mark(identifier+'.start')
	var fileContents: string;
	selectedFile.text().then((_text) => {
		console.log('File selected, reading...');
		//load file
		fileContents = _text;
		var rows = fileContents.split('\n');

		//parse file
		var header = rows[0].split(',');
		rows.slice(1).forEach((row, i) => {
			//REPLACE ME SOMEDAY: this assumes no commas in the data
			var cells = row.split(',');
			var obj: any = {};
			header.forEach((col, j) => {
				obj[col] = cells[j];
			});
			recordList.push(obj);
			loadedRows = recordList.length;
		});
		console.log(`Loaded ${recordList.length} rows...`);
		//debug
		isLoaded = true;
		performance.mark(identifier+'.end')
		performance.measure(identifier, identifier+'.start', identifier+'.end')
		console.log({parseTime: `${performance.getEntriesByName(identifier)[0].duration} ms`, name: performance.getEntriesByName(identifier)[0].name, perf: performance.getEntriesByName(identifier)});
		loadedRows = rows.length;

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