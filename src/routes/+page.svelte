<script lang="ts">
	//config
	let isDebug = true;
	let isBenchmarking: boolean = false;

	//dependencies
	import prettyBytes from 'pretty-bytes';
	import { browser } from '$app/environment';

	//elements
	import FileDropZone from '../FileDropZone.svelte';
	import CsvLoadingScreenPapaParse from '../CsvLoadingScreenPapaParse.svelte';
	import RecordList from '../RecordList.svelte';

	import CsvLoadingBenchmark from '../CsvLoadingBenchmark.svelte';

	export let selectedFile: File;
	export let recordList: any[] = [];

	let isLoaded: boolean = false;

	//debug
	let debugInfo: string[] = [];

	let memoryUsage: any = 0;
	if (isBenchmarking)
		setInterval(() => {
			// ignore error, chrome-only api, does not break compatibility with firefox
			memoryUsage = browser && prettyBytes(performance.memory?.usedJSHeapSize);
			debugInfo = [];
			debugInfo.push(
				`Memory usage: ${memoryUsage}, browser: ${browser}, ${recordList.length} records`
			);
		}, 100);
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
		<CsvLoadingBenchmark {selectedFile} />
	{:else}
		<script>
			console.log('[Flow] Loading csv...');
		</script>
		<CsvLoadingScreenPapaParse {selectedFile} bind:recordList bind:isLoaded />
	{/if}
{:else}
	<script>
		console.log('[Flow] Showing record list...');
	</script>
	<RecordList {recordList} verbose={isDebug} />
{/if}
