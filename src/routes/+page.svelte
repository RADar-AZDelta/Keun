<script lang="ts">
	function dropHandler(ev: DragEvent) {
		console.log(typeof ev);
		console.log('File(s) dropped');

		// Prevent default behavior (Prevent file from being opened)
		ev.preventDefault();

		if (ev.dataTransfer?.items) {
			// Use DataTransferItemList interface to access the file(s)
			[...ev.dataTransfer.items].forEach((item, i) => {
				// If dropped items aren't files, reject them
				if (item.kind === 'file') {
					const file = item.getAsFile();
					console.log(`… file[${i}].name = ${file?.name}`);
				}
			});
		} else {
			// Use DataTransfer interface to access the file(s)
            ev.dataTransfer?.items.
			[...ev.dataTransfer?.files!].forEach((file, i) => {
				console.log(`… file[${i}].name = ${file.name}`);
			});
		}
	}
	function dragOverHandler(ev: Event) {
		console.log('File(s) in drop zone');

		// Prevent default behavior (Prevent file from being opened)
		ev.preventDefault();
	}
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<div id="drop_zone" on:drop={dropHandler} on:dragover={dragOverHandler}>
	<p>Drag one or more files to this <i>drop zone</i>.</p>
</div>

<style>
	#drop_zone {
		border: 5px solid blue;
		width: 200px;
		height: 100px;
	}
</style>
