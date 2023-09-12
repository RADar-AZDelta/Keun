<script lang="ts">
  import { clickOutside } from '$lib/actions/clickOutside'
  import SvgIcon from './SvgIcon.svelte'
  import SvelteMarkDown from 'svelte-markdown'
  import { base } from '$app/paths'

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

<button title="Manual" aria-label="Manual button" on:click={openDialog} data-name="header-button">
  <SvgIcon href="{base}/icons.svg" id="info" width="16px" height="16px" />
</button>

<dialog bind:this={manualDialog} data-name="manual-dialog">
  <div data-name="manual-container" use:clickOutside on:outClick={closeDialog}>
    <button on:click={closeDialog} data-name="close-dialog"
      ><SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
    </button>
    <SvelteMarkDown source={manualText} />
  </div>
</dialog>
