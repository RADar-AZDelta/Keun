<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { clickOutside } from '$lib/actions/clickOutside'
  import type { CustomOptionsEvents, IFirebaseUser, ISettings } from '$lib/components/Types'
  import { login } from '$lib/useFirebase'
  import { createEventDispatcher } from 'svelte'

  export let settings: ISettings

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let author: string | null | undefined = undefined,
    userDialog: HTMLDialogElement

  // A method to close the dialog
  function closeDialog(): void {
    // Check if the author is filled in and if the dialog was open in first instance
    if (settings.author) if (userDialog.attributes.getNamedItem('open') != null) userDialog.close()
  }

  // A method to open the dialog
  function openDialog(): void {
    if (settings.author) author = settings.author.displayName
    // Check if the dialog is not already open
    if (userDialog) if (userDialog.attributes.getNamedItem('open') == null) userDialog.showModal()
  }

  async function loginGoogle() {
    const user = await login('google')
    let authorObj: IFirebaseUser = {
      id: user.user.uid,
      email: user?.user.email,
      displayName: user?.user.displayName,
    }
    settings.author = authorObj
    dispatch('authorChanged', { author: authorObj })
    closeDialog()
  }

  $: {
    // If the userdialog is closed and there has not been an author set yet, open the dialog
    userDialog
    if (userDialog)
      if (userDialog.attributes.getNamedItem('open') == null)
        if (settings && !settings.author?.displayName) userDialog.showModal()
  }
</script>

<button title="Author" aria-label="User button" on:click={openDialog} data-name="header-button">
  <p>{settings?.author?.displayName ?? ''}</p>
  <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
</button>

<dialog bind:this={userDialog} data-name="user-dialog">
  <div data-name="user-container" use:clickOutside on:outClick={closeDialog}>
    {#if settings}
      <button data-name="close-dialog" on:click={closeDialog} disabled={author == undefined ? true : false}>
        <SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
      </button>
      <section data-name="author">
        <button on:click={loginGoogle}>Google</button>
      </section>
    {/if}
  </div>
</dialog>
