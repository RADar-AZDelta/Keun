<!-- Copyright 2023 RADar-AZDelta -->
<!-- SPDX-License-Identifier: gpl3+ -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte'
  
    export let extensions: string[]
  
    const dispatch = createEventDispatcher()
  
    let showLayer: boolean = false
  
    function onDragEnter(e: DragEvent): void {
      if (!showLayer) showLayer = true
    }
  
    function onDragLeave(e: DragEvent): void {
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
      dispatch('drop', { file })
      showLayer = false
    }
  </script>
  
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="container" on:dragenter={onDragEnter}>
    <slot />
  </div>
  
  {#if showLayer}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="layer" on:dragleave={onDragLeave} on:drop|preventDefault={dropHandler} on:dragover|preventDefault />
  {/if}
  
  <style>
    .container {
      width: 100%;
      height: 100%;
      background-color: var(--color);
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