<script lang="ts">
  import { dev } from '$app/environment'
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { createEventDispatcher } from 'svelte'
  import { selectedFileId, user } from '$lib/store'
  import { SvgIcon, Spinner } from '@radar-azdelta/radar-svelte-components'
  import type { PageEvents, IFileInformation } from '$lib/components/Types'

  export let files: IFileInformation[]

  const dispatch = createEventDispatcher<PageEvents>()

  // A method to send the user to the mappingtool
  async function openMappingTool(fileId: string): Promise<void> {
    if (dev) console.log('openMappingTool: Navigating to the mapping tool')
    $selectedFileId = fileId
    goto(`${base}/mapping?impl=firebase&id=${fileId}`)
  }

  // Send a request to the parent to download the files with the corresponding id
  async function downloadFiles(e: Event, id: string): Promise<void> {
    if (e && e.stopPropagation) e.stopPropagation()
    dispatch('downloadFiles', { id })
  }

  // Send a request to the parent to delete the files with the corresponding id
  async function deleteFiles(e: Event, id: string): Promise<void> {
    if (e && e.stopPropagation) e.stopPropagation()
    dispatch('deleteFiles', { id })
  }

  // Send a request to the parent to be able to edit the rights of the file with corresponding id
  async function editRights(e: Event, id: string): Promise<void> {
    if (e && e.stopPropagation) e.stopPropagation()
    dispatch('editRights', { id })
  }
</script>

{#if user}
  {#each files as file}
    <button class="file-card" on:click={() => openMappingTool(file.id)}>
      <div class="file-name-container">
        <SvgIcon id="excel" width="40px" height="40px" />
        <p class="file-name">{file}</p>
      </div>
      {#if $user.roles?.includes('Admin')}
        <div>
          <button class="download-file" on:click={e => downloadFiles(e, file.id)}><SvgIcon id="download" /></button>
          <button class="edit-file" on:click={e => editRights(e, file.id)}><SvgIcon id="edit" /></button>
          <button class="delete-file" on:click={e => deleteFiles(e, file.id)}><SvgIcon id="x" /></button>
        </div>
      {/if}
    </button>
  {/each}
{:else}
  <div class="loader">
    <Spinner />
  </div>
{/if}

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

  .edit-file {
    border: none;
    background-color: inherit;
  }

  .edit-file:hover {
    background-color: #80c3d8;
  }

  .edit-file:focus {
    outline: none;
    box-shadow: 0 0 0 2px #71bbd4;
    background-color: #80c3d8;
  }
</style>
