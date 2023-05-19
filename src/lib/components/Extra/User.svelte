<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageSetter } from '$lib/utils'
  import { dev } from '$app/environment'

  export let settings: Record<string, any>

  let showModal = false,
    backupAuthor: string | undefined,
    userDialog: HTMLDialogElement

  $: {
    if (showModal == true) openDialog()
  }

  $: {
    settings
    settingsChanged()
  }

  function settingsChanged() {
    if (settings && !settings.author) {
      openDialog()
    }
  }

  // A method to cancel the update of the author
  async function cancelAuthorUpdate() {
    closeDialog()
    settings.author = backupAuthor
  }

  // A method to save the author and close the dialog
  async function saveAuthorUpdate() {
    if (dev) console.log('saveAuthorUpdate: Saving author update')
    closeDialog()
    settings = settings
    backupAuthor = settings.author
    localStorageSetter('settings', settings)
  }

  function closeDialog() {
    if (userDialog.attributes.getNamedItem('open') != null) userDialog.close()
  }

  function openDialog() {
    if (!backupAuthor) backupAuthor = settings?.author
    if (userDialog.attributes.getNamedItem('open') == null) userDialog.showModal()
  }
</script>

<button title="Author" aria-label="User button" on:click={openDialog} data-name="header-button">
  <p>{settings?.author ?? ''}</p>
  <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
</button>

<dialog bind:this={userDialog} data-name="user-dialog">
  {#if settings}
    <button data-name="close-dialog" on:click={closeDialog}
      ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
    >
    <section data-name="author">
      <h2>Who is the author?</h2>
      <input id="author" type="text" placeholder="John Wick" bind:value={settings.author} />
      <div data-name="buttons-container">
        <button data-name="cancel" on:click={cancelAuthorUpdate} disabled={!settings?.author}>Cancel</button>
        <button data-name="save" on:click={saveAuthorUpdate} disabled={!settings?.author}>Save</button>
      </div>
    </section>
  {/if}
</dialog>
