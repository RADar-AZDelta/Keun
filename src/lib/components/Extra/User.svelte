<script lang="ts">
  import { onMount } from 'svelte'
  import { base } from '$app/paths'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import { clickOutside } from '$lib/actions/clickOutside'
  import { authImpl, authImplementation, user } from '$lib/store'
  import type { IAuthImpl } from '$lib/components/Types'

  let userDialog: HTMLDialogElement,
    author: string | undefined | null = undefined,
    backupAuthor: string | undefined | null = undefined

  async function loadImplementation(): Promise<IAuthImpl> {
    return new Promise(async (resolve, reject) => {
      if ($authImpl) return resolve($authImpl)
      if (authImplementation === 'firebase') {
        // await import('$lib/authImpl/FirebaseImpl').then(({ default: FirebaseImpl }) => {
        //   $authImpl = new FirebaseImpl()
        //   resolve($authImpl)
        // })
      } else {
        import('$lib/authImpl/LocalImpl').then(({ default: LocalImpl }) => {
          $authImpl = new LocalImpl()
          resolve($authImpl)
        })
      }
    })
  }

  // A method to close the dialog
  function closeDialog(): void {
    // Check if the author is filled in and if the dialog was open in first instance
    if (!$user || !userDialog.attributes.getNamedItem('open')) return
    userDialog.close()
  }

  // A method to open the dialog
  function openDialog(): void {
    // Check if the dialog is not already open
    if (authImplementation === 'none' || !authImplementation) author = backupAuthor = $user.name
    userDialog.showModal()
  }

  async function login(): Promise<void> {
    if (!$authImpl) await loadImplementation()
    await $authImpl!.logIn(author ? author : undefined)
    backupAuthor = author
    closeDialog()
  }

  async function cancelLogIn(): Promise<void> {
    closeDialog()
  }

  // If the userdialog is closed and there has not been an author set yet, open the dialog
  $: {
    if (userDialog?.attributes.getNamedItem('open') === null && !$user) userDialog.showModal()
  }

  $: {
    if ($user && userDialog?.attributes.getNamedItem('open')) userDialog.close()
  }

  onMount(async () => {
    if (!$authImpl) await loadImplementation()
    if ($authImpl) return await $authImpl!.getAuthor()
  })
</script>

<button title="Author" aria-label="User button" on:click={openDialog} data-name="header-button">
  <p>{$user && $user.name ? $user.name : ''}</p>
  <SvgIcon href="{base}/icons.svg" id="user" width="16px" height="16px" />
</button>

<dialog bind:this={userDialog} data-name="user-dialog">
  <div data-name="user-container" use:clickOutside on:outClick={closeDialog}>
    {#if authImplementation == 'firebase'}
      <button data-name="close-dialog" on:click={closeDialog} disabled={!$user ? true : false}>
        <SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
      </button>
      <section data-name="author">
        <button on:click={login}>Google</button>
      </section>
    {:else}
      <button data-name="close-dialog" on:click={closeDialog} disabled={!$user ? true : false}>
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
