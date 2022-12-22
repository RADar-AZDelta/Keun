<script lang="ts">	
	//bindings
	export var selectedFile: File;
	var recordList: any[] = [];

	//elements
	import CsvLoadingScreen from './CsvLoadingScreen.svelte';
	import CsvLoadingScreenPapaParse from './CsvLoadingScreenPapaParse.svelte';
	import CsvLoadingScreenCsvParse from './CsvLoadingScreenCsvParse.svelte';

	let isLoaded: boolean = false;

	//debug
	let debugInfo: string[] = [];

	let benchmarkResults: any[] = [];
	let memoryUsage: any = 0;
	setInterval(() => {
		benchmarkResults = performance
			.getEntries()
			.filter((x) => x.entryType == 'mark' && x.name.endsWith('.end'))
			.map((x) => ({
				name: x.name.replace('.end', ''),
				duration: performance.measure(
					x.name.replace('.end', ''),
					x.name.replace('.end', '.start'),
					x.name
				).duration
			}));
	}, 100);

	let loaderTypes = [
		{ name: 'Simple (string, sync)', component: CsvLoadingScreen },
		{ name: 'PapaParse (stream, sync)', component: CsvLoadingScreenPapaParse },
		{ name: 'CSV-Parse (string, sync)', component: CsvLoadingScreenCsvParse }
	];
</script>

<h1>
	Benchmarking...
	<img
		src="https://media.tenor.com/1Txaw86RmuUAAAAj/bunny.gif"
		alt="Bunny almost sleeping used as loading animation"
		style="height: 1em;"
	/>
</h1>
{#each benchmarkResults as result}
	<p>{result.name} took {result.duration} ms</p>
{/each}
{#each loaderTypes as type}
	<h1>{type.name}</h1>
	{#each Array(1) as _}
		<svelte:component this={type.component} {selectedFile} {recordList} />
	{/each}
{/each}
