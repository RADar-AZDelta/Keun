<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageSetter } from '$lib/utils'
  import { dev } from '$app/environment'
  import { clickOutside } from '$lib/actions/clickOutside'
  import type { ISettings } from '$lib/components/Types'

  export let settings: ISettings

  let author: string | undefined = undefined,
    backupAuthor: string | undefined,
    userDialog: HTMLDialogElement

  // A method to cancel the update of the author
  async function cancelAuthorUpdate(): Promise<void> {
    closeDialog()
    settings.author = backupAuthor == undefined ? '' : backupAuthor
  }

  // A method to save the author and close the dialog
  async function saveAuthorUpdate(): Promise<void> {
    if (dev) console.log('saveAuthorUpdate: Saving author update')
    settings.author = author == undefined ? '' : author
    settings = settings
    backupAuthor = settings.author
    localStorageSetter('settings', settings)
    closeDialog()
  }

  // A method to close the dialog
  function closeDialog(): void {
    // Check if the author is filled in and if the dialog was open in first instance
    if (settings.author) if (userDialog.attributes.getNamedItem('open') != null) userDialog.close()
  }

  // A method to open the dialog
  function openDialog(): void {
    if (settings.author) author = settings.author
    if (!backupAuthor) backupAuthor = settings?.author
    // Check if the dialog is not already open
    if (userDialog) if (userDialog.attributes.getNamedItem('open') == null) userDialog.showModal()
  }

  $: {
    // If the userdialog is closed and there has not been an author set yet, open the dialog
    userDialog
    if (userDialog)
      if (userDialog.attributes.getNamedItem('open') == null) if (settings && !settings.author) userDialog.showModal()
  }
</script>

<button title="Author" aria-label="User button" on:click={openDialog} data-name="header-button">
  <p>{settings?.author ?? ''}</p>
  <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
</button>

<dialog bind:this={userDialog} data-name="user-dialog">
  <div data-name="user-container" use:clickOutside on:outClick={closeDialog}>
    {#if settings}
      <button data-name="close-dialog" on:click={closeDialog} disabled={author == undefined ? true : false}>
        <SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
      </button>
      <section data-name="author">
        <h2>Who is the author?</h2>
        <input id="author" type="text" placeholder="John Wick" bind:value={author} />
        <div data-name="buttons-container">
          <button data-name="cancel" on:click={cancelAuthorUpdate} disabled={author == undefined ? true : false}>
            Cancel
          </button>
          <button data-name="save" on:click={saveAuthorUpdate} disabled={author == undefined ? true : false}>
            Save
          </button>
        </div>
      </section>
    {/if}
  </div>
</dialog>
