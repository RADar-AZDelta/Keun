<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { clickOutside } from '$lib/actions/clickOutside'
  import { logIn, userSessionStore } from '$lib/firebase'

  let userDialog: HTMLDialogElement

  // A method to close the dialog
  function closeDialog(): void {
    // Check if the author is filled in and if the dialog was open in first instance
    if ($userSessionStore) if (userDialog.attributes.getNamedItem('open') != null) userDialog.close()
  }

  // A method to open the dialog
  function openDialog(): void {
    // Check if the dialog is not already open
    if (userDialog) if (userDialog.attributes.getNamedItem('open') == null) userDialog.showModal()
  }

  async function loginGoogle() {
    await logIn('google')
    closeDialog()
  }

  $: {
    // If the userdialog is closed and there has not been an author set yet, open the dialog
    userDialog
    if (userDialog)
      if (userDialog.attributes.getNamedItem('open') == null) if (!$userSessionStore.uid) userDialog.showModal()
  }
</script>

<button title="Author" aria-label="User button" on:click={openDialog} data-name="header-button">
  <p>{$userSessionStore ? $userSessionStore.name : ''}</p>
  <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
</button>

<dialog bind:this={userDialog} data-name="user-dialog">
  <div data-name="user-container" use:clickOutside on:outClick={closeDialog}>
    <button
      data-name="close-dialog"
      on:click={closeDialog}
      disabled={$userSessionStore.uid == undefined ? true : false}
    >
      <SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
    </button>
    <section data-name="author">
      <button on:click={loginGoogle}>Google</button>
    </section>
  </div>
</dialog>
