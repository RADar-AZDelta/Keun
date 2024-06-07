<script lang="ts">
  import Dialog from './Dialog.svelte'
  import SvgIcon from './SvgIcon.svelte'
  import type { IConfirmProps } from '$lib/interfaces/Types'

  let { dialog = $bindable(), title, approveId, approveProps, approve: approveMethod }: IConfirmProps = $props()

  const cancel = () => dialog?.close()

  async function approve() {
    dialog?.close()
    approveMethod(approveId, approveProps)
  }
</script>

<Dialog bind:dialog height="30%" width="30%" title="Confirm deletion of {title}">
  {#snippet buttonsChildren()}
    <div class="buttons-container">
      <button class="approve" onclick={approve}><SvgIcon id="check" /></button>
      <button class="delete" onclick={cancel}><SvgIcon id="x" /></button>
    </div>
  {/snippet}
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
