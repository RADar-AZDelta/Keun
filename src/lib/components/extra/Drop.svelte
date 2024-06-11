<script lang="ts">
  import type { IDropProps } from '$lib/interfaces/Types'

  let { extensions, children, fileDrop }: IDropProps = $props()

  let showLayer: boolean = $state(false)

  function onDragEnter(): void {
    if (!showLayer) showLayer = true
  }

  function onDragLeave(): void {
    if (showLayer) showLayer = false
  }

  // A method for when a file is dropped in the drag and drop area
  async function dropHandler(event: DragEvent): Promise<void> {
    event.preventDefault()
    if (!event.dataTransfer?.items) return
    if (event.dataTransfer.items.length > 1) return alert('Only drop one file')
    const item = event.dataTransfer.items[0]
    if (item.kind !== 'file') return alert('Drop an item of the kind file')
    const file = item.getAsFile()
    if (!file) return console.error('dropHandler: The file could not be processed.')
    const extension = file.name.split('.').pop()
    // Check if the extension is allowed, check the file for missing columns
    if (!extension || !extensions.includes(extension) || !file) return alert('The file is not allowed')
    await fileDrop(file)
    showLayer = false
  }

  const dragOver = async (event: DragEvent) => event.preventDefault()
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="container" ondragenter={onDragEnter}>
  {@render children()}
</div>

{#if showLayer}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="layer" ondragleave={onDragLeave} ondrop={dropHandler} ondragover={dragOver}></div>
{/if}

<style>
  .container {
    width: 100%;
    height: 100%;
    background-color: lightgray;
  }

  .layer {
    background-color: #80808080;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 50;
    opacity: 0.5;
  }
</style>
