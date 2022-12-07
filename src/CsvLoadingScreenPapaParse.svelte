<script lang="ts">
	//dependencies
	import prettyBytes from 'pretty-bytes';
	import papa from 'papaparse';
	export var selectedFile: File;
	//random update interval, makes page feel more responsive
	var showProgress = false;
	var minInterval = 5000;
	var maxInterval = 15000;
	var random = Math.floor(Math.random() * (maxInterval - minInterval + 1) + minInterval);
	//download json on end, if implemented
	var downloadDebug = false;

	//read file
	performance.mark('csvParse.papaparse.start');
	var fileContents: string;
	console.log('File selected, reading...');
	var results = papa.parse(selectedFile, {
		header: true,
		complete: function (results: any) {
			console.log('Finished:', results.data);

			performance.mark('csvParse.papaparse.end');
			performance.measure(
				'csvParse.papaparse',
				'csvParse.papaparse.start',
				'csvParse.papaparse.end'
			);
			console.log({
				parseTime: `${performance.getEntriesByName('csvParse.papaparse')[0].duration} ms`,
				perf: performance.getEntriesByName('csvParse.papaparse')
			});
			console.log(results);
			isLoaded = true;
			//recordList = results.data;
		},
		error: function (_error: any) {
			console.log('Error:', _error);
			error = _error;
		},
		//worker: true, //breaks results.data
		step: function (row: any, parser: any) {
			if (showProgress) {
				rowCount++;
				if (rowCount % random == 0) {
					parser.pause();
					displayedRows = rowCount;
					parser.resume();
				}
			}
			recordList.push(row.data);
		}
	});

	var rowCount = 0;
	var displayedRows = 0;
	export var recordList: any[] = [];
	export var isLoaded: boolean = false;
	var error: string = '';
	var loadedRows = 0;
</script>

{#if rowCount == 0}
	<p>Reading file...</p>
{:else if error}
	<p>Error has occurred, please report to developers!</p>
	<p>{error}</p>
{:else}
	<p>Loaded {displayedRows} rows</p>
	{#if isLoaded}
		<p>Done! {performance.getEntriesByName('csvParse.papaparse')[0].duration} ms</p>
	{/if}
{/if}
