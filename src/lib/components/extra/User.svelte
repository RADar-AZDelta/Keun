<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import Auth from '$lib/helpers/Auth.svelte'
  import clickOutside from '$lib/actions/clickOutside'
  import { createUser } from '$lib/stores/runes.svelte'

  let userDialog: HTMLDialogElement | undefined = $state(undefined)
  let author = $state<string>('')
  let user = createUser()

  function closeDialog(): void {
    if (!user.value) return
    userDialog?.close()
  }

  function openDialog(): void {
    userDialog?.showModal()
  }

  async function login(): Promise<void> {
    await Auth.logIn(author)
    closeDialog()
  }

  const cancelLogIn = closeDialog

  $effect(() => {
    if (!user.value && userDialog) userDialog.showModal()
    else if (user.value) userDialog?.close()
  })
</script>

<button title="Author" aria-label="User button" onclick={openDialog} class="header-button">
  <p>{user.value ?? ''}</p>
  <SvgIcon id="user" />
</button>

<dialog bind:this={userDialog} class="user-dialog">
  <div class="user-container" use:clickOutside onoutClick={closeDialog}>
    <button class="close-dialog" onclick={closeDialog} disabled={!user.value ? true : false}>
      <SvgIcon id="x" />
    </button>
    <section class="author">
      <h2 class="title">Who is the author?</h2>
      <input id="author" type="text" placeholder="John Wick" bind:value={author} />
      <div class="buttons-container">
        <button class="cancel" onclick={cancelLogIn} disabled={author == undefined ? true : false}> Cancel </button>
        <button class="save" onclick={login} disabled={author == undefined ? true : false}> Save </button>
      </div>
    </section>
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

  .header-button:hover {
    background-color: lightgray;
    cursor: pointer;
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
