<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import Dialog from './Dialog.svelte'
  import SvgIcon from './SvgIcon.svelte'

  export let title: string, dialog: HTMLDialogElement, approveDispatch: string
  export let props: object | undefined = undefined

  const dispatch = createEventDispatcher()

  const cancel = () => dialog.close()

  async function approve() {
    dialog.close()
    dispatch(approveDispatch, props)
  }
</script>

<Dialog bind:dialog height="30%" width="30%" title="Confirm deletion of {title}">
  <div slot="buttons" class="buttons-container">
    <button class="approve" on:click={approve}><SvgIcon id="check" /></button>
    <button class="delete" on:click={cancel}><SvgIcon id="x" /></button>
  </div>
</Dialog>

<style>
  .buttons-container {
    display: flex;
    align-items: center;
  }

  .approve {
    width: 100%;
    background-color: transparent;
    border: 1px solid lightgray;
    border-radius: 5px;
    cursor: pointer;
    padding: 2rem 0;
  }

  .approve:hover {
    color: green;
    background-color: #ddffdd;
  }

  .delete {
    width: 100%;
    background-color: transparent;
    border: 1px solid lightgray;
    border-radius: 5px;
    cursor: pointer;
    padding: 2rem 0;
  }

  .delete:hover {
    color: red;
    background-color: #ffbeab;
  }
</style>
