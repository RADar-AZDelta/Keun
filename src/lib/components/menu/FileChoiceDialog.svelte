<script lang="ts">
  import { dev } from '$app/environment'
  import SvgIcon from '../extra/SvgIcon.svelte'
  import type { IFileChoiceDialogProps } from '$lib/interfaces/Types'

  let { processing = $bindable(), currentFileId, fileUpload }: IFileChoiceDialogProps = $props()

  let dialog: HTMLDialogElement

  export const showDialog = () => dialog.showModal()
  export const closeDialog = () => dialog.close()

  const mapCachedFile = async () => closeDialog()

  async function uploadFile(): Promise<void> {
    if (dev) console.log(`uploadFile: Upload the file instead of using the cached version.`)
    fileUpload(currentFileId)
    closeDialog()
  }
</script>

<dialog class="location-dialog" bind:this={dialog}>
  <div class="location-container">
    <button onclick={closeDialog} class="close-dialog" disabled={processing}><SvgIcon id="x" /></button>
    <h2 class="dialog-title">Do you want to use this file or the cached version of this file?</h2>
    <div class="button-choices">
      <button onclick={uploadFile}>File</button>
      <button onclick={mapCachedFile}>Cached version</button>
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
