<script lang="ts">
	//dependencies
	import prettyBytes from 'pretty-bytes';
    //elements
	import FileDropZone from "../FileDropZone.svelte";
	import CsvLoadingScreen from '../CsvLoadingScreen.svelte';
	import RecordList from '../RecordList.svelte';

	export let selectedCsv: File;
	export let csvRecords: any[] = [];

	let isLoaded: boolean = false;
</script>

<h1>Keun</h1>
<p></p>

{#if !selectedCsv}
	<FileDropZone requiredFileExtension=".csv" bind:selectedFile={selectedCsv} text="Drag a Usagi-compatible CSV file into this box!" />
{:else if !isLoaded}
	<p>Selected file: {selectedCsv.name} ({prettyBytes(selectedCsv.size)})</p>
	<CsvLoadingScreen selectedFile={selectedCsv} bind:recordList={csvRecords} bind:isLoaded={isLoaded} />
{:else}
	<RecordList recordList={csvRecords} />
{/if}