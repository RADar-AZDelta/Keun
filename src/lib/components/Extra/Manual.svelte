<script lang="ts">
  import { clickOutside } from '$lib/actions/clickOutside'
  import SvgIcon from './SvgIcon.svelte'
  import SvelteMarkDown from 'svelte-markdown'

  let showModal: boolean = false,
    manualDialog: HTMLDialogElement

  let manualText: string = ''

  async function openDialog() {
    if (manualDialog.attributes.getNamedItem('open') == null) manualDialog.showModal()
    if (manualText === '') {
      const onlineManual = await fetch('https://raw.githubusercontent.com/RADar-AZDelta/Keun/master/README.md', {
        method: 'GET',
      })
      manualText = await onlineManual.text()
    }
  }

  function closeDialog() {
    if (manualDialog.attributes.getNamedItem('open') != null) manualDialog.close()
  }
</script>

<button title="Manual" aria-label="Manual button" on:click={openDialog} data-name="header-button">
  <SvgIcon href="icons.svg" id="info" width="16px" height="16px" />
</button>

<dialog bind:this={manualDialog} data-name="manual-dialog">
  <div data-name="manual-container" use:clickOutside on:outClick={closeDialog}>
    <button on:click={closeDialog} data-name="close-dialog"
      ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
    >
    <SvelteMarkDown source={manualText} />
  </div>
</dialog>
