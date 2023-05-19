<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'

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
</script>

<div data-name="drag-drop" on:click={openFilePicker} on:keypress={openFilePicker}>
  <div data-name="drag-drop-container" on:drop={dropHandler} on:dragover={dragOverHandler}>
    <p>Drag a file here or click here</p>
    <img src="drag.png" alt="Drag & drop file here" />
  </div>
</div>
