<script lang="ts">
	//dependencies
	import prettyBytes from 'pretty-bytes';
	export var selectedFile: File;
	var downloadDebug = false;

	var fileContents: string;
	selectedFile.text().then((_text) => {
		console.log('File selected, reading...');
		//load file
		fileContents = _text;
		var rows = fileContents.split('\n');
		//update ui
		rowCount = rows.length - 1;

		//parse file
		console.log(`Parsing file... (${rowCount} rows)`);
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
			if (recordList.length % 1000 == 0) {
				console.log(`Loaded ${recordList.length} rows...`);
			}
		});
		console.log(`Loaded ${recordList.length} rows...`);
		//debug
		if (downloadDebug) {
			var a = document.createElement('a');
			a.setAttribute('download', 'data_dbg.json');
			a.setAttribute('href', 'data:text/json,' + JSON.stringify(recordList));
			document.body.appendChild(a);
			a.click();
		}
		isLoaded = true;
	});
	var rowCount = 0;
	export var recordList: any[] = [];
	export var isLoaded: boolean = false;
	var loadedRows = 0;
</script>

{#if rowCount == 0}
	<p>Reading file...</p>
{:else}
	<p>Loaded {rowCount} rows</p>
{/if}
