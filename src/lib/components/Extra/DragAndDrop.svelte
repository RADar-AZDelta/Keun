<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import { dev } from '$app/environment'

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  function dropHandler(event: DragEvent) {
    event.preventDefault()

    if (event.dataTransfer?.items) {
      if (event.dataTransfer.items.length > 1) {
        alert('Only drop one file')
      }
      for (let item of event.dataTransfer.items) {
        if (item.kind === 'file') {
          const f = item.getAsFile()
          if (f?.name.toLowerCase().includes('csv') || f?.name.toLowerCase().includes('json')) {
            dispatch('fileUploaded', { file: f })
          }
        }
      }
    }
  }

  function dragOverHandler(event: DragEvent) {
    event.preventDefault()
  }

  async function openFilePicker() {
    const filePickerOptions = {
      types: [
        {
          accept: {
            'text/csv': ['.csv'],
            'application/json': ['.json'],
          },
        },
      ],
      multiple: false,
    }
    const [fileHandle] = await (<any>window).showOpenFilePicker(filePickerOptions)
    const file = await fileHandle.getFile()
    if (file.name.toLowerCase().includes('csv') || file.name.toLowerCase().includes('json'))
      dispatch('fileUploaded', { file })
  }

  // Implement button to upload file because filePicker API is not supported in all browsers
  async function onFileInputChange(e: Event) {
    if (dev) console.log('onFileInputChange: New file uploaded')
    await tick()

    const allowedExtensions = ['csv', 'json']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    // Check the files if the extension is allowed
    for (const f of inputFiles) {
      const extension = f.name.split('.').pop()
      if (extension && allowedExtensions.includes(extension)) {
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
    <label title="Upload" for="file-upload" data-name="file-upload"
      ><SvgIcon href="icons.svg" id="upload" width="16px" height="16px" /></label
    >
    <input id="file-upload" type="file" accept=".csv" on:change={onFileInputChange} />
  </div>
</div>
