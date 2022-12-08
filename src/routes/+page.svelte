<script lang="ts">
	//config
	let isDebug = true;
	let isBenchmarking: boolean = true;

	//dependencies
	import prettyBytes from 'pretty-bytes';
	import { browser } from '$app/environment';

	//elements
	var _parser;
	import FileDropZone from '../FileDropZone.svelte';
	import CsvLoadingScreen from '../CsvLoadingScreen.svelte';
	import CsvLoadingScreenPapaParse from '../CsvLoadingScreenPapaParse.svelte';
	import RecordList from '../RecordList.svelte';
	import CsvLoadingScreenCsvParse from '../CsvLoadingScreenCsvParse.svelte';

	export let selectedFile: File;
	export let recordList: any[] = [];

	let isLoaded: boolean = false;

	//debug
	let debugInfo: string[] = [];

	let benchmarkResults: any[] = [];
	let memoryUsage: any = 0;
	if (isBenchmarking)
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
			// ignore error, chrome-only api, does not break compatibility with firefox
			memoryUsage = browser && prettyBytes(performance.memory?.usedJSHeapSize);
			debugInfo = [];
			debugInfo.push(
				`Memory usage: ${memoryUsage}, browser: ${browser}, ${recordList.length} records`
			);
		}, 100);

	let loaderTypes = [
		{ name: 'Simple (string based, sync)', component: CsvLoadingScreen },
		{ name: 'PapaParse (stream, sync)', component: CsvLoadingScreenPapaParse },
		{ name: 'CSV-Parse (string, sync)', component: CsvLoadingScreenCsvParse }
	];
</script>

<h1>Keun</h1>
{#if isDebug}
	{#each debugInfo as info}
		<p>{info}</p>
	{/each}
{/if}
{#if !selectedFile}
	<FileDropZone
		requiredFileExtension=".csv"
		bind:selectedFile
		text="Drag a Usagi-compatible CSV file into this box!"
	/>
{:else if !isLoaded || isBenchmarking}
	<p>Selected file: {selectedFile.name} ({prettyBytes(selectedFile.size)})</p>
	{#if isBenchmarking}
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
				<svelte:component this={type.component} {selectedFile} />
			{/each}
		{/each}
	{:else}
		<CsvLoadingScreenPapaParse {selectedFile} bind:recordList bind:isLoaded />
	{/if}
{:else}
	<div id="row1">
		<RecordList {recordList} />
	</div>
	<div id="row2">
		<p>Row 2</p>
	</div>
	<style>
		#row1 {
			grid-area: row1;
		}
		#row2 {
			grid-area: row2;
		}
		#row1,
		#row2 {
		}
	</style>
{/if}
