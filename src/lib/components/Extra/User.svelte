<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { clickOutside } from '$lib/actions/clickOutside'
  import { logIn, userSessionStore } from '$lib/firebase'
  import { implementation, settings } from '$lib/store'
  import { dev } from '$app/environment'
  import { localStorageGetter, localStorageSetter } from '$lib/utils'
  import { onMount } from 'svelte'

  let userDialog: HTMLDialogElement
  let author: string | undefined = undefined,
    backupAuthor: string | undefined = undefined

  async function cancelAuthorUpdate(): Promise<void> {
    closeDialog()
    $settings.author = backupAuthor == undefined ? '' : backupAuthor
  }

  async function saveAuthorUpdate(): Promise<void> {
    if (dev) console.log('saveAuthorUpdate: Saving auhtor update')
    $settings.author = author
    backupAuthor = author
    localStorageSetter('author-Keun', $settings.author)
    closeDialog()
  }

  // A method to close the dialog
  function closeDialog(): void {
    // Check if the author is filled in and if the dialog was open in first instance
    if ($implementation == 'firebase') {
      if ($userSessionStore) if (userDialog.attributes.getNamedItem('open') !== null) userDialog.close()
    } else {
      if ($settings.author) if (userDialog.attributes.getNamedItem('open') !== null) userDialog.close()
    }
  }

  // A method to open the dialog
  function openDialog(): void {
    // Check if the dialog is not already open
    if ($implementation == 'none' || $implementation) {
      if ($settings.author) author = $settings.author
      if (!backupAuthor) backupAuthor = $settings.author
    }
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
      if (userDialog.attributes.getNamedItem('open') == null) {
        if ($implementation == 'firebase') {
          if (!$userSessionStore.uid) userDialog.showModal()
        } else {
          if (!$settings.author) userDialog.showModal()
        }
      }
  }

  $: {
    if ($userSessionStore.uid && userDialog) if (userDialog.attributes.getNamedItem('open')) userDialog.close()
  }

  onMount(() => {
    if ($implementation == 'none' || !$implementation) {
      let tempAuthor = localStorageGetter('author-Keun')
      console.log('TEMP ', tempAuthor)
      if (tempAuthor) $settings.author = tempAuthor
    }
  })
</script>

<button title="Author" aria-label="User button" on:click={openDialog} data-name="header-button">
  {#if $implementation == 'firebase'}
    <p>{$userSessionStore ? $userSessionStore.name : ''}</p>
  {:else}
    <p>{$settings.author ? $settings.author : ''}</p>
  {/if}
  <SvgIcon href="icons.svg" id="user" width="16px" height="16px" />
</button>

<dialog bind:this={userDialog} data-name="user-dialog">
  <div data-name="user-container" use:clickOutside on:outClick={closeDialog}>
    {#if $implementation == 'firebase'}
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
    {:else}
      <button data-name="close-dialog" on:click={closeDialog} disabled={$settings.author == undefined ? true : false}>
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
