<script lang="ts">
  import { dev } from '$app/environment'
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { createEventDispatcher } from 'svelte'
  import { selectedFileId } from '$lib/store'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import type { IFile, PageEvents } from '$lib/components/Types'

  export let files: IFile[]

  const dispatch = createEventDispatcher<PageEvents>()

  // A method to go to the mapping route without updating the file in IndexedDB for local mapping (the cached version is still in IndexedDB)
  async function mapCachedFile(id: string): Promise<void> {
    if (dev) console.log(`mapCachedFile: Go to the route "/mapping" to map the file: ${id}`)
    $selectedFileId = id
    goto(`${base}/mapping?id=${id}`)
  }

  // Send a request to the parent to download the files with corresponding id
  async function downloadFiles(e: Event, id: string): Promise<void> {
    if (e && e.stopPropagation) e.stopPropagation()
    dispatch('downloadFiles', { id })
  }

  // Send a request to the parent to delete the files with corresponding id
  async function deleteFiles(e: Event, id: string): Promise<void> {
    if (e && e.stopPropagation) e.stopPropagation()
    dispatch('deleteFiles', { id })
  }
</script>

{#each files as file}
  <button class="file-card" on:click={() => mapCachedFile(file.id)}>
    <div class="file-name-container">
      <SvgIcon id="excel" width="40px" height="40px" />
      <p class="file-name">{file.name}</p>
    </div>
    <div>
      <button class="download-file" on:click={e => downloadFiles(e, file.id)}><SvgIcon id="download" /></button>
      <button class="delete-file" on:click={e => deleteFiles(e, file.id)}><SvgIcon id="x" /></button>
    </div>
  </button>
{/each}

<style>
  .file-card {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border: none;
    background-color: inherit;
  }

  .file-name-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .file-name {
    font-size: 1rem;
  }

  .delete-file {
    border: none;
    background-color: inherit;
  }

  .delete-file:hover {
    background-color: #ff7f7f;
  }

  .delete-file:focus {
    outline: none;
    box-shadow: 0 0 0 2px #e67f7f;
    background-color: #ff7f7f;
  }

  .download-file {
    border: none;
    background-color: inherit;
  }

  .download-file:hover {
    background-color: #80c3d8;
  }

  .download-file:focus {
    outline: none;
    box-shadow: 0 0 0 2px #71bbd4;
    background-color: #80c3d8;
  }
</style>
