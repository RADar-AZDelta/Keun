<script lang="ts">
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { createEventDispatcher } from 'svelte'
  import { user } from '$lib/store'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import type { PageEvents, IFileInformation } from '$lib/Types'
  import { logWhenDev } from '$lib/utils'
  import { Providers } from '$lib/enums'
  import DatabaseImpl from '$lib/classes/implementation/DatabaseImpl'

  export let files: IFileInformation[]

  const dispatch = createEventDispatcher<PageEvents>()

  $: firebaseProvider = DatabaseImpl.databaseImplementation === Providers.Firebase
  $: localProvider = DatabaseImpl.databaseImplementation === Providers.Local
  $: userIsUser = $user?.roles?.includes('user')
  $: userIsAdmin = $user?.roles?.includes('admin')

  // A method to send the user to the mappingtool
  async function openMappingTool(fileId: string, domain: string | null): Promise<void> {
    logWhenDev('openMappingTool: Navigating to the mapping tool')
    const cached = await DatabaseImpl.checkFileExistance(fileId)
    if (!cached) return
    let url = `${base}/mapping?id=${fileId}`
    if (domain) url += `&domain=${domain}`
    goto(url)
  }

  async function downloadFiles(e: Event, id: string): Promise<void> {
    await stopPropagation(e)
    if (!id) return
    await DatabaseImpl.downloadFiles(id)
    dispatch('getFiles')
  }

  // Send a request to the parent to delete the files with the corresponding id
  async function deleteFiles(e: Event, id: string): Promise<void> {
    await stopPropagation(e)
    dispatch('processing', { processing: true })
    if (id) await DatabaseImpl.deleteKeunFile(id)
    dispatch('getFiles')
    dispatch('processing', { processing: false })
  }

  async function stopPropagation(e: Event) {
    if (e && e.stopPropagation) e.stopPropagation()
  }
</script>

{#if $user && (localProvider || (firebaseProvider && (userIsUser || userIsAdmin)))}
  {#each files as file}
    <button class="file-card" on:click={() => openMappingTool(file.id, file.domain)}>
      <div class="file-name-container">
        <SvgIcon id="excel" width="40px" height="40px" />
        <p class="file-name">{file?.name}</p>
        <p class="file-domain">Domain: {file.domain ?? 'none'}</p>
      </div>
      {#if (firebaseProvider && userIsAdmin) || localProvider}
        <div>
          <button class="download-file" on:click={e => downloadFiles(e, file.id)}><SvgIcon id="download" /></button>
          <button class="delete-file" on:click={e => deleteFiles(e, file.id)}><SvgIcon id="x" /></button>
        </div>
      {/if}
    </button>
  {/each}
{:else}
  <p class="rights-error">You do not have sufficient rights, contact an admin please.</p>
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

  .file-card:hover,
  .file-card:focus {
    background-color: lightgray;
  }

  .file-name-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .file-name {
    font-size: 1rem;
  }

  .file-domain {
    margin-left: 2rem;
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

  .rights-error {
    text-align: center;
    margin: 0 0 1rem 0;
  }
</style>
