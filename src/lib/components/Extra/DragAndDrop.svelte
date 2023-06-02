<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import { dev } from '$app/environment'

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  // A method for when a file is dropped in the drag and drop area
  function dropHandler(event: DragEvent): void {
    if (dev) console.log('dropHandler: A file has been dropped in the drag and drop area')
    event.preventDefault()

    if (event.dataTransfer?.items) {
      if (event.dataTransfer.items.length > 1) {
        alert('Only drop one file')
      }
      for (let item of event.dataTransfer.items) {
        if (item.kind === 'file') {
          const f = item.getAsFile()
          // Check if the file is a csv file
          if (f?.name.toLowerCase().includes('csv')) {
            dispatch('fileUploaded', { file: f })
          }
        }
      }
    }
  }

  // A method for when a file is dragged over the drag and drop area
  function dragOverHandler(event: DragEvent): void {
    event.preventDefault()
  }

  // A method for when the button to upload a file is pressed
  async function onFileInputChange(e: Event): Promise<void> {
    if (dev) console.log('onFileInputChange: New file uploaded')
    await tick()

    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    // Check the files if the extension is allowed
    for (const f of inputFiles) {
      const extension = f.name.split('.').pop()
      if (extension && extension == 'csv') {
        dispatch('fileUploaded', { file: f })
        break
      }
    }
  }
</script>

<div data-name="drag-drop">
  <div data-name="drag-drop-container" on:drop={dropHandler} on:dragover={dragOverHandler}>
    <p>Drag a file here</p>
    <img src="drag.png" alt="Drag & drop file here" />
    <p>Or click here</p>
    <label title="Upload" for="file-upload" data-name="file-upload">
      <SvgIcon href="icons.svg" id="upload" width="16px" height="16px" />
    </label>
    <input id="file-upload" type="file" accept=".csv" on:change={onFileInputChange} />
  </div>
</div>
