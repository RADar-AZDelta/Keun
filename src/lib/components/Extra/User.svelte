<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { localStorageSetter } from '$lib/utils'

  export let settings: Record<string, any>

  let showModal = false,
    backupAuthor: string | undefined,
    userDialog: HTMLDialogElement

  $: {
    if(showModal == true) openDialog()
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

  async function cancelAuthorUpdate() {
    closeDialog()
    settings.author = backupAuthor
  }

  async function saveAuthorUpdate() {
    closeDialog()
    settings = settings
    backupAuthor = settings.author
    localStorageSetter('settings', settings)
  }

  function closeDialog () {
    userDialog.close()
  }

  function openDialog () {
    if (!backupAuthor) backupAuthor = settings?.author
    userDialog.showModal()
  }
</script>

<button on:click={openDialog} data-name="header-button">
  <p>{settings?.author ?? ''}</p>
  <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
</button>

<dialog bind:this={userDialog} data-name="user-dialog">
  {#if settings}
    <button data-name="close-dialog" on:click={closeDialog}><SvgIcon href="icons.svg" id="x" width="16px" height="16px"/></button>
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
