<script lang="ts">
  import { implementation, implementationClass, settings } from '$lib/store'
  import { onMount } from 'svelte'
  import { base } from '$app/paths'
  import SvgIcon from './SvgIcon.svelte'
  import { clickOutside } from '$lib/actions/clickOutside'
  import type { IFunctionalityImpl } from '../Types'

  let userDialog: HTMLDialogElement,
    author: string | undefined | null = undefined,
    backupAuthor: string | undefined | null = undefined

  async function loadImplementation(): Promise<IFunctionalityImpl> {
    return new Promise(async (resolve, reject) => {
      if ($implementationClass) return resolve($implementationClass)
      if ($implementation === 'firebase') {
        await import('$lib/databaseImpl/FirebaseImpl').then(({ default: FirebaseImpl }) => {
          $implementationClass = new FirebaseImpl()
          resolve($implementationClass)
        })
      } else {
        import('$lib/databaseImpl/LocalImpl').then(({ default: LocalImpl }) => {
          $implementationClass = new LocalImpl()
          resolve($implementationClass)
        })
      }
    })
  }

  // A method to close the dialog
  function closeDialog(): void {
    // Check if the author is filled in and if the dialog was open in first instance
    if (!$settings?.author?.uid || !userDialog.attributes.getNamedItem('open')) return
    userDialog.close()
  }

  // A method to open the dialog
  function openDialog(): void {
    // Check if the dialog is not already open
    if (!userDialog || !userDialog.attributes.getNamedItem('open')) return
    if ($implementation === 'none' || !$implementation) {
      if ($settings.author) author = $settings.author.name
      if (!backupAuthor && $settings.author) backupAuthor = $settings.author.name
    }
    userDialog.showModal()
  }

  async function login(): Promise<void> {
    await $implementationClass.logIn(author)
    backupAuthor = author
    closeDialog()
  }

  async function cancelLogIn(): Promise<void> {
    await $implementationClass.cancelLogIn(backupAuthor)
    closeDialog()
  }

  $: {
    // If the userdialog is closed and there has not been an author set yet, open the dialog
    userDialog
    if (userDialog?.attributes.getNamedItem('open') === null && !$settings?.author?.name) userDialog.showModal()
  }

  $: {
    if ($settings?.author?.name && userDialog?.attributes.getNamedItem('open')) userDialog.close()
  }

  onMount(async () => {
    if ($implementationClass) return await $implementationClass.getSavedAuthor()
    await loadImplementation().then(async () => await $implementationClass.getSavedAuthor())
  })
</script>

<button title="Author" aria-label="User button" on:click={openDialog} data-name="header-button">
  <p>{$settings?.author?.name ? $settings?.author?.name : ''}</p>
  <SvgIcon href="{base}/icons.svg" id="user" width="16px" height="16px" />
</button>

<dialog bind:this={userDialog} data-name="user-dialog">
  <div data-name="user-container" use:clickOutside on:outClick={closeDialog}>
    {#if $implementation == 'firebase'}
      <button
        data-name="close-dialog"
        on:click={closeDialog}
        disabled={$settings?.author?.uid == undefined ? true : false}
      >
        <SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
      </button>
      <section data-name="author">
        <button on:click={login}>Google</button>
      </section>
    {:else}
      <button data-name="close-dialog" on:click={closeDialog} disabled={$settings.author == undefined ? true : false}>
        <SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
      </button>
      <section data-name="author">
        <h2>Who is the author?</h2>
        <input id="author" type="text" placeholder="John Wick" bind:value={author} />
        <div data-name="buttons-container">
          <button data-name="cancel" on:click={cancelLogIn} disabled={author == undefined ? true : false}>
            Cancel
          </button>
          <button data-name="save" on:click={login} disabled={author == undefined ? true : false}> Save </button>
        </div>
      </section>
    {/if}
  </div>
</dialog>
