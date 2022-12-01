<script lang="ts">
	export var selectedFile: any;
	export var requiredFileExtension: string;
	export var text: string;

	function dropHandler(ev: DragEvent) {
		console.log('File(s) dropped');

		// Prevent default behavior (Prevent file from being opened)
		ev.preventDefault();

		if (ev.dataTransfer?.items) {
			// Use DataTransferItemList interface to access the file(s)
			if(ev.dataTransfer.items.length > 1) {
				alert("Please only drop one file!");
				return;
			}
			[...ev.dataTransfer.items].forEach((item, i) => {
				// If dropped items aren't files, reject them
				if (item.kind === 'file') {
					const file = item.getAsFile();
					console.log(`… file[${i}].name = ${file?.name}`);
					if(!file?.name.endsWith(requiredFileExtension)) {
						alert(`Dropped file must be a ${requiredFileExtension}!`);
					}
					else {
						selectedFile = file;
					}
				}
			});
		} else {
			// Use DataTransfer interface to access the file(s)
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

<div id="drop_zone" on:drop={dropHandler} on:dragover={dragOverHandler}>
	<p>{text}</p>
</div>

<style>
	#drop_zone {
		border: 5px solid blue;
		width: 200px;
		height: 100px;
	}
</style>
