<script lang="ts">
  import { onMount } from 'svelte'
  import { user } from '$lib/store'
  import { Providers } from '$lib/enums'
  import AuthImpl from '$lib/classes/implementation/AuthImpl'
  import SvgIcon from './SvgIcon.svelte'
  import clickOutside from '$lib/actions/clickOutside'

  let userDialog: HTMLDialogElement
  let author: string | undefined | null = undefined
  let backupAuthor: string | undefined | null = undefined

  function closeDialog(): void {
    if (!$user) return
    userDialog.close()
  }

  function openDialog(): void {
    if (AuthImpl.authImplementation === Providers.Local || !AuthImpl.authImplementation)
      author = backupAuthor = $user.name
    userDialog.showModal()
  }

  async function login(): Promise<void> {
    await AuthImpl.logIn(author ?? undefined)
    backupAuthor = author
    closeDialog()
  }

  const cancelLogIn = closeDialog

  $: {
    if (!$user?.name && userDialog) userDialog.showModal()
    else if ($user?.name) userDialog.close()
  }

  onMount(() => AuthImpl.getAuthor())
</script>

<!-- <button title="Author" aria-label="User button" on:click={openDialog} class="header-button"> -->
<button title="Author" aria-label="User button" on:click={openDialog} class="header-button">
  <p>{$user?.name ?? ''}</p>
  <SvgIcon id="user" />
</button>

<dialog bind:this={userDialog} class="user-dialog">
  <div class="user-container" use:clickOutside on:outClick={closeDialog}>
    <button class="close-dialog" on:click={closeDialog} disabled={!$user ? true : false}>
      <SvgIcon id="x" />
    </button>
    {#if AuthImpl.authImplementation === Providers.Firebase}
      <section class="author">
        <button on:click={login}>Microsoft</button>
      </section>
    {:else}
      <section class="author">
        <h2 class="title">Who is the author?</h2>
        <input id="author" type="text" placeholder="John Wick" bind:value={author} />
        <div class="buttons-container">
          <button class="cancel" on:click={cancelLogIn} disabled={author == undefined ? true : false}> Cancel </button>
          <button class="save" on:click={login} disabled={author == undefined ? true : false}> Save </button>
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
