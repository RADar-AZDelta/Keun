<script lang="ts">
  import { onMount } from 'svelte'
  import { SvgIcon, clickOutside } from '@radar-azdelta-int/radar-svelte-components'
  import { authImpl, authImplementation, databaseImpl, user } from '$lib/store'
  import { loadImplementationAuth } from '$lib/implementations/implementation'

  let userDialog: HTMLDialogElement
  let author: string | undefined | null = undefined
  let backupAuthor: string | undefined | null = undefined

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

  async function login(provider: string): Promise<void> {
    if (!$authImpl) await loadImplementationAuth()
    // await $authImpl!.logIn(author ? author : undefined)
    await $authImpl?.logIn(provider)
    await $databaseImpl?.saveUserConfig($user)
    backupAuthor = author
    closeDialog()
  }

  async function cancelLogIn(): Promise<void> {
    closeDialog()
  }

  // If the userdialog is closed and there has not been an author set yet, open the dialog
  $: {
    if (!$user?.name && userDialog) userDialog.showModal()
  }

  $: {
    if ($user?.name) userDialog.close()
  }

  onMount(async () => {
    if (!$authImpl) await loadImplementationAuth()
    if ($authImpl) return await $authImpl!.getAuthor()
  })
</script>

<button title="Author" aria-label="User button" on:click={openDialog} class="header-button">
  <p>{$user && $user.name ? $user.name : ''}</p>
  <SvgIcon id="user" />
</button>

<dialog bind:this={userDialog} class="user-dialog">
  <div class="user-container" use:clickOutside on:outClick={closeDialog}>
    <button class="close-dialog" on:click={closeDialog} disabled={!$user ? true : false}>
      <SvgIcon id="x" />
    </button>
    {#if authImplementation == 'firebase'}
      <section class="author">
        <button on:click={() => login('microsoft')}>Microsoft</button>
        <button on:click={() => login('google')}>Google</button>
      </section>
    {:else}
      <section class="author">
        <h2 class="title">Who is the author?</h2>
        <input id="author" type="text" placeholder="John Wick" bind:value={author} />
        <div class="buttons-container">
          <button class="cancel" on:click={cancelLogIn} disabled={author == undefined ? true : false}> Cancel </button>
          <button class="save" on:click={() => login('')} disabled={author == undefined ? true : false}> Save </button>
        </div>
      </section>
    {/if}
  </div>
</dialog>

<style>
  .header-button {
    border: 1px solid #d8d8d8;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f6f6f6;
    height: 40px !important;
  }

  .user-dialog {
    border-radius: 10px;
    border: none;
    width: 400px;
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border: none;
    background-color: inherit;
    color: #4f4f4f;
  }

  .close-dialog:hover {
    color: #bbbbbb;
  }

  .close-dialog:focus {
    outline: none;
    box-shadow: 0 0 0 2px #cecece;
  }

  .author {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1rem;
  }

  .title {
    text-align: center;
    font-size: 24px;
    font-weight: 600;
    padding: 0 2rem;
    margin: 0;
  }

  input {
    width: 80%;
    padding: 0.5rem;
    border: 1px solid #cecece;
    border-radius: 5px;
    font-size: 1rem;
  }

  input:hover {
    border: 1px solid #bbbbbb;
  }

  input:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }

  .buttons-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 85%;
  }

  .cancel,
  .save {
    height: auto;
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .cancel {
    background-color: #e2e2e2;
    color: black;
  }

  .cancel:hover {
    background-color: #d8d8d8;
  }

  .cancel:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }

  .save {
    background-color: #80c3d8;
    color: black;
  }

  .save:hover {
    background-color: #71bbd4;
  }

  .save:focus {
    outline: none;
    box-shadow: 0 0 0 2px #62b4cf;
  }
</style>
