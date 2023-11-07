<script lang="ts">
  import { dev } from '$app/environment'
  import { createEventDispatcher } from 'svelte'
  import type { PageEvents } from '$lib/components/Types'

  export let extensions: string[], readerMethod: any

  const dispatch = createEventDispatcher<PageEvents>()

  // A method for when a file is dropped in the drag and drop area
  async function dropHandler(event: DragEvent): Promise<void> {
    if (dev) console.log('dropHandler: A file has been dropped in the drag and drop area')
    event.preventDefault()
    const reader = new FileReader()
    reader.onload = readerMethod
    if (!event.dataTransfer?.items) return
    if (event.dataTransfer.items.length > 1) return alert('Only drop one file')
    const item = event.dataTransfer.items[0]
    if (item.kind !== 'file') return alert('Drop an item of the kind file')
    const f = item.getAsFile()
    if (!f) return console.error('dropHandler: The file could not be processed.')
    const extension = f.name.split('.').pop()
    // Check if the extension is allowed, check the file for missing columns
    if (!extension || !extensions.includes(extension) || !f) return alert('The file is not allowed')
    dispatch('fileDrop', { file: f })
    reader.readAsText(f)
  }
</script>

<div class="container" on:drop={dropHandler} on:dragover|preventDefault>
  <slot />
</div>

<style>
  .container {
    width: 100%;
    margin: auto;
    padding: 10rem 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
