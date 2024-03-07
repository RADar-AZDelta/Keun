<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { PageEvents } from '$lib/Types'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import { logWhenDev } from '@radar-azdelta-int/radar-utils'

  export let processing: boolean, currentFileId: string | undefined

  const dispatch = createEventDispatcher<PageEvents>()
  let dialog: HTMLDialogElement

  export const showDialog = () => dialog.showModal()

  export const closeDialog = () => dialog.close()

  // Go to the mapping page of the current uploaded file
  async function mapCachedFile(): Promise<void> {
    logWhenDev(`mapCachedFile: Keep the file with id: ${currentFileId}`)
    closeDialog()
  }

  // Send a request to the parent to rewrite the current uploaded file with the new file that is inserted
  async function uploadFile(): Promise<void> {
    logWhenDev(`uploadFile: Upload the file instead of using the cached version.`)
    dispatch('fileUpload', { id: currentFileId })
    closeDialog()
  }
</script>

<dialog class="location-dialog" bind:this={dialog}>
  <div class="location-container">
    <button on:click={closeDialog} class="close-dialog" disabled={processing}><SvgIcon id="x" /></button>
    <h2 class="dialog-title">Do you want to use this file or the cached version of this file?</h2>
    <div class="button-choices">
      <button on:click={uploadFile}>File</button>
      <button on:click={mapCachedFile}>Cached version</button>
    </div>
  </div>
</dialog>

<style>
  .location-dialog {
    width: 40%;
    border-radius: 10px;
    border: none;
  }

  .location-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border: none;
    background-color: inherit;
    color: #4f4f4f;
  }

  .dialog-title {
    font-size: 1.5rem;
    text-align: center;
  }

  .button-choices {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
</style>
