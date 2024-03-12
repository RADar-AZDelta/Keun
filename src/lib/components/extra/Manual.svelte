<script lang="ts">
  import SvelteMarkDown from 'svelte-markdown'
  import SvgIcon from './SvgIcon.svelte'
  import Dialog from './Dialog.svelte'

  export let href: string

  // TODO: update manual

  let dialog: HTMLDialogElement, manualText: string

  async function openDialog(): Promise<void> {
    const fetchResult = await fetch(href)
    manualText = await fetchResult.text()
    dialog.showModal()
  }
</script>

<button class="header-button" on:click={openDialog}><SvgIcon id="info" height="24px" width="24px" /></button>

<Dialog bind:dialog height="80%" width="80%" title="Handleiding">
  <div class="container">
    <SvelteMarkDown source={manualText} />
  </div>
</Dialog>

<style>
  .header-button {
    border: none;
    background-color: transparent;
    cursor: pointer;
  }

  .container {
    padding: 1rem;
  }

  :global(p) {
    margin: 0.5rem 0;
  }
</style>
