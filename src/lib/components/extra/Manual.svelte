<script lang="ts">
  import SvelteMarkDown from 'svelte-markdown'
  import { clickOutside } from '$lib/actions/clickOutside'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'

  let manualDialog: HTMLDialogElement,
    manualText: string = ''

  async function getManual(): Promise<void> {
    if (manualText) return
    const onlineManual = await fetch('https://raw.githubusercontent.com/RADar-AZDelta/Keun/master/README.md')
    manualText = await onlineManual.text()
  }

  // A method to open the dialog if it was closed and where the README from the Github repo is fetched
  async function openDialog(): Promise<void> {
    if (manualDialog.attributes.getNamedItem('open')) return
    await getManual()
    manualDialog.showModal()
  }

  // A method to close the dialog if it was opened
  function closeDialog(): void {
    if (manualDialog.attributes.getNamedItem('open') !== null) manualDialog.close()
  }
</script>

<button title="Manual" on:click={openDialog} class="header-button"><SvgIcon id="info" /></button>

<dialog bind:this={manualDialog} class="manual-dialog">
  <div class="manual-container" use:clickOutside on:outClick={closeDialog}>
    <button on:click={closeDialog} class="close-dialog"><SvgIcon id="x" /> </button>
    <SvelteMarkDown source={manualText} />
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
    width: 40px;
    height: 40px !important;
  }

  .header-button:hover {
    background-color: #d8d8d8;
  }

  .header-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }

  .manual-dialog {
    width: 80%;
    height: 80%;
    border-radius: 10px;
    border: none;
  }

  .manual-container {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
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
</style>
